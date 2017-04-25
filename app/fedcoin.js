"use strict";

// Sahil Gupta

/*
Notes
sk is secret private key
pk is public key

todo = to do now
future = to do later
*/

const crypto = require('crypto');
const cryptico = require('cryptico-js');
const NodeRSA = require('node-rsa');
const fastRoot = require('merkle-lib/fastRoot');

const secrets = require('./secrets');
const codes = secrets.codes;

const nShards = 2;		// future change to 3
const bitsRSA = 512;	// future change to 2048
const nodeMap = {};		// see world.js. key NODE, value NODECLASS
const shardMap = [];	// see world.js. index shard #, value [nodeclasses]

function log(x) { console.log(x); }

// input string or Buffer with hex encoding
// return sha256 hash
function hash(data) { return crypto.createHash('sha256').update(data).digest('hex'); }

// return Buffer instead of hex string
function hashBuffer(data) { return crypto.createHash('sha256').update(data).digest(); }

// return ripemd160 hash
function hashAltBuffer(data) { return crypto.createHash('ripemd160').update(data).digest('hex'); }

// input string data and key
// return sha256 hmac
function hmac(data, key) { return crypto.createHmac('sha256', key).update(data).digest('hex'); }

// input string data and private key pem
// return signature
function sign(data, privatePem) {
	const sign = crypto.createSign('RSA-SHA256');
	sign.update(data);
	return sign.sign(privatePem);	
}

// input string data, public key pem, signature
// return true iff success
function verify(data, publicPem, signature) {
	const verify = crypto.createVerify('RSA-SHA256');
	verify.update(data);
	return verify.verify(publicPem, signature);
}

// input public key pem
// return address as hex string
function publicPemToAddress(publicPem) {
	const publicKey = new NodeRSA();
	publicKey.importKey(publicPem, 'pkcs1-public');
	const N = publicKey.exportKey('components-public').n; // hex buffer

	const doublehash = hashAltBuffer(hashBuffer(N));
	const checksum = hash(hashBuffer(doublehash)).substr(0, 8);
	return doublehash + checksum;
}

// input private key from cryptico
// return key object with bigintegers converted to hex buffers
cryptico.skToHex = function(sk) {
    const keys = ['n', 'd', 'p', 'q', 'dmp1', 'dmq1', 'coeff'];
    const dict = {};
    keys.forEach(k => {
        dict[k] = Buffer.from(sk[k].toString(16), 'hex');
    });
    dict.e = 3; // cryptico enforces exponent of 3
    return dict;
};

// input unique identifying string
// output shard number it falls in
function stringToShard(string) {
	const decimal = parseInt(string.substr(0, 6), 16);
	return decimal % nShards;
}

// input all NODES in the world
// populate SHARDMAP by assigning each node to shard
function populateShardMap(nodes) {
	for (var i = 0; i < nShards; i++)
		shardMap.push([]);
	
	nodes.forEach(n => {
		const shard = stringToShard(hash(n));
		shardMap[shard].push(n);
	});
}

// simulate http request
// this way USER needs no knowledge of the NODECLASS, just NODE
class FakeHttp {
	constructor() {}

	broadcast(node, method, args) {
		const nodeClass = nodeMap[node];
		return nodeClass[method].apply(this, args);
	}
}


class Vote {
	constructor(publicKey, signature) {
		this.pk = publicKey;
		this.sig = signature;
	}
}


class Addrid {
	constructor(tx, index, value) {
		this.txdigest = tx.digest;			
		this.index = index;		// index(address) in tx output
		this.value = value;
		this.shard = stringToShard(tx.digest);
		this.digest = hash(tx.digest + index + value);
	}

	toString() {
		return this.txdigest + this.index + this.value;
	}
}


class Tx {
	constructor(inputs, outputs, value) {
		this.inputs = inputs;	// array of addrids
		this.outputs = outputs;	// array of addrids
		this.value = value;
		this.digest = hash(JSON.stringify(inputs+outputs+value));
	}
}


class Wallet {
	constructor(passphrase) {
		this.passphraseSafe = hmac(passphrase, codes.first); // for security
		this.index = 0;		// index of oldest unused address
		this.sks = [];
		this.pks = [];
		this.addresses = [];
	}

	// input N addresses to create, PASSPHRASE required
	// create new sks, pks, and addresses
	// return true iff success
	createAddresses(n, passphrase) {
		if (hmac(passphrase, codes.first) !== this.passphraseSafe)
			return false;

		const iInsert = this.addresses.length;
		for (var i = 0; i < n; i++) {
			// deterministic private key
			const seed = hmac(passphrase + (iInsert + i), codes.second);
			const skSeeded = cryptico.generateRSAKey(seed, bitsRSA);

			const sk = new NodeRSA();
			// note: adds leading zeros to n,p,q,dmp1 during import
			sk.importKey(cryptico.skToHex(skSeeded), 'components');
			// log(sk.exportKey('components-private'))

			const privatePem = sk.exportKey('pkcs1-private');
			const publicPem = sk.exportKey('pkcs1-public');
			const address = publicPemToAddress(publicPem);

			this.sks.push(privatePem);
			this.pks.push(publicPem);
			this.addresses.push(address);
		}
		return true;
	}
}


class User {
	constructor(nickname, passphrase) {
		this.nickname = nickname;
		this.wallet = new Wallet(passphrase);
		this.wallet.createAddresses(3, passphrase); // create some new addrs
	}

	// input NODE for http request to nodeclass
	// return promise of nodeclass's vote
	static checkUnspent(node, addrid, tx) {
		const fake = new FakeHttp();
		return fake.broadcast(node, 'checkUnspent', [addrid, tx]);
	}
	static commitTx(node, tx, j, bundle) {
		const fake = new FakeHttp();
		return fake.broadcast(node, 'commitTx', [tx, j, bundle]);
	}

	// algorithm v.1
	// input transaction TX and period J
	// BUNDLE is 2d object, BUNDLE[NODE][ADDRID.DIGEST] = VOTE
	// return nothing but log queries and commits
	validateTx(tx, j) {
		// phase 1 query
		const bundle = {};						// bundle of votes
		const queries = [];						// list of query promises
		
		for (var i in tx.inputs) {
			const addrid = tx.inputs[i];
			const nodes = shardMap[addrid.shard];
			
			for (var ii in nodes) {
				const node = nodes[ii];
				
				// note: each query promise catches its own errors
				// note: so won't break Promise.all (neither will null promise)
				var query = User.checkUnspent(node, addrid, tx)
					.then(vote => {
						// log('query vote ' + vote);

						// note: paper says exit loop if any vote is a no
						// note: but here we just need majority votes yes
						if (!vote)
							return null;

						if (!bundle[node])
							bundle[node] = {};				// create key
						bundle[node][addrid.digest] = vote;	// add vote
						
						return vote;
					}).catch(err => {
						log('query error ' + err);
						return err;
					});
				
				queries.push(query);
			}
		}
		
		// wait for all queries to finish
		// future: put time limit on how long Promise.all waits
		Promise.all(queries).then(results => {
			// an array of nulls, votes, or errors
			log('queries results ' + results);

			// todo check that majority of queries array isn't null
			
			// phase 2 commit
			const addridSample = tx.outputs[0];
			const nodes = shardMap[addridSample.shard];
			
			const commits = [];			// list of commit promises

			for (var i in nodes) {
				const node = nodes[i];

				var commit = User.commitTx(node, tx, j, bundle)
					.then(vote => {
						// log('commit vote ' + vote);
						return vote;	// could be null
					}).catch(err => {
						log('commit error ' + err);
						return err;
					});

				commits.push(commit);
			}

			// wait for all commits to finish
			// future: put time limit on how long Promise.all waits
			Promise.all(commits).then(results => {
				// note: user can save this array to audit node later
				// an array of nulls, votes, or errors
				log('commits results ' + results);

				// todo check that majority of commits array isn't null

			}).catch(err => {
				log('commits error ' + err);
			});

		}).catch(err => {
			log('queries error ' + err);
		});
	}
}


// NODECLASS is the class verifying txs, is the commercial bank
// NODECLASS.NICKNAME is what users understand as NODE
class NodeClass {
	constructor(nickname) {
		this.nickname = nickname;	// must be unique. bank stock symbol?
		this.utxo = {};				// object of unspent tx outputs
									// key is ADDRID.DIGEST, val true=unspent
		this.pset = {};				// object of txs to catch double spending
									// key is ADDRID.DIGEST, val is tx
		this.txset = [];			// array for sealing txs

		const privateKey = new NodeRSA({b: bitsRSA});
		this.sk = privateKey.exportKey('pkcs1-private');
		this.pk = privateKey.exportKey('pkcs1-public');

		this.shard = stringToShard(hash(nickname));

		// this.wallet = new Wallet(passphrase); // future to receive fed fees
		// this.wallet.createAddresses(3, passphrase);
	}

	// todo
	checkTx(tx) {
		// total input val >= total output value
		// input addrids point to valid txs
		// sigs authorizing prev tx outputs are valid
	}

	// algorithm v.2
	// input ADDRID, transaction TX
	// return promise of node's vote
	checkUnspent(addrid, tx) {
		const digest = addrid.digest;

		return new Promise((resolve, reject) => {
			if (!this.checkTx(tx) || this.shard !== addrid.shard) {
				resolve(null);
			} else if (this.utxo[digest] || this.pset[digest].digest === tx.digest) {
				this.utxo[digest] = null;	// idempotent action
				this.pset[digest] = tx;		// idempotent action
				// todo resolve(new Vote(pk, sig));
			} else {
				resolve(null);
			}
		});
	}

	// todo
	// algorithm v.3
	// input transaction TX, period J, BUNDLE
	// return promise of node's vote
	commitTx(tx, j, bundle) {
		return new Promise((resolve, reject) => {
			const addridSample = tx.outputs[0];

			if (!this.checkTx(tx) || this.shard !== addridSample.shard) {
				resolve(null);
			} else {
				var allInputsValid = true;
				// for loop todo


					var nVotesOwners = null;
					// for loop todo

				if (!allInputsValid)
					resolve(null);
				else {
					for (var i in tx.outputs) {
						const addrid = tx.outputs[i];
						this.utxo[addrid.digest] = true;
					}
					this.txset.push(tx);
					// todo resolve
				}
			}
		});
	}

	// todo create lowlevel blocks every thousand txs
	// todo can calculate txset merkle root by
	// var root = fastRoot(ArrOfHashBuffrs, hashBuffer) // 2nd arg is fx

	// need vars periodopened, periodclosed
	// need to listen to cb broadcasts
	// when periodclosed, don't gen lowlevel blocks
	// but can still do queries/commits
	// begin again with new merkleroot when periodopen
	// note that blocks pushed to cb in queue. do it async
}


// todo
class CentralBank {
	constructor(x) {
		this.x = x;

		const privateKey = new NodeRSA({b: bitsRSA});
		this.sk = privateKey.exportKey('pkcs1-private');
		this.pk = privateKey.exportKey('pkcs1-public');

		// this.wallet = new Wallet(passphrase); // gold deposits?
		// this.wallet.createAddresses(3, passphrase);
	}

	// period should process every minute
	// in future, 1 day

	// every second
		// if period finished
			// notify nodes period ended

		// check queue for lower blocks
		// async: if any, validate them in order
			// check signature
			// regen hash with block data & node's previous lowlevel hash
			// if all good, add lowlevel txset to highlevel txset
			// make sure no duplicates
			// update value of node's previous lowlevel hash

		// if period finished
			// detect double spending
				// count # of each tx received from lowlevel blocks
				// rmv those that didn't get committed by majority of owners
				// in other words, check that each tx was included in lowlevel blocks by majority of nodes mapped to each tx output address
			// finalize txset for the period
			// gen and seal high level block
			// notify nodes new period open. give them merkle root

}


// future remove unnecessary exports
module.exports.nodeMap = nodeMap;
module.exports.shardMap = shardMap;
module.exports.populateShardMap = populateShardMap;
module.exports.Vote = Vote;
module.exports.Addrid = Addrid;
module.exports.Tx = Tx;
module.exports.Wallet = Wallet;
module.exports.User = User;
module.exports.NodeClass = NodeClass;
module.exports.CentralBank = CentralBank;
