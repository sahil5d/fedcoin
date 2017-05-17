'use strict';

// Shreyas Ravishankar
// based on https://github.com/lhartikk/naivechain

const crypto = require('crypto');
const fs = require('fs');

function log(x) { console.log(x); }

// input string or Buffer with hex encoding
// return sha256 hash
function hash(data) { return crypto.createHash('sha256').update(data).digest('hex'); }

class Block {
	constructor(index, previousHash, timestamp, data, hash){
		this.index = index;
		this.previousHash = previousHash;
		this.timestamp = timestamp;
		this.data = data;
		this.hash = hash;
	}
}

class Blockchain {
	constructor() {
		this.blockchain = [Blockchain.makeGenesisBlock()];
	}
  
	// genesis block has random hash
	static makeGenesisBlock() {
		return new Block(0, '0', 1000000000, 'genesis block', crypto.randomBytes(32).toString('hex'));
	}

	static calcBlockHash(index, previousHash, timestamp, data) {
		return hash(index + previousHash + timestamp + data);
	}

	// verify block's intended hash value matches given hash value
	static verifyBlockHash(block, hash) {
		return hash === this.calcBlockHash(block.index, block.previousHash, block.timestamp, block.data);
	}

	static isValidNewBlock(newBlock, previousBlock) {
		if (previousBlock.index + 1 !== newBlock.index) {
			log('invalid index for new block');
			return false;
		} else if (previousBlock.hash !== newBlock.previousHash) {
			log('hash of previous block invalid');
			return false;
		} else if (!this.verifyBlockHash(newBlock, newBlock.hash)) {
			log('hash of block does not match contents');
			return false;
		}
		return true;
	}

	getLatestBlock() {
		return this.blockchain[this.blockchain.length - 1];
	}

	makeNextBlock(blockData) {
		 const previousBlock = this.getLatestBlock();
		 // log('previousBlock is' + JSON.stringify(previousBlock));
		 const nextIndex = previousBlock.index + 1;
		 const nextTimestamp = new Date().getTime() / 1000;
		 const nextHash = Blockchain.calcBlockHash(nextIndex, previousBlock.hash, nextTimestamp, blockData);
		 return new Block(nextIndex, previousBlock.hash, nextTimestamp, blockData, nextHash);
	}

	// return if success
	addBlock(newBlock) {
		if (Blockchain.isValidNewBlock(newBlock, this.getLatestBlock())) {
			this.blockchain.push(newBlock);
			return true;
		}

		log('failed to add block');
		return false;
	}

	print() {
		log('current index is' + this.blockchain.length - 1);
		log('blockchain is' + JSON.stringify(this.blockchain, null, 4));
	}

	writeToFile(filepath) {
		fs.writeFile(filepath, JSON.stringify(this.blockchain, null, 4), (err) => {
			if (err) throw err;
			// log('wrote blockchain to file' + filepath);
		});
	}
}

module.exports.Blockchain = Blockchain;
