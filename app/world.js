"use strict";

// Sahil Gupta

const fedcoin = require('./fedcoin');

function log(x) { console.log(x); }

function sleep(time) {
	return new Promise((resolve) => setTimeout(resolve, time));
}


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

// instantiate user cycles
const upass = '123';

const namesA = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'];
const usersA = [];
namesA.forEach(n => {
	var u = new fedcoin.User(n, upass);
	usersA.push(u);
});

const namesB = ['Zeta', 'Eta', 'Theta', 'Iota', 'Kappa'];
const usersB = [];
namesB.forEach(n => {
	var u = new fedcoin.User(n, upass);
	usersB.push(u);
});

const HUND = 100;

const fpass = 'Fed123';
const Fed = new fedcoin.CentralBank('Fed', fpass);

// send money to user cycle A
Fed.printMoney(HUND, fpass);
sleep(1).then(() => {
	const ag1 = Fed.wallet.getRichAddressGroup(fpass);
	const ag2 = usersA[0].wallet.getSpareAddressGroup(upass);
	const tx = new fedcoin.Tx([ag1.addrid], [ag2.address], HUND);
	Fed.sendTx(tx, 0, false);
	ag2.addrid = tx.outputs[0];
	usersA[0].wallet.addRichAddressGroups([ag2], upass);
	Fed.wallet.addUsedAddressGroups([ag1], fpass);

	sleepAndRun(usersA, 0);
});

// send money to user cycle B
Fed.printMoney(HUND, fpass);
sleep(1).then(() => {
	const ag1 = Fed.wallet.getRichAddressGroup(fpass);
	const ag2 = usersB[0].wallet.getSpareAddressGroup(upass);
	const tx = new fedcoin.Tx([ag1.addrid], [ag2.address], HUND);
	Fed.sendTx(tx, 0, false);
	ag2.addrid = tx.outputs[0];
	usersB[0].wallet.addRichAddressGroups([ag2], upass);
	Fed.wallet.addUsedAddressGroups([ag1], fpass);

	sleepAndRun(usersB, 0);
});



function sleepAndRun(userCycle, index) {
	log(userCycle[index%5].nickname)
	sleep(1).then(() => {
		const ag1 = userCycle[index%5].wallet.getRichAddressGroup(upass);
		const ag2 = userCycle[(index+1)%5].wallet.getSpareAddressGroup(upass);
		const tx = new fedcoin.Tx([ag1.addrid], [ag2.address], HUND);
		userCycle[index%5].sendTx(tx, 0);
		ag2.addrid = tx.outputs[0];
		userCycle[(index+1)%5].wallet.addRichAddressGroups([ag2], upass);
		userCycle[index%5].wallet.addUsedAddressGroups([ag1], upass);

		sleepAndRun(userCycle, index+1)
	})
}


// var nTransactions = 10000;
// for (var i = 0; i < nTransactions; i++) {

// }






// wallet function for spending and receiving

// and puts that money in right node's utxo
// send that money to user through pay function
// fake broadcast
// user then needs function to help it receive money
// that transaction gets validated like any other
// make sure address moves to the richList
