const sleep = require('sleep');

const linkedin = require('./linkedin');
const pup = require('./pup_utils');
const config = require('./assets/config');

const startingPointUrl = 'https://www.linkedin.com/in/nicomarcy/';
let peopleToVisit = [startingPointUrl];
let index = 0;

(async function main() {
    const browser = await pup.runBrowser();
    const page = await pup.createPage(browser, config.cookiesFile);

    let peopleDetails;
    while(index < peopleToVisit.length) {
        peopleDetails = await linkedin.getCompanyOrPeopleDetails(peopleToVisit[index], {page: page, forcePeopleScraping: true});
        console.log(peopleDetails);
        for(let relatedPeople of peopleDetails['relatedPeople'])
            if(peopleToVisit.indexOf(relatedPeople['linkedinUrl']) == -1)
                peopleToVisit.push(relatedPeople['linkedinUrl']);
        console.log(peopleToVisit);
        index++;
        console.log('Sleeping...');
        sleep.msleep(20000);
    }

    await browser.close();
})();