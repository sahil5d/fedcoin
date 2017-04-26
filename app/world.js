"use strict";

// Sahil Gupta

const fedcoin = require('./fedcoin');

const HUND = 100;

function log(x) { console.log(x); }

function sleep(time) {
	return new Promise((resolve) => setTimeout(resolve, time));
}

function fedFeedCycle(userCycle) {
	sleep(1).then(() => {
		const ag1 = Fed.wallet.getRichAddressGroup(fpass);
		const ag2 = userCycle[0].wallet.getSpareAddressGroup(upass);
		const tx = new fedcoin.Tx([ag1.addrid], [ag2.address], HUND);
		Fed.sendTx(tx, 0, false);
		ag2.addrid = tx.outputs[0];
		userCycle[0].wallet.addRichAddressGroups([ag2], upass);
		Fed.wallet.addUsedAddressGroups([ag1], fpass);

		sleepAndRun(userCycle, 0);
	});
}

function sleepAndRun(userCycle, index) {
	log('####################### ' + index + ' ' + userCycle[index%5].nickname)
	sleep(0).then(() => {
		const ag1 = userCycle[index%5].wallet.getRichAddressGroup(upass);
		const ag2 = userCycle[(index+1)%5].wallet.getSpareAddressGroup(upass);
		const tx = new fedcoin.Tx([ag1.addrid], [ag2.address], HUND);
		userCycle[index%5].sendTx(tx, 0);
		ag2.addrid = tx.outputs[0];
		userCycle[(index+1)%5].wallet.addRichAddressGroups([ag2], upass);
		userCycle[index%5].wallet.addUsedAddressGroups([ag1], upass);

		sleepAndRun(userCycle, index+1)
	});
}


// first instantiate nodeclasses
const nodes = ['FFX', 'EEX', 'CCX', 'DDX', 'AAX', 'BBX'];
const nodeclasses = [];
nodes.forEach(n => {
	var passphrase = n + '123';
	var nc = new fedcoin.NodeClass(n, passphrase);
	nodeclasses.push(nc);
	fedcoin.NODEMAP[n] = nc;
	log('node ' + n + ' initiated')
});
fedcoin.populateShardMap(nodes);

// log(fedcoin.SHARDMAP)


// instantiate central bank
const fpass = 'Fed123';
const Fed = new fedcoin.CentralBank('Fed', fpass);
log('fed reserve initiated')


// instantiate user cycles
const upass = '123';

const namesA = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'];
const usersA = [];
namesA.forEach(n => {
	var u = new fedcoin.User(n, upass);
	usersA.push(u);
	log('user ' + n + ' initiated')
});

const namesB = ['Zeta', 'Eta', 'Theta', 'Iota', 'Kappa'];
const usersB = [];
namesB.forEach(n => {
	var u = new fedcoin.User(n, upass);
	usersB.push(u);
	log('user ' + n + ' initiated')
});

// send money to user cycle
Fed.printMoney(HUND, fpass);
Fed.printMoney(HUND, fpass);
log('fed reserve seeds users')
fedFeedCycle(usersA);
fedFeedCycle(usersB);
