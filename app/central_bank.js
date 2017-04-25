/*
 * Inspired heavily by https://medium.com/@lhartikk/a-blockchain-in-200-lines-of-code-963cc1cc0e54return 
 * and https://github.com/lhartikk/naivechain/blob/master/main.js
 */

// Store IP:PORT of mintettes as semi colon separated environment variable
var mintettes = process.env.MINTETTES? process.env.MINTETTES.split(';') : []

"use strict";
const crypto = require('crypto');
const cryptico = require('cryptico-js');
const NodeRSA = require('node-rsa');
const fastRoot = require('merkle-lib/fastRoot');
const secrets = require('./secrets')
const express = require("express");
const bodyParser = require('body-parser');
const WebSocket = require("ws");
	
// In memory current index of blockchain
var currentIndex = 0;

// In memory blockchain data structure
var blockchain;

// Sahil's hash function
function hash(data) { return crypto.createHash('sha256').update(data).digest('hex'); }

// Higher level block
class Block {
	constructor(index, previousHash, timestamp, data, hash){
		this.index = index;
		this.previousHash = previousHash;
		this.timestamp = timestamp;
		this.data = data;
		this.hash = hash.toString();
	}
};

// Calculate hash value
var generateBlockHash = (index, previousHash, timestamp, data) => { 
	return crypto.createHash('sha256').update(index + previousHash + timestamp + data).digest('hex'); 
};

// Get latest block in blockchain
var getLatestBlock = () => {
	console.log("getLatestBlock: currentIndex is:" + currentIndex);
	return blockchain[currentIndex];
};

// Generate next block
var generateNextBlock = (blockData) => {
	 var previousBlock = getLatestBlock();
	 console.log("generateNextBlock: previousBlock is:" + JSON.stringify(previousBlock));
	 var nextIndex = previousBlock.index + 1;
	 var nextTimestamp = new Date().getTime() / 1000;
	 var nextHash = generateBlockHash(nextIndex, previousBlock.hash, nextTimestamp, blockData);
	 return new Block(nextIndex, previousBlock.hash, nextTimestamp, blockData, nextHash);
};

// Generate genesis block
var generateGenesisBlock = () => {
	// Genesis block has random hash
	return new Block(0, "0", 1111111111, "genesis_block", crypto.randomBytes(32).toString("hex"));
	currentIndex = 0;
};

// Initialize the blockchain
var initBlockChain = () => {
	blockchain = [generateGenesisBlock()];
}

// Verify that block's intended hash value matches given hash value
var verifyBlockHash = (block, hash) => {
	var blockHash = generateBlockHash(block.index, block.previousHash, block.timestamp, block.data)
	return (blockHash === hash)
};

// Check validity of new block
var isValidNewBlock = (newBlock, previousBlock) => {
	if (previousBlock.index + 1 !== newBlock.index) {
		console.log('isValidNewBlock: Invalid index for new block');
		return false;
	} else if (previousBlock.hash !== newBlock.previousHash) {
		console.log('isValidNewBlock: Hash of previous block stored in current block does not match actual hash');
		return false;
	} else if (!(verifyBlockHash(newBlock, newBlock.hash))) {
		console.log('isValidNewBlock: Hash of block does not match hash of block contents');
		return false;
	}
	return true;
};

// Add block to blockchain
var addBlock = (newBlock) => {
	console.log('addBlock: attempting to add block at index'+ currentIndex + 'to blockchain');
	if(isValidNewBlock(newBlock, getLatestBlock())){
		blockchain.push(newBlock);
		console.log('addBlock: added block at index'+ currentIndex + 'to blockchain');
		currentIndex += 1;
	}
	else console.log('addBlock: failed to add block at index'+ currentIndex + 'to blockchain');	
};

// TODO: Flush blockchain to file vas

// Run http server for central bank
var initHttpServer = () => {
	var app = express();
	app.use(bodyParser.json());
	
	// Return string of all blocks
	app.get('/get_blocks', (req, res) => res.send(JSON.stringify(blockchain)));
	
	// Add block with given data to blockchain
	app.post('/add_block', (req, res) => {	
		console.log('initHttpServer: received instruction to add block' + JSON.stringify(req.body.data));
		var newBlock = generateNextBlock(req.body.data);
		addBlock(newBlock);
		res.send();
	});
	
	// TODO: Add stuff for auditing blocks in blockchain
	// TODO: Add stuff for returning information about mintettes
	// TODO: Add all the parsing stuff to make sure we don't duplicate txns coming from mintettes
	
	app.listen(8000, () => console.log('initHttpServer: listening http on port: ' + 8000));
};

// Unclear what these two do yet tbh
var initMessageHandler = (ws) => {
	ws.on('message', (data) => {
			var message = JSON.parse(data);
			console.log('Received message' + JSON.stringify(message));
			switch (message.type) {
			case MessageType.QUERY_LATEST:
			write(ws, responseLatestMsg());
			break;
			case MessageType.QUERY_ALL:
			write(ws, responseChainMsg());
			break;
			case MessageType.RESPONSE_BLOCKCHAIN:
			handleBlockchainResponse(message);
			break;
			}
			});
};

var initErrorHandler = (ws) => {
	var closeConnection = (ws) => {
		console.log('connection failed to peer: ' + ws.url);
		sockets.splice(sockets.indexOf(ws), 1);
	};
	ws.on('close', () => closeConnection(ws));
	ws.on('error', () => closeConnection(ws));
};

// Create connection to socket
var initConnection = (ws) => {
    sockets.push(ws);
    initMessageHandler(ws);
    initErrorHandler(ws);
};

// Connect to mintettes
var connectToMintettes = (mintettes) => {
	mintettes.forEach((mintette) => {
		var ws = new WebSocket(mintette);
		ws.on('open', () => {
			initConnection(ws);
			console.log('connectToMintettes: Connection with mintette'+  mintette + 'succeeded');
		});
		ws.on('error', () => {
			console.log('connectToMintettes: Connection with mintette'+  mintette + ' failed');
		});
	});
};

initBlockChain();
initHttpServer();
