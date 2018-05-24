const sleep = require('sleep');
const mongoose = require('mongoose');

const linkedin = require('./linkedin');
const pup = require('./pup_utils');
const config = require('./assets/config');

const startingPointUrl = 'https://www.linkedin.com/in/nicomarcy/';

const People = mongoose.model('People', new mongoose.Schema({
    linkedinUrl: {
        type: String,
        required : true,
        unique: true
    },
    processed: {
        type: Boolean,
        required: true
    }
}));

(async function main() {
    try {
        await mongoose.connect('mongodb://localhost/test');
    }
    catch(e) {
        console.error(e);
        process.exit(1);
    }

    const browser = await pup.runBrowser();
    const page = await pup.createPage(browser, config.cookiesFile);

    let peopleDetails;
    let people = new People({
        linkedinUrl: startingPointUrl,
        processed: false
    });
    while(people) {
        console.log('Retrieving data from the current people to process...');
        peopleDetails = await linkedin.getCompanyOrPeopleDetails(people.linkedinUrl, {page: page, forcePeopleScraping: true});
        //console.log(peopleDetails);

        console.log('Saving related people in database...');
        for(let relatedPeople of peopleDetails['relatedPeople']) {
            try {
                await (new People({
                    linkedinUrl: relatedPeople['linkedinUrl'],
                    processed: false
                })).save();
            }
            catch(e) {
                console.error(e);
            }
        }

        console.log('Marking as processed the last processed people...');
        try {
            people.procesed = true;
            await people.save();
        }
        catch(e) {
            console.error(e);
            process.exit();
        }

        console.log('Fetching the next one people to process...');
        people = await People.findOne({processed: false});
        console.log('Sleeping...');
        sleep.msleep(60000);
    }

    await browser.close();
})();