"use strict";

// Shreyas Ravishankar
// inspired by https://github.com/lhartikk/naivechain

const crypto = require('crypto');
const cryptico = require('cryptico-js');
const NodeRSA = require('node-rsa');
const fastRoot = require('merkle-lib/fastRoot');
const secrets = require('./secrets')
const express = require("express");
const fs = require("fs");

function hash(data) { return crypto.createHash('sha256').update(data).digest('hex'); }

class Block {
	constructor(index, previousHash, timestamp, data, hash){
		this.index = index;
		this.previousHash = previousHash;
		this.timestamp = timestamp;
		this.data = data;
		this.hash = hash;
	}
};

class Blockchain {
	constructor() {
		this.blockchain = [this.generateGenesisBlock()];
		this.currentIndex = 0;
	}
  
	// Calculate hash value
	generateBlockHash(index, previousHash, timestamp, data) { 
		return hash(index + previousHash + timestamp + data);
	}

	// Get latest block in blockchain
	getLatestBlock() {
		console.log("getLatestBlock: currentIndex is:" + this.currentIndex);
		return this.blockchain[this.currentIndex];
	}

	// Generate next block
	generateNextBlock(blockData) {
		 var previousBlock = this.getLatestBlock();
		 // console.log("generateNextBlock: previousBlock is:" + JSON.stringify(previousBlock));
		 var nextIndex = previousBlock.index + 1;
		 var nextTimestamp = new Date().getTime() / 1000;
		 var nextHash = this.generateBlockHash(nextIndex, previousBlock.hash, nextTimestamp, blockData);
		 return new Block(nextIndex, previousBlock.hash, nextTimestamp, blockData, nextHash);
	}

	// Generate genesis block
	generateGenesisBlock() {
		// Genesis block has random hash
		return new Block(0, "0", 1111111111, "genesis_block", crypto.randomBytes(32).toString("hex"));
	}

	// Verify that block's intended hash value matches given hash value
	verifyBlockHash(block, hash) {
		var blockHash = this.generateBlockHash(block.index, block.previousHash, block.timestamp, block.data)
		return (blockHash === hash)
	}

	// Check validity of new block
	isValidNewBlock(newBlock, previousBlock) {
		if (previousBlock.index + 1 !== newBlock.index) {
			console.log('isValidNewBlock: Invalid index for new block');
			return false;
		} else if (previousBlock.hash !== newBlock.previousHash) {
			console.log('isValidNewBlock: Hash of previous block stored in current block does not match actual hash');
			return false;
		} else if (!(this.verifyBlockHash(newBlock, newBlock.hash))) {
			console.log('isValidNewBlock: Hash of block does not match hash of block contents');
			return false;
		}
		return true;
	}

	// Add block to blockchain
	addBlock(newBlock) {
		console.log('addBlock: attempting to add block at index '+  this.currentIndex + 1 + 'to blockchain');
		if(this.isValidNewBlock(newBlock, this.getLatestBlock())){
			this.currentIndex += 1;
		  this.blockchain.push(newBlock);
			console.log('addBlock: added block at index '+ this.currentIndex + 'to blockchain');
		}
		else console.log('addBlock: failed to add block at index'+ this.currentIndex + 'to blockchain');	
	}

	// Print blockchain
	printBlockChain() {
		console.log("Blockchain is:" + JSON.stringify(this.blockchain, null, 4));
		console.log("Current index is" + this.currentIndex);
	}

	// Write blockchain to file
	writeBlockChainToFile(filepath) {
		fs.writeFile(filepath, JSON.stringify(this.blockchain, null, 4), function(err) {
			if(err) {
				return console.log(err)
			}
			console.log('writeBlockChainToFile: successfully wrote to file blockchain.txt');
	})};
}

// Exporting modules for client
module.exports.Blockchain = Blockchain;
