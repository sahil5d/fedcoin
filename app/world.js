"use strict";

// Sahil Gupta

const fedcoin = require('./fedcoin');

function log(x) { console.log(x); }

///*
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

// log(fedcoin.SHARDMAP)

// instantiate users
const names = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'];
const users = [];
names.forEach(n => {
	var passphrase = n + '123';
	var u = new fedcoin.User(n, passphrase);
	users.push(u);
});

// log(users)
//*/

const HUNDRED = 100;

var Fed = new fedcoin.CentralBank('Fed', 'Fed123')
Fed.printMoney(HUNDRED, 'Fed123')

const ag1 = Fed.wallet.getRichAddressGroup('Fed123');
const ag2 = users[0].wallet.getSpareAddressGroup('Alpha123');
const tx = new fedcoin.Tx([ag1], [ag2.address], HUNDRED);
Fed.sendTx(tx, 0, false)
// ag2.addrid = tx.outputs[0];
// users[0].wallet.addRichAddressGroups([ag2], 'Alpha123');
// fed.addUsedAddressGroups([ag1]);




// wallet function for spending and receiving

// and puts that money in right node's utxo
// send that money to user through pay function
// fake broadcast
// user then needs function to help it receive money
// that transaction gets validated like any other
// make sure address moves to the richList
