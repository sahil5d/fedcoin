"use strict";

// Sahil Gupta

/*
Notes
*/

const fedcoin = require('./fedcoin');

function log(x) { console.log(x); }


const v = new fedcoin.Vote('pppp', 'ssssss');

const nc1 = new fedcoin.NodeClass('BAC'),
      nc2 = new fedcoin.NodeClass('JPM'),
      nc3 = new fedcoin.NodeClass('COF'),
      nc4 = new fedcoin.NodeClass('PNC'),
      nc5 = new fedcoin.NodeClass('WFC');

fedcoin.nodeMap['BAC'] = nc1;
fedcoin.nodeMap['JPM'] = nc2;
fedcoin.nodeMap['COF'] = nc3;
fedcoin.nodeMap['PNC'] = nc4;
fedcoin.nodeMap['WFC'] = nc5;

log(fedcoin.nodeMap)


