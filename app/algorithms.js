"use strict";

// Sahil Gupta

/*
Notes

*/

const crypto = require('crypto');
// todo need an elliptic curve package

const secrets = require('./secrets');
const codes = secrets.codes;

// todo: data structure
// map NODECLASS.NICKNAME (NODE) to NODECLASS
var nicknameMap = {};


// return array of nodes
// todo: sort owners, so can search fast in checkUnspent
function getOwners(addrid) {
	
}


class Vote {
	constructor(publicKey, signature) {
		this.pk = publicKey;
		this.sig = signature;
	}
}


class Addrid {
	constructor(tx, index, value) {
		this.tx = tx;
		this.index = index;					// index(address) in tx output
		this.value = value;
		this.digest = crypto.createHmac('sha256', codes.first)
						.update(tx+index+value)
						.digest('hex');		// hmac hashes key with tx,indx,val
	}

	toString() {
		return this.tx + this.index + this.value;
	}
}


class Tx {
	constructor(inputs, outputs, value) {
		this.inputs = inputs;	// array of addrids
		this.outputs = outputs;	// array of addrids
		this.value = value;
	}

	// get value() { return this.value; }
	// set value(x) { this.value = x; }
}

// NODECLASS is the class doing tx verification == the actual bank
// NODE is what the public sees == NODECLASS.NICKNAME == bank stock symbol
class NodeClass {
	constructor(nickname, utxo, pset, txset) {
		this.nickname = nickname;	// what users calls the 'node'
									// must be unique among nodeClasses
		this.pk = crypto.createHmac('sha256', codes.second)
						.update(nickname)
						.digest('hex');		// public key
											// todo can't just make pk, need sk
		this.utxo = utxo;			// object of unspent tx outputs
									// key is ADDRID.DIGEST, value is null
									// but value is [address, value] if spent
		this.pset = pset;			// for catching double spends
		this.txset = txset;			// for sealing txs
	}

	// algorithm v.2
	// input ADDRID, transaction TX
	// return promise of node's vote
	checkUnspent(addrid, tx) {
		var digest = addrid.digest;

		return new Promise((resolve, reject) => {
			if (!this.checkTx(tx)||!getOwners(addrid).includes(this.nickname)){
				resolve(null);
			} else if (this.utxo[digest] || this.pset[digest] == tx) {
				this.utxo[digest] = null;	// idempotent action
				this.pset[digest] = tx;		// idempotent action
				// todo resolve(new Vote(pk, sig));
			} else {
				resolve(null);
			}
		});
	}

	// todo
	checkTx(tx) {
		// total input val >= total output value
		// input addrids point to valid txs
		// sigs authorizing prev tx outputs are valid
	}

	// todo
	// algorithm v.3
	// input transaction TX, period J, BUNDLE
	// return promise of node's vote
	commitTx(tx, j, bundle) {

	}
}


class User {
	// todo refactor this constructor
	constructor(prop1, prop2) {
		this.prop1 = prop1;
		this.prop2 = prop2;
	}

	// helper fxs to find NODECLASS with nickname NODE
	// return promise of NODECLASS's vote
	static checkUnspent(node, addrid, tx) {
		var nodeClass = nicknameMap[node];
		return nodeClass.checkUnspent(addrid, tx);
	}
	static commitTx(node, tx, j, bundle) {
		var nodeClass = nicknameMap[node];
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
						// console.log('query vote ' + vote);

						// note: paper says exit loop if any vote is a no
						// note: but here we're ok if majority votes are yes
						if (!vote)
							return null;

						if (!bundle[node])				// create key if empty
							bundle[node] = {};
						bundle[node][addrid.digest] = vote;	// add vote
						
						return vote;
					}).catch(err => {
						console.log('query error ' + err);
						return err;
					});
				
				queries.push(query);
			}
		}
		
		// wait for all queries to finish
		// todo: put time limit on how long Promise.all waits
		Promise.all(queries).then(results => {
			// an array of nulls, votes, or errors
			console.log('queries results ' + results);
			
			// phase 2 commit
			var addridSample = tx.outputs[0];
			var nodes = getOwners(addridSample);
			
			var commits = [];			// list of commit promises

			for (var i in nodes) {
				var node = nodes[i];

				var commit = User.commitTx(node, tx, j, bundle)
					.then(vote => {
						// console.log('commit vote ' + vote);
						return vote;	// could be null
					}).catch(err => {
						console.log('commit error ' + err);
						return err;
					});

				commits.push(commit);
			}

			// wait for all commits to finish
			// todo: put time limit on how long Promise.all waits
			Promise.all(commits).then(results => {
				// note: user can save this array to audit node in future
				// an array of nulls, votes, or errors
				console.log('commits results ' + results);
			}).catch(err => {
				console.log('commits error ' + err);
			});

		}).catch(err => {
			console.log('queries error ' + err);
		});
	}
}
