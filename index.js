const config = require('./assets/config.json');

const Linkedin = require('node-linkedin')(config.linkedinApiKey, config.linkedinApiSecret);

const linkedin = Linkedin.init(config.linkedinApiToken);
linkedin.people.url('https://www.linkedin.com/in/amer-kayyal-0a2127125/', ['headline', 'summary', 'positions', 'email-address'], (err, user) => {
    if(err) console.error(err);
    else console.log(JSON.stringify(user, null, 4));
});
