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
		this.blockchain = [this.generateGenesisBlock()];
		this.currentIndex = 0;
	}
  
	// genesis block has random hash
	generateGenesisBlock() {
		return new Block(0, '0', 1000000000, 'genesis block', crypto.randomBytes(32).toString('hex'));
	}

	generateBlockHash(index, previousHash, timestamp, data) { 
		return hash(index + previousHash + timestamp + data);
	}

	getLatestBlock() {
		log('getLatestBlock: currentIndex is:' + this.currentIndex);
		return this.blockchain[this.currentIndex];
	}

	generateNextBlock(blockData) {
		 const previousBlock = this.getLatestBlock();
		 // log('generateNextBlock: previousBlock is:' + JSON.stringify(previousBlock));
		 const nextIndex = previousBlock.index + 1;
		 const nextTimestamp = new Date().getTime() / 1000;
		 const nextHash = this.generateBlockHash(nextIndex, previousBlock.hash, nextTimestamp, blockData);
		 return new Block(nextIndex, previousBlock.hash, nextTimestamp, blockData, nextHash);
	}

	// verify block's intended hash value matches given hash value
	verifyBlockHash(block, hash) {
		return hash === this.generateBlockHash(block.index, block.previousHash, block.timestamp, block.data);
	}

	isValidNewBlock(newBlock, previousBlock) {
		if (previousBlock.index + 1 !== newBlock.index) {
			log('isValidNewBlock: invalid index for new block');
			return false;
		} else if (previousBlock.hash !== newBlock.previousHash) {
			log('isValidNewBlock: hash of previous block invalid');
			return false;
		} else if (!this.verifyBlockHash(newBlock, newBlock.hash)) {
			log('isValidNewBlock: hash of block does not match contents');
			return false;
		}
		return true;
	}

	// return if success
	addBlock(newBlock) {
		// log('addBlock: attempting to add block at index ' +  this.currentIndex + 1);
		if (this.isValidNewBlock(newBlock, this.getLatestBlock())) {
			this.currentIndex += 1;
			this.blockchain.push(newBlock);
			log('addBlock: added block at index '+ this.currentIndex);
			return true;
		} else {
			log('addBlock: failed to add block at index' + this.currentIndex);
			return false;
		}
	}

	printBlockChain() {
		log('current index is' + this.currentIndex);
		log('blockchain is:' + JSON.stringify(this.blockchain, null, 4));
	}

	writeBlockChainToFile(filepath) {
		fs.writeFile(filepath, JSON.stringify(this.blockchain, null, 4), (err) => {
			if (err) throw err;
			log('writeBlockChainToFile: successfully wrote to file');
		});
	}
}

module.exports.Blockchain = Blockchain;
