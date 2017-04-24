"use strict";

// Sahil Gupta

/*
Notes
pk is public key
sk is secret private key

todo = to do now
future = to do later
*/

const crypto = require('crypto');
const cryptico = require('cryptico-js');
var NodeRSA = require('node-rsa');

const secrets = require('./secrets');
const codes = secrets.codes;

// todo
// key is NODE aka NODECLASS.PK
// value is NODECLASS
var getNodeClass = {};


function log(x) { console.log(x); }

// input string or Buffer with hex encoding
// return sha256 hash
function hash(data) {
	return crypto.createHash('sha256').update(data).digest('hex');
}

// return Buffer instead of hex string
function hashBuffer(data) {
    return crypto.createHash('sha256').update(data).digest();
}

// return ripemd160 hash
function hashAltBuffer(data) {
    return crypto.createHash('ripemd160').update(data).digest('hex');
}

// input string data and key
// return sha256 hmac
function hmac(data, key) {
	return crypto.createHmac('sha256', key).update(data).digest('hex');	
}

// input public key pem
// return address as hex string
function publicPemToAddress(publicPem) {
	var pk = new NodeRSA();
	pk.importKey(publicPem, 'pkcs1-public');
	var N = pk.exportKey('components-public').n; // hex buffer

	var doublehash = hashAltBuffer(hashBuffer(N));
	var checksum = hash(hashBuffer(doublehash)).substr(0, 8);
	var address = doublehash + checksum;
	return address;
}

// return array of nodes
// todo: sort owners, so can search fast in checkUnspent
function getOwners(addrid) {
	
}

// input private key from cryptico
// return key object with bigintegers converted to hex buffers
cryptico.skToHex = function(sk) {
    var keys = ['n', 'd', 'p', 'q', 'dmp1', 'dmq1', 'coeff'];
    var dict = {};
    keys.forEach(function(k){
        dict[k] = Buffer.from(sk[k].toString(16), 'hex');
    });
    dict.e = 3; // cryptico enforces exponent of 3
    return dict;
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
	// return true if succeeds
	createAddresses(n, passphrase) {
		if (hmac(passphrase, codes.first) !=== this.passphraseSafe)
			return false;

		var iInsert = this.addresses.length;
		for (var i = 0; i < n; i++) {
			// deterministic private key
			var seed = hmac(passphrase + (iInsert + i), codes.second);
			var skSeeded = cryptico.generateRSAKey(seed, 2048);

			var sk = new NodeRSA();
			// note: adds leading zeros to n,p,q,dmp1 during import
			sk.importKey(cryptico.skToHex(skSeeded), 'components');
			// log(sk.exportKey('components-private'))

			var privatePem = sk.exportKey('pkcs1-private');
			var publicPem = sk.exportKey('pkcs1-public');
			var address = publicPemToAddress(publicPem);

			this.sks.push(privatePem);
			this.pks.push(publicPem);
			this.addresses.push(address);
		}
		return true;
	}
}


// NODECLASS is the class doing tx verif, is the commercial bank
// NODE is what users call node's public key PK
class NodeClass {
	constructor(nickname, utxo, pset, txset) {
		this.nickname = nickname;	// could be bank stock symbol
		this.sk = 5;				// todo sk. keep secure
		this.pk = 5; 				// todo
		// this.address = null;		// future for central bank to pay reward
		this.utxo = utxo;			// object of unspent tx outputs
									// key is ADDRID.DIGEST, val true=unspent
		this.pset = pset;			// object of txs to catch double spending
									// key is ADDRID.DIGEST, val is tx
		this.txset = txset;			// array for sealing txs
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
		var digest = addrid.digest;

		return new Promise((resolve, reject) => {
			if (!this.checkTx(tx) || !getOwners(addrid).includes(this.pk)) { // todo refactor to whether this node !HAS the addrid
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
			var addridSample = tx.outputs[0];

			if (!this.checkTx(tx) || !getOwners(addridSample).includes(this.pk)) { // todo refactor to whether this node !HAS the addridsample
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
						var addrid = tx.outputs[i];
						this.utxo[addrid.digest] = true;
					}
					this.txset.push(tx);
					// todo resolve
				}
			}
		});
	}
}


class User {
	constructor(nickname, passphrase) {
		this.nickname = nickname;
		this.wallet = new Wallet(passphrase);

		this.wallet.createAddresses(3, passphrase); // create some new addrs
	}

	// helper fxs to find NODECLASS from NODE
	// return promise of NODECLASS's vote
	static checkUnspent(node, addrid, tx) {
		var nodeClass = getNodeClass[node];	// todo replace with https request
											// shouldn't have access to nodecls
		return nodeClass.checkUnspent(addrid, tx);
	}
	static commitTx(node, tx, j, bundle) {
		var nodeClass = getNodeClass[node];	// todo replace with https request
		return nodeClass.commitTx(tx, j, bundle);
	}

	// algorithm v.1
	// input transaction TX and period J
	// BUNDLE is 2d object, BUNDLE[NODE][ADDRID.DIGEST] = VOTE
	// return nothing but log queries and commits
	validateTx(tx, j) {
		// phase 1 query
		var bundle = {};					// bundle of votes
		var queries = [];					// list of query promises
		
		for (var i in tx.inputs) {
			var addrid = tx.inputs[i];
			var nodes = getOwners(addrid);	// return array
			
			for (var ii in nodes) {
				var node = nodes[ii];
				
				// note: each query promise catches its own errors
				// note: thus won't break Promise.all
				var query = User.checkUnspent(node, addrid, tx)
					.then(vote => {
						// log('query vote ' + vote);

						// note: paper says exit loop if any vote is a no
						// note: but here we're ok if majority votes are yes
						if (!vote)
							return null;

						if (!bundle[node])				// create key if empty
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
		// future: put time limit on how long Promise.all waits
		Promise.all(queries).then(results => {
			// an array of nulls, votes, or errors
			log('queries results ' + results);
			
			// phase 2 commit
			var addridSample = tx.outputs[0];
			var nodes = getOwners(addridSample);
			
			var commits = [];			// list of commit promises

			for (var i in nodes) {
				var node = nodes[i];

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
			}).catch(err => {
				log('commits error ' + err);
			});

		}).catch(err => {
			log('queries error ' + err);
		});
	}
}
