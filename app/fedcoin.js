'use strict';

// Sahil Gupta

/*
Notes
sk is secret private key
pk is public key

nickname-passphrase pair must be universally unique.
ensure minimum complexity of user passphrases
keygen depends on it

todo = to do now
future = to do later
could = to do much later
*/

const crypto = require('crypto');
const cryptico = require('cryptico-js');
const NodeRSA = require('node-rsa');
const fastRoot = require('merkle-lib/fastRoot');
const blockchain = require('./blockchain');
// const secrets = require('./secrets');
// const codes = secrets.codes;

const FEW = 3;
const HUND = 50;
const NSHARDS = 2;		// could change to 3. simple is 2
const BITSRSA = 512;	// could change to 2048. simple is 512
const NODEMAP = {};		// see world.js. key NODE, value NODECLASS
const SHARDMAP = [];	// see world.js. index shard #, value [nodeclasses]
const THEFED = null;	// see world.js. the one, global CentralBank

function log(x) { console.log(x); }

// input string or Buffer with hex encoding
// return sha256 hash
function hash(data) { return crypto.createHash('sha256').update(data).digest('hex'); }

// return Buffer instead of hex string
function hashBuffer(data) { return crypto.createHash('sha256').update(data).digest(); }

// return ripemd160 hash
function hashAltBuffer(data) { return crypto.createHash('ripemd160').update(data).digest('hex'); }

// input string data and key. key often used as salt
// return sha256 hmac
function hmac(data, key) { return crypto.createHmac('sha256', key).update(data).digest('hex'); }

// input string data and private key pem
// return signature
function sign(data, privatePem) {
	const sign = crypto.createSign('RSA-SHA256');
	sign.update(data);
	return sign.sign(privatePem);
}

// input string data, public key pem, signature
// return true iff success
function verify(data, publicPem, signature) {
	const verify = crypto.createVerify('RSA-SHA256');
	verify.update(data);
	return verify.verify(publicPem, signature);
}

// input public key pem
// return address as hex string
function publicPemToAddress(publicPem) {
	const publicKey = new NodeRSA();
	publicKey.importKey(publicPem, 'pkcs1-public');
	const N = publicKey.exportKey('components-public').n; // hex buffer

	const doublehash = hashAltBuffer(hashBuffer(N));
	const checksum = hash(hashBuffer(doublehash)).substr(0, 8);
	return doublehash + checksum;
}

// input private key from cryptico
// return key object with bigintegers converted to hex buffers
cryptico.skToHex = function(sk) {
	const keys = ['n', 'd', 'p', 'q', 'dmp1', 'dmq1', 'coeff'];
	const dict = {};
	keys.forEach(k => {
		// kludge prepend 0 if hex string has odd length
		if (k === 'coeff' && (sk[k].toString(16).length % 2) !== 0)
			dict[k] = Buffer.from('0'+sk[k].toString(16), 'hex');
		else
			dict[k] = Buffer.from(sk[k].toString(16), 'hex');
	});
	dict.e = 3;  // cryptico enforces exponent of 3
	return dict;
};

// input unique identifying string
// output shard number it falls in
function stringToShard(string) {
	const sample = 4;
	const decimal = parseInt(string.substr(0, sample), 16);
	return decimal % NSHARDS;
}

// input all NODES in the world
// populate SHARDMAP by assigning each node to shard
function populateShardMap(nodes) {
	for (var i = 0; i < NSHARDS; i++)
		SHARDMAP.push([]);
	
	nodes.forEach(n => {
		const shard = stringToShard(hash(n));
		SHARDMAP[shard].push(n);
	});

	log('shards ' + JSON.stringify(SHARDMAP));
}

// future. implement. and check for iscentralbankprinting bc tx.inputs null
function checkTx(tx) {
	return true;
	var inVal = 0, outVal = 0;
	tx.inputs.forEach(ai => inVal += ai.value);
	tx.outputs.forEach(ai => outVal += ai.value);
	// 1 check input addrids point to valid txs
	// 2 check sigs authorizing prev tx outputs are valid
		// basically that the tx is signed?
		// does this mean we need sigs on every tx?
}

// simulate http request
// this way sender needs no knowledge of the NODECLASS, just NODE
// future use servers
class FakeHttp {
	constructor() {}

	broadcast(node, method, args) {
		const nodeClass = NODEMAP[node];
		args.push(nodeClass); // so has access to 'this'
		return nodeClass[method].apply(this, args);
	}
}

// input NODE for http request to nodeclass
// only issued by central bank
// return bool of success
function mainNotifyNode(node, method, args) {
	const fake = new FakeHttp();
	return fake.broadcast(node, method, args);
}

// todo clean up these two fxs like above
// input NODE for http request to nodeclass
// return promise of nodeclass's vote
function mainQueryTx(node, addrid, tx) {
	const fake = new FakeHttp();
	return fake.broadcast(node, 'queryTx', [addrid, tx]);
}
function mainCommitTx(node, tx, bundle, isCentralBankPrinting) {
	const fake = new FakeHttp();
	return fake.broadcast(node, 'commitTx', [tx, bundle, isCentralBankPrinting]);
}

// algorithm v.1
// input transaction TX, isCentralBankPrinting
// future replace isCentralBankPrinting with a signature of the CB. more secure
// BUNDLE is 2d object, BUNDLE[NODE][ADDRID.DIGEST] = VOTE
// return promise of whether tx is a success. logs queries and commits
function mainSendTx(tx, isCentralBankPrinting) {
	// phase 1 query
	const bundle = {};		// bundle of votes
	const queries = [];		// list of all query promises

	function notNullOrErr(vote) {
		return vote !== null && !(vote instanceof Error);
	}

	// when central bank prints money, this loop skipped. no queries made
	for (var i in tx.inputs) {
		const addrid = tx.inputs[i];
		const nodes = SHARDMAP[addrid.shard];

		for (var ii in nodes) {
			const node = nodes[ii];
			// note: each query promise catches its own errors
			// note: so won't break Promise.all (neither will null promise)
			var query = mainQueryTx(node, addrid, tx)
				.then(vote => {
					// log('vote is' + vote);
					log('query vote - node ' + node);
					if (!vote)
						return null;
					if (!bundle[node])					// if null, fill it
						bundle[node] = {};
					bundle[node][addrid.digest] = vote; // add vote

					return vote;
				}).catch(err => {
					log('query error ' + err);
					return err;
				});

			queries.push(query);
		}
	}

	// wait for all queries to finish
	// future add time limit on Promise.all throughout code
	// this still executes when central bank prints money (queries===[])
	return Promise.all(queries)
	.then(results => {
		// an array of nulls, votes, or errors
		// log('queries results ' + results);

		if (!isCentralBankPrinting) {
			// local check that majority of votes are yes
			const yesses = results.filter(notNullOrErr).length;
			if (yesses <= results.length / 2) {
				log('queries rejected');
				return false;
			}

			log('queries pass - ' + yesses + '/' + results.length + ' - tx ' + tx.digest.substr(0, 8) + ' - value ' + tx.value);
		}

		// phase 2 commit
		const addridSample = tx.outputs[0];
		const nodes = SHARDMAP[addridSample.shard];
		const commits = []; // list of all commit promises

		for (var i in nodes) {
			const node = nodes[i];
			var commit = mainCommitTx(node, tx, bundle, isCentralBankPrinting)
				.then(vote => {
					// log('vote is ' + vote);
					log('commit vote - node ' + node);
					return vote; // can be null
				}).catch(err => {
					log('commit error ' + err);
					return err;
				});

			commits.push(commit);
		}

		return Promise.all(commits)
		.then(results => {
			// RESULTS can be used as audit proof
			// an array of nulls, votes, or errors
			// log('commits results ' + results + tx.value);

			// local check that majority of votes are yes
			const yesses = results.filter(notNullOrErr).length;
			if (yesses <= results.length / 2) {
				log('commits rejected');
				return false;
			}

			// reached success

			log('commits pass - ' + yesses + '/' + results.length + ' - tx ' + tx.digest.substr(0, 8) + ' - value ' + tx.value);

			return true;
		}).catch(err => {
			log('commits error ' + err);
			return false;
		});
	}).catch(err => {
		log('queries error ' + err);
		return false;
	});
}


class Vote {
	constructor(publicKey, signature) {
		this.pk = publicKey;
		this.sig = signature;
	}
}


class Addrid {
	constructor(tx, address, index, value) {
		this.txdigest = tx.digest;
		this.address = address;
		this.index = index; // index(address) in tx output
		this.value = value;
		this.digest = hash(tx.digest + address + index + value);
		this.shard = stringToShard(tx.digest); // function of tx
	}
}


class Tx {
	// note: first arg is addrids, second arg is addresses
	// but after instantiation, inputs and outputs are addrids
	constructor(inAddrids, outAddresses, value) {
		const inAddresses = [];
		if (inAddrids)
			inAddrids.forEach(ai => inAddresses.push(ai.address));

		// digest depends on addresses, not addrids
		this.digest = hash(inAddresses + outAddresses + value);

		const outAddrids = [];
		outAddresses.forEach((a, i) => outAddrids.push(new Addrid(this, a, i, value)));

		this.inputs = inAddrids;
		this.outputs = outAddrids;
		this.value = value;
	}
}


class Wallet {
	constructor(nickname, passphrase) {
		this.nickname = nickname; // nickname of user owner
		this.passphraseSafe = hmac(passphrase, nickname); // nickname like salt

		this.addressCount = 0;

		// AG abbreviates "address group"
		// arrays of {sk: value, pk: value, address: value, addrid: value}
		// future encrypt all the sks
		this.spareAGs = [];		// queue
		this.usedAGs = [];		// list
		this.richAGs = [];		// queue
	}

	// input N addresses to create, PASSPHRASE required
	// create new sks, pks, and addresses
	// return true iff success
	createAddresses(n, passphrase) {
		if (hmac(passphrase, this.nickname) !== this.passphraseSafe) {
			log('invalid passphrase');
			return false;
		}

		for (var i = 0; i < n; i++) {
			// deterministic private key, using uppercase nickname as key
			const seed = hmac(this.nickname + passphrase + this.addressCount, this.nickname.toUpperCase());
			const skDraft = cryptico.generateRSAKey(seed, BITSRSA);

			const sk = new NodeRSA();
			// note: adds leading zeros to n,p,q,dmp1 during import
			sk.importKey(cryptico.skToHex(skDraft), 'components');
			// log(sk.exportKey('components-private'))

			const privatePem = sk.exportKey('pkcs1-private');
			const publicPem = sk.exportKey('pkcs1-public');
			const publicAddress = publicPemToAddress(publicPem);

			this.spareAGs.push({
				sk: privatePem,
				pk: publicPem,
				address: publicAddress,
				addrid: null
			});

			this.addressCount += 1;
		}
		return true;
	}

	// if running low on spare addresses, create some
	// return oldest spare address group
	getSpareAG(passphrase) {
		if (hmac(passphrase, this.nickname) !== this.passphraseSafe) {
			log('invalid passphrase');
			return false;
		}

		if (this.spareAGs.length < FEW)
			this.createAddresses(FEW*FEW, passphrase);

		return this.spareAGs.shift();
	}

	// return oldest rich address group
	// future accept value argument, returns as many richAGs as necessary
	getRichAG(passphrase) {
		if (hmac(passphrase, this.nickname) !== this.passphraseSafe) {
			log('invalid passphrase');
			return false;
		}

		if (this.richAGs.length === 0) // no funds
			return null;

		return this.richAGs.shift();
	}

	// add successful tx array of ADDRESSGROUPS to RICHADDRESSGROUP
	// each ADDRESSGROUP now has non-null addrid field
	addRichAGs(addressGroups, passphrase) {
		if (hmac(passphrase, this.nickname) !== this.passphraseSafe) {
			log('invalid passphrase');
			return false;
		}

		Array.prototype.push.apply(this.richAGs, addressGroups);
		return true;
	}

	// add successful tx array of ADDRESSGROUPS to USEDADDRESSGROUP
	addUsedAGs(addressGroups, passphrase) {
		if (hmac(passphrase, this.nickname) !== this.passphraseSafe) {
			log('invalid passphrase');
			return false;
		}

		Array.prototype.push.apply(this.usedAGs, addressGroups);
		return true;
	}


}


class User {
	constructor(nickname, passphrase) {
		this.nickname = nickname;
		this.wallet = new Wallet(nickname, passphrase);
		this.wallet.createAddresses(HUND, passphrase);
	}

	// returns promise of success
	sendTx(tx) {
		return mainSendTx(tx, false);
	}
}


// NODECLASS is the class verifying txs, is the commercial bank
// NODECLASS.NICKNAME is what users understand as NODE
class NodeClass {
	constructor(nickname, passphrase) {
		this.nickname = nickname;	// must be unique. bank stock symbol?
		this.utxo = {};				// object of unspent tx outputs
									// key is ADDRID.DIGEST, val true=unspent
		this.pset = {};				// object of txs to catch double spending
									// key is ADDRID.DIGEST, val is tx
		this.txset = new Set();		// set for sealing txs, all contents unique

		this.shard = stringToShard(hash(nickname));

		this.jEpoch = 0;				// epoch number
		this.jPeriod = null;			// period number. set by central bank
		this.periodOpen = false;		// set by cb
		this.highlevelBlockHash = null;	// set by cb

		// future update sks and pks every period
		const privateKey = new NodeRSA({b: BITSRSA}); // for signing and verifs
		this.sk = privateKey.exportKey('pkcs1-private');
		this.pk = privateKey.exportKey('pkcs1-public');

		this.wallet = new Wallet(nickname, passphrase); // to receive fed fees
		this.wallet.createAddresses(FEW, passphrase);

		this.blockchain = new blockchain.Blockchain(); // init blockchain
	}

	// future need to validate this is signed by cb
	setPeriod(period, theNodeClass) {
		theNodeClass.jPeriod = period;
	}
	setPeriodOpen(status, theNodeClass) {
		theNodeClass.periodOpen = status;
	}
	setHighlevelBlockHash(hash, theNodeClass) {
		theNodeClass.highlevelBlockHash = hash;
	}

	// algorithm v.2
	// input ADDRID, transaction TX
	// return promise of node's vote
	// when central banks prints money, won't get called
	queryTx(addrid, tx, theNodeClass) {
		const digest = addrid.digest;

		return new Promise((resolve, reject) => {
			if (!checkTx(tx) || theNodeClass.shard !== addrid.shard) {
				resolve(null);
			} else if (theNodeClass.utxo[digest] || theNodeClass.pset[digest].digest === tx.digest) {
				theNodeClass.utxo[digest] = null;	// idempotent action
				theNodeClass.pset[digest] = tx;		// idempotent action
				resolve(new Vote(theNodeClass.pk, sign('yes', theNodeClass.sk)));
			} else {
				resolve(null);
			}
		});
	}

	// algorithm v.3
	// input transaction TX, BUNDLE, bool ISCENTRALBANKPRINTING
	// return promise of node's vote
	commitTx(tx, bundle, isCentralBankPrinting, theNodeClass) {
		return new Promise((resolve, reject) => {
			const addridSample = tx.outputs[0];

			// future pass ISCENTRALBANKPRINTING into checkTx
			if (!checkTx(tx) || theNodeClass.shard !== addridSample.shard) {
				resolve(null);
			} else {
				var allInputsValid = true;
				// if ISCENTRALBANKPRINTING loop will be skipped
				for (var i in tx.inputs) {
					const addrid = tx.inputs[i];
					const nodes = SHARDMAP[addrid.shard];
					var yesses = 0;

					for (var ii in nodes) {
						const node = nodes[ii];
						if (bundle[node] && bundle[node][addrid.digest]) {
							const vote = bundle[node][addrid.digest];
							// future line 9 algo 3
							// use authorizedNodes
								// if thenodeclass.pk is in authorizednodes.map(arr=>arr[0]) // this should be saved for speed
							// if good to go
							// yesses += 1
						}
					}

					// if (yesses <= nodes.length / 2) {
					// 	log('queries invalid, commit rejected');
					// 	allInputsValid = false;
					// 	break;
					// }
				}

				if (!allInputsValid) {
					resolve(null);
				} else {
					for (var i in tx.outputs) {
						const addrid = tx.outputs[i];
						theNodeClass.utxo[addrid.digest] = true;
					}
					theNodeClass.txset.add(tx);

					// resolve is not a return. code continues
					resolve(new Vote(theNodeClass.pk, sign('yes', theNodeClass.sk)));

					// issue lowlevel block if enough txs and period is open
					// future use mset
					if (theNodeClass.txset.size >= HUND / 2 &&
						theNodeClass.periodOpen) {

						// log(theNodeClass.txset);
						const txarr = Array.from(theNodeClass.txset);
						const txHashBuffers = txarr.map(tx => Buffer.from(tx.digest, 'hex'));

						// calculate merkle root
						const rootHash = fastRoot(txHashBuffers, hashBuffer).toString('hex');

						// calculate H for lowlevel block B todo
						const h = hash();


						// b = [h, txarr, mset (future), sig]

						const nextBlock = theNodeClass.blockchain.generateNextBlock([rootHash, txarr]);

						if (theNodeClass.blockchain.addBlock(nextBlock)) {
							const sig = sign(nextBlock.hash, theNodeClass.sk);
							THEFED.addLowlevelBlock(nextBlock, sig);
						}

						theNodeClass.blockchain.writeBlockChainToFile('bc' + theNodeClass.nickname + '.txt');
						log(theNodeClass.nickname + ' issued a block');
						
						theNodeClass.txset.clear();
						theNodeClass.jEpoch += 1;
					}									
				}
			}
			
		});
	}

	// todo
	// if epochdone meaning (txsetsize == max) and periodopen
		// epoch += 1
		// do stuff like calculate H
		// package lower block
		// put on queue
		// this.lastlowerblockhash = H
		// refresh txset, mset, etc

	//lasthigherblockhash should update with cb messages

	// need vars periodopened, periodclosed
	// need to listen to cb broadcasts
	// but can still do queries/commits
	// begin again with new merkleroot when periodopen!
	// note that blocks pushed to cb in queue. do it async
}


class CentralBank {
	constructor(nickname, passphrase, nodesNamesAndPKs) {
		this.nickname = nickname;
		this.txset = new Set();

		this.startTime = new Date(); // todo
		this.jPeriod = 0; // period number

		const privateKey = new NodeRSA({b: BITSRSA});
		this.sk = privateKey.exportKey('pkcs1-private');
		this.pk = privateKey.exportKey('pkcs1-public');

		this.wallet = new Wallet(nickname, passphrase); // to pay nodes/users
		this.wallet.createAddresses(FEW, passphrase);

		this.blockchain = new blockchain.Blockchain(); // init blockchain

		// array with elements {node nickname, node pk, sign(node pk, centralbank sk)}
		// future should update per period, and CB should broadcast to nodes
		this.authorizedNodes = nodesNamesAndPKs.map(nnp => {
			return {
				nickname: nnp.nickname,
				pk: nnp.pk,
				sig: sign(nnp.pk, this.sk)
			}
		});

		// broadcast to all nodes
		// future should send with signature
		this.authorizedNodes.forEach(an => {
			mainNotifyNode(an.nickname, 'setPeriod', [this.jPeriod]);
			mainNotifyNode(an.nickname, 'setPeriodOpen', [true]);
			mainNotifyNode(an.nickname, 'setHighlevelBlockHash',
				[this.blockchain.getLatestBlock().hash]);
		});

		this.lowlevelQueue = [];	// queue of lowlevel blocks pushed by nodes
	}

	// returns promise of success
	sendTx(tx) {
		return mainSendTx(tx, false);
	}

	// central bank pays itself
	// return promise of whether printMoney a success
	printMoney(value, passphrase) {
		const ag = this.wallet.getSpareAG(passphrase);
		const tx = new Tx(null, [ag.address], value);
		// future save this tx in highlevel block
		return mainSendTx(tx, true)
		.then(success => {
			ag.addrid = tx.outputs[0];
			this.wallet.addRichAGs([ag], passphrase);
			return success;
		});
	}

	addLowlevelBlock(block, sig) {
		// todo verifiy node's sig
		this.lowlevelQueue.push(block);
	}

	// todo
	// period should process every minute

	// every second
		// if period finished
			// notify nodes period ended

		// check queue for lower blocks
		// async: if any, validate them in order
			// check signature
			// regen hash with block data & node's previous lowlevel hash
			// if all good, add lowlevel txset to highlevel txset
			// make sure no duplicates
			// update value of node's previous lowlevel hash

		// if period finished
			// detect double spending
				// count # of each tx received from lowlevel blocks
				// rmv those that didn't get committed by majority of owners
				// in other words, check that each tx was included in lowlevel blocks by majority of nodes mapped to each tx output address
			// finalize txset for the period
			// gen and seal high level block
			// notify nodes new period open
				// give them merkle root and authorizednodes
}


// future remove as many global vars as possible
module.exports.NODEMAP = NODEMAP;
module.exports.THEFED = THEFED;
module.exports.populateShardMap = populateShardMap;
module.exports.Tx = Tx;
module.exports.User = User;
module.exports.NodeClass = NodeClass;
module.exports.CentralBank = CentralBank;
