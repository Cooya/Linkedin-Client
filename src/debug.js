const linkedin = require('./linkedin_v2');

(async () => {
	const details = await linkedin.getCompanyOrPeopleDetails('https://www.linkedin.com/company/talent-io');
	//const details = await linkedin.getCompanyOrPeopleDetails('https://www.linkedin.com/in/alix-vandame/');
	//const details = await linkedin.getCompanyOrPeopleDetails('https://www.linkedin.com/company/microsoft');
	console.log(details);
})();
