require('./app/algorithms');

const express = require('express')  
const app = express();  
const port = 3000;

// app.use((request, response, next) => {  
//     console.log(request.headers);
//     next();
// });

app.use((request, response, next) => {  
    request.chance = Math.random();
    next();
});

app.get('/', (request, response) => {  
    response.json({
        text: 'hi',
        chance: request.chance
    });
});


app.listen(port, (err) => {  
    if (err)
        return console.log('server error ', err)
    
    console.log('server listening on ' + port);
});
