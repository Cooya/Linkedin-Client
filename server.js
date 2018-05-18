const express = require('express');
const linkedin = require('./linkedin');
const Raven = require('raven');

const config = require('./assets/config.json');
Raven.config(config.sentryEndpoint).install();
const app = express();
const ipAddresses = {};

process.on('uncaughtException', (e) => {
    Raven.captureException(e);
});
process.on('unhandledRejection', (e) => {
    Raven.captureException(e);
});

app.get('/', (req, res, next) => {
    res.sendFile(__dirname + '/web/index.html');
});

app.get('/request', saveIpAddress, async (req, res, next) => {
    console.log('Request received from IP address = ' + req.ipAddress + ' with linkedin URL = ' + req.query.linkedinUrl);

    if(!req.query.linkedinUrl)
        return res.json({error: 'A linkedin URL is required.'});

    try {
        const details = await linkedin.getCompanyOrPeopleDetails(req.query.linkedinUrl);
        //console.log(details);
        res.json({error: null, result: details});
        console.log('Response sent !');
    }
    catch(e) {
        console.error(e);
        Raven.captureException(e);
        res.json({error: 'Something went wrong...'});
    }
});

app.use('/assets', express.static('web/assets'));

console.log('Server started on port ' + config.serverPort + ', waiting for requests...');
app.listen(config.serverPort);

function saveIpAddress(req, res, next) {
    const ipAddress = (req.headers['x-forwarded-for'] || req.connection.remoteAddress).replace('::ffff:', '');
    ipAddresses[ipAddress] = (ipAddresses[ipAddress] || 0) + 1;
    console.log('Number of shots for this address : ' + ipAddresses[ipAddress]);
    if(ipAddresses[ipAddress] > 5)
        res.json({error: 'You have reached your maximum number of trials, contact me if you wish to work with me.'});
    else {
        req.ipAddress = ipAddress;
        next();
    }
}
