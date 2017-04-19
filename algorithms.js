// Sahil Gupta

/*
Notes

TX is object
	key is INPUTS or OUTPUTS
	value is array of ADDRIDS
BUNDLE is 2d object
	keys are [NODE][ADDRID]
	value is VOTE
*/


// return array
function getOwners(addrid) {
	
}


function checkTx(tx) {
	// total input val >= total output value
	// input addrids point to valid txs
	// sigs authorizing prev tx outputs are valid
}


// algorithm v.1
// input transaction TX and period J
function userValidatesTx(tx, j) {
	// phase 1 query
	var bundle = {};					// bundle of votes
	var queries = [];					// list of query promises
	
	for (var i in tx.inputs) {
		var addrid = tx.inputs[i];
		var nodes = getOwners(addrid);	// return array
		
		for (var ii in nodes) {
			var node = nodes[ii];
			
			// note: error handling inside query
			var query = checkUnspent(node, addrid, tx)
				.then(vote => {
					// VOTE is [pk_node, signature]
					// note: paper says exit loop if any vote is a no
					// note: but that's excessive. it's ok if majority votes are yes
					if (!vote)
						return null;

					if (!bundle[node])				// if key is empty, create it
						bundle[node] = {};
						
					bundle[node][addrid] = vote;	// add vote to bundle
					
					return vote;
				}).catch(err => {
					console.log('query error ' + err);
					return err;
				});
			
			queries.push(query);
		}
	}
	
	// phase 2 commit
	// wait for all queries to finish
	// note: if a query throws an error, no problem
	// note: each query catches errors so won't break Promise.all
	// todo: put time limit on how long Promise.all waits
	Promise.all(queries).then(result => {
		console.log('result ' + result);				// null, vote, or error
		
		var sampleAddrid = tx.outputs[0];
		var nodes = getOwners(sampleAddrid);
		
		for (var i in nodes) {
			var node = nodes[i];
			
			// todo: need to handle commitTx like a promise
			var vote = commitTx(tx, j, bundle, node);	// returns [pk_node, sig]
		}	
	}).catch(function(err) {
		console.log('queries error ' + err);
	});
}
