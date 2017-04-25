"use strict";

// Sahil Gupta

/*
Notes
*/

const fedcoin = require('./fedcoin');

function log(x) { console.log(x); }


const v = new fedcoin.Vote('pppp', 'ssssss');

// must instantiate nodeclasses first
const bankstocks = ['AAA', 'BBB', 'CCC', 'DDD', 'EEE', 'FFF'];
const nodeclasses = [];
bankstocks.forEach(stock => {
    var nc = new fedcoin.NodeClass(stock);
    nodeclasses.push(nc);
    fedcoin.nodeMap[stock] = nc;

});

fedcoin.populateShardMap(nodeclasses);

log(nodeclasses)

log(fedcoin.nodeMap)
log(fedcoin.shardMap)

const u1 = new fedcoin.User('batman', 'correct horse battery staple')

// log(u1)
