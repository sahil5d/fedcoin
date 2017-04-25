"use strict";

// Sahil Gupta

const fedcoin = require('./fedcoin');

function log(x) { console.log(x); }

// first instantiate nodeclasses
const nodes = ['FFX', 'EEX', 'CCX', 'DDX', 'AAX', 'BBX'];
const nodeclasses = [];
nodes.forEach(n => {
	var nc = new fedcoin.NodeClass(n);
	nodeclasses.push(nc);
	fedcoin.nodeMap[n] = nc;
});
fedcoin.populateShardMap(nodes);

// instantiate users
const names = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'];
const users = [];
names.forEach(n => {
	var u = new fedcoin.User(n, n + '123');
	users.push(u);
});

log(users)
