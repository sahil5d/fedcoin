// Sahil Gupta

/*
Notes

TX is object
	key is INPUTS or OUTPUTS
	value is array of ADDRIDS
BUNDLE is 2d object
	keys are [NODE][ADDRID]
	value is VOTE
VOTE is [pk_node, signature]

each promise catches its own errors
so won't short-circuit Promise.all
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
					// console.log('query vote ' + vote);

					// note: paper says exit loop if any vote is a no
					// note: but here we're ok if majority votes are yes
					if (!vote)
						return null;

					if (!bundle[node])				// create key if empty
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
	
	// wait for all queries to finish
	// todo: put time limit on how long Promise.all waits
	Promise.all(queries).then(results => {
		// array of nulls, votes, or errors
		console.log('queries results ' + results);
		
		// phase 2 commit
		var sampleAddrid = tx.outputs[0];
		var nodes = getOwners(sampleAddrid);
		
		var commits = [];			// list of commit promises

		for (var i in nodes) {
			var node = nodes[i];

			var commit = commitTx(tx, j, bundle, node)
				.then(vote => {
					// console.log('commit vote ' + vote);
					return vote;	// could be null
				}).catch(err => {
					console.log('commit error ' + err);
					return err;
				});

			commits.push(commit);
		}

		// wait for all commits to finish
		// todo: put time limit on how long Promise.all waits
		Promise.all(commits).then(results => {
			// array of nulls, votes, or errors
			// todo: user saves this evidence to potentially audit a node
			console.log('commits results ' + results);
		}).catch(err => {
			console.log('commits error ' + err);
		});

	}).catch(err => {
		console.log('queries error ' + err);
	});
}
