"use strict";

// Sahil Gupta

/*
Notes

BUNDLE is 2d object
	BUNDLE[NODE][ADDRID] = VOTE
VOTE is [pk_node, signature]
ADDRID is [TX, index(address), value]

NODEOFFICE is the class doing tx verification
NODE is what the public sees == NODEOFFICE.NICKNAME

each promise catches its own errors
so won't short-circuit Promise.all
*/

class tx {
	constructor(inputs, outputs, value) {
		this.inputs = inputs;	// array of addrids
		this.outputs = outputs;	// array of addrids
		this.value = value;
	}

	get inputs() { return this.inputs; }
	get outputs() { return this.outputs; }
	get value() { return this.value; }

	// set value(x) { this.value = x; }
}

class nodeOffice {
	constructor(nickname, utxo, pset, txset) {
		this.nickname = nickname;	// what the public sees as 'node'
		this.utxo = utxo;			// unspent tx outputs object
									// key is ADDRID, value is null
									// but value is [address, value] if spent
		this.pset = pset;			// for catching double spends
		this.txset = txset;			// for sealing txs
	}

	get nickname() { return this.nickname; }

	// algorithm v.2
	// input NODE, ADDRID, and transaction TX
	// return node's vote
	// todo: create and return a promise
	static checkUnspent(node, addrid, tx) {
		return new Promise((resolve, reject) => {
			if (!checkTx(tx) || getOwners(addrid).includes(node)) {
				return null;
			} else if (999) { // todo
				return 'todo';
			} else {
				return 'todo';
			}
		});
	}
}


// return array
// todo: sort owners, so can search fast
function getOwners(addrid) {
	
}

// todo
function checkTx(tx) {
	// total input val >= total output value
	// input addrids point to valid txs
	// sigs authorizing prev tx outputs are valid
}


// algorithm v.1
// input transaction TX and period J
// return nothing but log queries and commits
function userValidatesTx(tx, j) {
	// phase 1 query
	var bundle = {};					// bundle of votes
	var queries = [];					// list of query promises
	
	for (var i in tx.inputs) {
		var addrid = tx.inputs[i];
		var nodes = getOwners(addrid);	// return array
		
		for (var ii in nodes) {
			var node = nodes[ii];
			
			// note: error handling inside query
			var query = nodeOffice.checkUnspent(node, addrid, tx)
				.then(vote => {
					// console.log('query vote ' + vote);

					// note: paper says exit loop if any vote is a no
					// note: but here we're ok if majority votes are yes
					if (!vote)
						return null;

					if (!bundle[node])				// create key if empty
						bundle[node] = {};
						
					bundle[node][addrid] = vote;	// add vote to bundle
					
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
		// array of nulls, votes, or errors
		console.log('queries results ' + results);
		
		// phase 2 commit
		var addridSample = tx.outputs[0];
		var nodes = getOwners(addridSample);
		
		var commits = [];			// list of commit promises

		for (var i in nodes) {
			var node = nodes[i];

			var commit = commitTx(tx, j, bundle, node)
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
			// array of nulls, votes, or errors
			// todo: user saves this evidence to potentially audit a node
			console.log('commits results ' + results);
		}).catch(err => {
			console.log('commits error ' + err);
		});

	}).catch(err => {
		console.log('queries error ' + err);
	});
}


// algorithm v.3
// input transaction TX, period J, BUNDLE, NODE
// return node's vote
// todo: create and return a promise
function commitTx(tx, j, bundle, node) {

}
