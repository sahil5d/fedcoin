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

const FEW = 3;
const NSHARDS = 2;		// future change to 3
const BITSRSA = 512;	// future change to 2048
const NODEMAP = {};		// see world.js. key NODE, value NODECLASS
const SHARDMAP = [];	// see world.js. index shard #, value [nodeclasses]

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
		// kludge prepend 0 if hex string has odd length
		if (k === 'coeff' && (sk[k].toString(16).length % 2) !== 0)
			dict[k] = Buffer.from('0'+sk[k].toString(16), 'hex');
		else
			dict[k] = Buffer.from(sk[k].toString(16), 'hex');
	});
	dict.e = 3;  // cryptico enforces exponent of 3
	return dict;
};

// input unique identifying string
// output shard number it falls in
function stringToShard(string) {
	const decimal = parseInt(string.substr(0, 6), 16);
	return decimal % NSHARDS;
}

// input all NODES in the world
// populate SHARDMAP by assigning each node to shard
function populateShardMap(nodes) {
	for (var i = 0; i < NSHARDS; i++)
		SHARDMAP.push([]);
	
	nodes.forEach(n => {
		const shard = stringToShard(hash(n));
		SHARDMAP[shard].push(n);
	});
}

// simulate http request
// this way USER needs no knowledge of the NODECLASS, just NODE
class FakeHttp {
	constructor() {}

	broadcast(node, method, args) {
		const nodeClass = NODEMAP[node];
		return nodeClass[method].apply(this, args);
	}
}

// input NODE for http request to nodeclass
// return promise of nodeclass's vote
function mainQueryTx(node, addrid, tx) {
	const fake = new FakeHttp();
	return fake.broadcast(node, 'queryTx', [addrid, tx]);
}
function mainCommitTx(node, tx, j, bundle, isCentralBank) {
	const fake = new FakeHttp();
	return fake.broadcast(node, 'commitTx', [tx, j, bundle, isCentralBank]);
}

// algorithm v.1
// input transaction TX, period J, isCentralBank
// future replace isCentralBank with a signature of the CB. more secure
// BUNDLE is 2d object, BUNDLE[NODE][ADDRID.DIGEST] = VOTE
// return nothing but log queries and commits
function mainSendTx(tx, j, isCentralBank) {
	// phase 1 query
	const bundle = {};		// bundle of votes
	const queries = [];		// list of all query promises

	function notNullOrErr(vote) {
		return vote !== null && !(vote instanceof Error);
	}

	// when central bank prints money, this loop skipped. no queries made
	for (var i in tx.inputs) {
		const addrid = tx.inputs[i];
		const nodes = SHARDMAP[addrid.shard];

		for (var ii in nodes) {
			const node = nodes[ii];
			// note: each query promise catches its own errors
			// note: so won't break Promise.all (neither will null promise)
			var query = mainQueryTx(node, addrid, tx)
				.then(vote => {
					// log('query vote ' + vote);
					if (!vote)
						return null;
					if (!bundle[node])					// if null, fill it
						bundle[node] = {};
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
	// future add time limit on Promise.all throughout code
	// this still executes when central bank prints money (queries===[])
	Promise.all(queries).then(results => {
		// an array of nulls, votes, or errors
		log('queries results ' + results);

		if (!isCentralBank) {
			// local check that majority of votes are yes
			const yesses = results.filter(notNullOrErr).length;
			if (yesses <= results.length / 2) {
				log('queries rejected');
				return;
			}
		}

		// phase 2 commit
		const addridSample = tx.outputs[0];
		const nodes = SHARDMAP[addridSample.shard];
		const commits = []; // list of all commit promises

		for (var i in nodes) {
			const node = nodes[i];

			var commit = mainCommitTx(node, tx, j, bundle, isCentralBank)
				.then(vote => {
					// log('commit vote ' + vote);
					return vote; // could be null
				}).catch(err => {
					log('commit error ' + err);
					return err;
				});

			commits.push(commit);
		}

		Promise.all(commits).then(results => {
			// RESULTS can be used as audit proof
			// an array of nulls, votes, or errors
			log('commits results ' + results);

			// local check that majority of votes are yes
			const yesses = results.filter(notNullOrErr).length;
			if (yesses <= results.length / 2) {
				log('commits rejected');
				return;
			}
		}).catch(err => {
			log('commits error ' + err);
		});

	}).catch(err => {
		log('queries error ' + err);
	});
}


class Vote {
	constructor(publicKey, signature) {
		this.pk = publicKey;
		this.sig = signature;
	}
}


class Addrid {
	constructor(tx, address, index, value) {
		this.txdigest = tx.digest;
		this.address = address;
		this.index = index; // index(address) in tx output
		this.value = value;
		this.digest = hash(tx.digest + address + index + value);
		this.shard = stringToShard(tx.digest); // function of tx
	}
}


class Tx {
	// note: first arg is addrids, second arg is addresses
	constructor(inAddrids, outAddresses, value) {
		const inAddresses = [];
		if (inAddrids)
			inAddrids.forEach(ai => inAddresses.push(ai.address));

		// digest depends on addresses, not addrids
		this.digest = hash(inAddresses + outAddresses + value);

		const outAddrids = [];
		outAddresses.forEach((a, i) => outAddrids.push(new Addrid(this, a, i, value)));

		this.inputs = inAddrids;
		this.outputs = outAddrids;
		this.value = value;
	}
}


class Wallet {
	constructor(passphrase) {
		this.passphraseSafe = hmac(passphrase, codes.first); // for security
		
		this.addressCount = 0;

		// arrays of {sk: value, pk: value, address: value}
		this.spareAddressGroup = [];	// queue
		this.usedAddressGroup = [];		// list
		this.richAddressGroup = [];		// queue
	}

	// input N addresses to create, PASSPHRASE required
	// create new sks, pks, and addresses
	// return true iff success
	createAddresses(n, passphrase) {
		if (hmac(passphrase, codes.first) !== this.passphraseSafe) {
			log('invalid passphrase');
			return false;
		}

		for (var i = 0; i < n; i++) {
			// deterministic private key
			const seed = hmac(passphrase + this.addressCount, codes.second);
			const skDraft = cryptico.generateRSAKey(seed, BITSRSA);

			const sk = new NodeRSA();
			// note: adds leading zeros to n,p,q,dmp1 during import
			sk.importKey(cryptico.skToHex(skDraft), 'components');
			// log(sk.exportKey('components-private'))

			const privatePem = sk.exportKey('pkcs1-private');
			const publicPem = sk.exportKey('pkcs1-public');
			const publicAddress = publicPemToAddress(publicPem);

			this.spareAddressGroup.push({
				sk: privatePem,
				pk: publicPem,
				address: publicAddress
			});

			this.addressCount += 1;
		}
		return true;
	}

	// if running low on spare addresses, create some
	// return oldest spare {sk, pk, address}
	getNextAddressGroup(passphrase) {
		if (hmac(passphrase, codes.first) !== this.passphraseSafe) {
			log('invalid passphrase');
			return false;
		}

		if (this.spareAddressGroup.length < FEW)
			this.createAddresses(FEW*2, passphrase);

		return this.spareAddressGroup.shift();
	}
}


class User {
	constructor(nickname, passphrase) {
		this.nickname = nickname;
		this.wallet = new Wallet(passphrase);
		this.wallet.createAddresses(FEW, passphrase);
	}

	sendTx(tx, j) {
		return mainSendTx(tx, j, false);
	}
}


// NODECLASS is the class verifying txs, is the commercial bank
// NODECLASS.NICKNAME is what users understand as NODE
class NodeClass {
	constructor(nickname, passphrase) {
		this.nickname = nickname;	// must be unique. bank stock symbol?
		this.utxo = {};				// object of unspent tx outputs
									// key is ADDRID.DIGEST, val true=unspent
		this.pset = {};				// object of txs to catch double spending
									// key is ADDRID.DIGEST, val is tx
		this.txset = [];			// array for sealing txs

		const privateKey = new NodeRSA({b: BITSRSA});
		this.sk = privateKey.exportKey('pkcs1-private');
		this.pk = privateKey.exportKey('pkcs1-public');

		this.shard = stringToShard(hash(nickname));

		this.wallet = new Wallet(passphrase); // to receive fed fees
		this.wallet.createAddresses(FEW, passphrase);
	}

	checkTx(tx) {
		var inVal = 0, outVal;
		tx.inputs.forEach(ai => inVal += ai.value);
		tx.outputs.forEach(ai => outVal += ai.value);
		// todo
		// 1 check input addrids point to valid txs
		// 2 check sigs authorizing prev tx outputs are valid
			// basically that the tx is signed?
			// does this mean we need sigs on every tx?
	}

	// algorithm v.2
	// input ADDRID, transaction TX
	// return promise of node's vote
	// central bank printing never runs here
	queryTx(addrid, tx) {
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
	// input transaction TX, period J, BUNDLE, bool ISCENTRALBANK
	// return promise of node's vote
	commitTx(tx, j, bundle, isCentralBank) {
		return new Promise((resolve, reject) => {
			const addridSample = tx.outputs[0];

			if (!this.checkTx(tx) || this.shard !== addridSample.shard) {
				resolve(null);
			} else {
				var allInputsValid = true;
				// for loop todo
				// use iscentralbank


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

	// future create lowlevel blocks every thousand txs
	// future can calculate txset merkle root by
	// var root = fastRoot(ArrOfHashBuffrs, hashBuffer) // 2nd arg is fx

	// if epochdone(txsetsize == max) and periodopen
		// epoch += 1
		// do stuff like calculate H
		// package lower block
		// put on queue
		// this.lastlowerblockhash = H
		// refresh txset, mset, etc

	// need vars periodopened, periodclosed
	// need to listen to cb broadcasts
	// when periodclosed, don't gen lowlevel blocks
	// but can still do queries/commits
	// begin again with new merkleroot when periodopen
	// note that blocks pushed to cb in queue. do it async
}


class CentralBank {
	constructor(nickname, passphrase) {
		this.nickname = nickname;
		this.txset = [];

		const privateKey = new NodeRSA({b: BITSRSA});
		this.sk = privateKey.exportKey('pkcs1-private');
		this.pk = privateKey.exportKey('pkcs1-public');

		this.wallet = new Wallet(passphrase); // to pay nodes/users
		this.wallet.createAddresses(FEW, passphrase);
	}

	sendTx(tx, j) {
		return mainSendTx(tx, j, true);
	}

	// central bank pays itself
	printMoney(value, passphrase) {
		const addressGroup = this.wallet.getNextAddressGroup(passphrase);
		const tx = new Tx(null, [addressGroup.address], value);
		// future save this tx in highlevel block
		// todo sendTx
		log(tx);

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
module.exports.NODEMAP = NODEMAP;
module.exports.SHARDMAP = SHARDMAP;
module.exports.populateShardMap = populateShardMap;
module.exports.Vote = Vote;
module.exports.Addrid = Addrid;
module.exports.Tx = Tx;
module.exports.Wallet = Wallet;
module.exports.User = User;
module.exports.NodeClass = NodeClass;
module.exports.CentralBank = CentralBank;
