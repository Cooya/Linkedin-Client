const express = require('express');
const linkedin = require('./linkedin');

const config = require('./assets/config.json');

const app = express();

app.get('/', (req, res, next) => {
    res.sendFile(__dirname + '/web/index.html');
});

app.get('/request', async (req, res, next) => {
    console.log('Request received with linkedin URL = ' + req.query.linkedinUrl);

    if(!req.query.linkedinUrl)
        return res.json({error: 'A linkedin URL is required.'});

    try {
        const details = await linkedin.getCompanyOrPeopleDetails(req.query.linkedinUrl);
        console.log(details);
        res.json({error: null, result: details});
        console.log('Response sent !');
    }
    catch(e) {
        console.error(e);
        res.json({error: 'Something went wrong...'});
    }
});

app.use('/assets', express.static('web/assets'));

console.log('Server started on port ' + config.serverPort + ', waiting for requests...');
app.listen(config.serverPort);
