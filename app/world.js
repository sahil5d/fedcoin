"use strict";

// Sahil Gupta

const fedcoin = require('./fedcoin');

function log(x) { console.log(x); }

/*
// first instantiate nodeclasses
const nodes = ['FFX', 'EEX', 'CCX', 'DDX', 'AAX', 'BBX'];
const nodeclasses = [];
nodes.forEach(n => {
	var passphrase = n + '123';
	var nc = new fedcoin.NodeClass(n, passphrase);
	nodeclasses.push(nc);
	fedcoin.NODEMAP[n] = nc;
});
fedcoin.populateShardMap(nodes);

log(fedcoin.SHARDMAP)

// instantiate users
const names = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'];
const users = [];
names.forEach(n => {
	var passphrase = n + '123';
	var u = new fedcoin.User(n, passphrase);
	users.push(u);
});

log(users)
*/

var fed = new fedcoin.CentralBank('fed', 'fed123')
fed.printMoney(555, 'fed123')

// wallet function for spending and receiving

// give it a printmoney function where it pays itself from nothing
// put in highlevel block
// and puts that money in right node's utxo
// send that money to user through pay function
// fake broadcast
// user then needs function to help it receive money
// that transaction gets validated like any other
