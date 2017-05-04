'use strict';

// Shreyas Ravishankar

// Store IP:PORT of mintettes as semi colon separated environment variable
// var mintettes = process.env.MINTETTES? process.env.MINTETTES.split(';') : []


/*
// Problem: many mintettes could send in details of the same transactino
// We jsut want to pick one copy that will henceforth uniquely represent the txn.
// Parse data received from lower level block
var parseBlock = (lowerBlockData) => {
	var data = JSON.parse(lowerBlockData);
	var txns = data.txset;
	var lowerBlockSig = data.sigma;
	// Assuming txns is a list of JSON itself
	txns.forEach(txn) => {

		
}
// TODO: Flush blockchain to file vas

// Run http server for central bank
var initHttpServer = () => {
	var app = express();
	app.use(bodyParser.json());
	
	// Return string of all blocks
	app.get('/get_blocks', (req, res) => res.send(JSON.stringify(blockchain)));
	
	// Add block with given data to blockchain
	app.post('/add__block', (req, res) => {	
		console.log('initHttpServer: received lower level block' + JSON.stringify(req.body.data));
	//	parseLowerLevelBlock(req.body.data);
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
*/
