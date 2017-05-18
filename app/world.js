'use strict';

// Sahil Gupta

const fedcoin = require('./fedcoin');

const K = 3; // number of users per cycle
const HUND = 100;

function log(x) { console.log(x); }

function fedStartCycle(testfed, testcentralbank, userCycle, nameCycle) {
	const ag1 = testfed.wallet.getRichAG(testcentralbank.passphrase);
	const ag2 = userCycle[0].wallet.getSpareAG(nameCycle[0].passphrase);
	const tx = new fedcoin.Tx([ag1.addrid], [ag2.address], HUND);
	testfed.sendTx(tx)
	.then(success => {
		if (success) {
			ag2.addrid = tx.outputs[0];
			userCycle[0].wallet.addRichAGs([ag2], nameCycle[0].passphrase);
			testfed.wallet.addUsedAGs([ag1], testcentralbank.passphrase);
			log('fed -> user tx succeeded');

			runCycle(userCycle, nameCycle, 0);
		} else {
			log('fed -> user tx failed');
		}
	});
}

function runCycle(userCycle, nameCycle, index) {
	if (index > 101)
		return;

	const u1 = index%K;
	const u2 = (index+1)%K;

	log('########## ' + index + ' ########## ' + userCycle[u1].nickname + ' pays ' + userCycle[u2].nickname + ' 100');

	const ag1 = userCycle[u1].wallet.getRichAG(nameCycle[u1].passphrase);
	const ag2 = userCycle[u2].wallet.getSpareAG(nameCycle[u2].passphrase);
	const tx = new fedcoin.Tx([ag1.addrid], [ag2.address], HUND);

	return userCycle[u1].sendTx(tx)
	.then(success => {
		if (success) {
			ag2.addrid = tx.outputs[0];
			userCycle[u2].wallet.addRichAGs([ag2], nameCycle[u2].passphrase);
			userCycle[u1].wallet.addUsedAGs([ag1], nameCycle[u1].passphrase);
			return runCycle(userCycle, nameCycle, index+1); // tail recursion
		} else {
			log('user->user tx failed');
		}
	});
}


function main() {
	// instantiate central bank
	const testcentralbank = {nickname: 'Fed', passphrase: 'g h i j'};
	const testfed = new fedcoin.CentralBank(testcentralbank.nickname,
											testcentralbank.passphrase);
	log('fed initiated');

	// instantiate nodeclasses
	const testnodeobjects = [
			{nickname: 'N1', passphrase: 'b c d e'},
			{nickname: 'N2', passphrase: 'c d e f'},
			{nickname: 'N3', passphrase: 'd e f g'},
			{nickname: 'N4', passphrase: 'e f g h'},
			{nickname: 'N5', passphrase: 'f g h i'}
		];
	const testnodeclasses = [];
	testnodeobjects.forEach(n => {
		var nc = new fedcoin.NodeClass(n.nickname, n.passphrase);
		testnodeclasses.push(nc);
		log('node ' + n.nickname + ' initiated');
	});

	testfed.startProcessLoop();

	return; // todo

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
		log('user ' + n.nickname + ' initiated');
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
		log('user ' + n.nickname + ' initiated');
	});

	// the simulation players are
	// testnodeclasses, testfed, testusersA, testusersB

	// send money to user cycle
	testfed.printMoney(HUND, testcentralbank.passphrase)
	.then(success => {
		// log('printed money ' + success);
		return testfed.printMoney(HUND, testcentralbank.passphrase);
	})
	.then(success => {
		// log('printed money ' + success);
		log('user cycle begins');
		fedStartCycle(testfed, testcentralbank, testusersA, testnamesA);
		fedStartCycle(testfed, testcentralbank, testusersB, testnamesB);
	});
}

main();
