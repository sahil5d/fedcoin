"use strict";
const crypto = require('crypto');
const cryptico = require('cryptico-js');
const NodeRSA = require('node-rsa');
const fastRoot = require('merkle-lib/fastRoot');
const secrets = require('./secrets')
const express = require("express");
const bodyParser = require('body-parser');
const WebSocket = require("ws")
const unirest = require('unirest');

// Store IP:PORT of central bank as environment variable
var cb = process.env.CENTRALBANK

// Lower block
class LowerBlock{
	constructor(h, txset, sigma, mset) {
		this.h = h;
		this.txset = txset;
		this.sigma = sigma;
		this.mset = mset;
	}
};

// Convert data into lower block at end of epoch
var createLowerBlock = (h, txset, sigma. mset) => {
	newBlock = new LowerBlock(h, txset, sigma, mset);
	return newBlock;
}

// Send lower block to central bank
var pushLowerBlockToCentralBank = (block) => {
	var data = processBlock(block);
	unirest.post(cb).query({'data': data})
		.end(function(res) {
			if (res.error) {
				console.log("pushLowerBlockToCentralBank: error in sending block to cb");
			}
			else console.log("pushLowerBlocToCentralBank: success in sending block to cb")
})};




