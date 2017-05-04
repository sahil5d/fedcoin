"use strict";

// Sahil Gupta

const fedcoin = require('./fedcoin');

const HUND = 100;

function log(x) { console.log(x); }

function sleep(time) {
	return new Promise((resolve) => setTimeout(resolve, time));
}

function fedFeedCycle(userCycle, nameCycle) {
	sleep(1).then(() => {
		const ag1 = testfed.wallet.getRichAddressGroup(testcentralbank.passphrase);
		const ag2 = userCycle[0].wallet.getSpareAddressGroup(nameCycle[0].passphrase);
		const tx = new fedcoin.Tx([ag1.addrid], [ag2.address], HUND);
		testfed.sendTx(tx, 0, false);
		ag2.addrid = tx.outputs[0];
		userCycle[0].wallet.addRichAddressGroups([ag2], nameCycle[0].passphrase);
		testfed.wallet.addUsedAddressGroups([ag1], testcentralbank.passphrase);

		sleepAndRun(userCycle, nameCycle, 0);
	});
}

function sleepAndRun(userCycle, nameCycle, index) {
	log('####################### ' + index + ' ' + userCycle[index%3].nickname)
	sleep(0).then(() => {
		const ag1 = userCycle[index%3].wallet.getRichAddressGroup(nameCycle[index%3].passphrase);
		const ag2 = userCycle[(index+1)%3].wallet.getSpareAddressGroup(nameCycle[index%3].passphrase);
		const tx = new fedcoin.Tx([ag1.addrid], [ag2.address], HUND);
		userCycle[index%3].sendTx(tx, 0);
		ag2.addrid = tx.outputs[0];
		userCycle[(index+1)%3].wallet.addRichAddressGroups([ag2], nameCycle[index%3].passphrase);
		userCycle[index%3].wallet.addUsedAddressGroups([ag1], nameCycle[index%3].passphrase);

		sleepAndRun(userCycle, nameCycle, index+1)
	});
}


// instantiate nodeclasses
const testnodes = [
	{nickname: 'N1', passphrase: 'b c d e'},
	{nickname: 'N2', passphrase: 'c d e f'},
	{nickname: 'N3', passphrase: 'd e f g'},
	{nickname: 'N4', passphrase: 'e f g h'},
	{nickname: 'N5', passphrase: 'f g h i'}
	];
const testnodeclasses = [];
testnodes.forEach(n => {
	var nc = new fedcoin.NodeClass(n.nickname, n.passphrase);
	testnodeclasses.push(nc);
	fedcoin.NODEMAP[n.nickname] = nc;
	log('node ' + n.nickname + ' initiated')
});
const testnodesnames = testnodes.map(n=>n.nickname);
fedcoin.populateShardMap(testnodesnames);

log('shards ' + JSON.stringify(fedcoin.SHARDMAP))

// instantiate central bank
const testcentralbank = {nickname: 'Fed', passphrase: 'g h i j'};
const testfed = new fedcoin.CentralBank(testcentralbank.nickname,
									testcentralbank.passphrase);
log('fed initiated')

/*
// instantiate user cycle A
const testnamesA = [
	{nickname: 'Alpha', passphrase: 'h i j k'},
	{nickname: 'Beta', passphrase: 'i j k l'},
	{nickname: 'Gamma', passphrase: 'j k l m'}
	];
const testusersA = [];
testnamesA.forEach(n => {
	var u = new fedcoin.User(n.nickname, n.passphrase);
	testusersA.push(u);
	log('user ' + n.nickname + ' initiated')
});

// instantiate user cycle B
const testnamesB = [
	{nickname: 'Delta', passphrase: 'k l m n'},
	{nickname: 'Epsilon', passphrase: 'l m n o'},
	{nickname: 'Zeta', passphrase: 'm n o p'}
	];
const testusersB = [];
testnamesB.forEach(n => {
	var u = new fedcoin.User(n.nickname, n.passphrase);
	testusersB.push(u);
	log('user ' + n.nickname + ' initiated')
});
*/

// the simulation players are
// testnodeclasses, testfed, testusersA, testusersB

// send money to user cycle
testfed.printMoney(HUND, testcentralbank.passphrase);
testfed.printMoney(HUND, testcentralbank.passphrase);

return;
log('fed reserve seeds users')
fedFeedCycle(testusersA, testnamesA);
fedFeedCycle(testusersB, testnamesB);
