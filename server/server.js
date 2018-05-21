const express = require('express');
const linkedin = require('./linkedin');
const Raven = require('raven');

const config = require('./assets/config.js');
Raven.config(config.sentryEndpoint, {
    shouldSendCallback: (data) => {
        return process.env.NODE_ENV == 'production'
    }
}).install();
const app = express();
const ipAddresses = {};

process.on('uncaughtException', (e) => {

});
process.on('unhandledRejection', (e) => {

});

app.get('/', (req, res, next) => {
    res.sendFile(config.rootWebFolder + 'index.html');
});

app.get('/request', saveIpAddress, async (req, res, next) => {
    console.log('Request received from IP address = ' + req.ipAddress + ' with linkedin URL = ' + req.query.linkedinUrl);

    if(!req.query.linkedinUrl)
        return res.json({error: 'A linkedin URL is required.'});

    try {
        const details = await linkedin.getCompanyOrPeopleDetails(req.query.linkedinUrl);
        //console.log(details);
        if(details['error'])
            res.json({error: details['error'], result: null});
        else
            res.json({error: null, result: details});
        console.log('Response sent !');
    }
    catch(e) {
        console.error(e);
        res.json({error: 'Something went wrong...'});
    }
});

if(process.env.NODE_ENV == 'test')
    module.exports = app;
else {
    app.use('/assets', express.static(config.webAssetsFolder));

    console.log('Server started on port ' + config.serverPort + ', waiting for requests...');
    app.listen(config.serverPort);
}

function saveIpAddress(req, res, next) {
    const ipAddress = (req.headers['x-forwarded-for'] || req.connection.remoteAddress).replace('::ffff:', '');
    ipAddresses[ipAddress] = (ipAddresses[ipAddress] || 0) + 1;
    console.log('Number of shots for this address : ' + ipAddresses[ipAddress]);
    if(req.query.token != config.adminToken && ipAddresses[ipAddress] > 10)
        res.json({error: 'You have reached your maximum number of trials, contact me if you wish to work with me.'});
    else {
        if(req.query.token == config.adminToken)
            console.log('Valid token admin provided.');
        req.ipAddress = ipAddress;
        next();
    }
}
