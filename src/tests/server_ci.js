const server = require('../server');
const chai = require('chai');
const request = require('supertest');

const expect = chai.expect;

describe('Linkedin scraper form tests', () => {
	let app = server.app;

	before(async () => {
		await server.linkedin.init();
	});

	it('Invalid URL', (done) => {
		const url = 'toto';
		request(app)
			.get('/request?linkedinUrl=' + url)
			.end((err, res) => {
				expect(res.statusCode).to.equal(200);
				expect(res.body.error).to.have.string('Public profile URL is not correct');
				done();
			});
	});

	it('Invalid linkedin URL', (done) => {
		const url = 'https://www.linkedin.com/in/toto';
		request(app)
			.get('/request?linkedinUrl=' + url)
			.end((err, res) => {
				expect(res.statusCode).to.equal(200);
				expect(res.body.error).to.have.string("Couldn't find member");
				done();
			});
	});

	it('People profile without company', (done) => {
		const url = 'https://www.linkedin.com/in/joana-ferraz-3388568b/';
		request(app)
			.get('/request?linkedinUrl=' + url)
			.end((err, res) => {
				expect(res.statusCode).to.equal(200);
				expect(res.body.error).to.equal(null);
				expect(res.body.result['firstName']).to.equal('Joana');
				done();
			});
	});

	it('People profile with company', (done) => {
		const url = 'https://www.linkedin.com/in/alix-vandame/';
		request(app)
			.get('/request?linkedinUrl=' + url)
			.end((err, res) => {
				expect(res.statusCode).to.equal(200);
				expect(res.body.error).to.equal(null);
				expect(res.body.result['firstName']).to.equal('Alix');
				expect(res.body.result['company']['name']).to.equal('talent.io');
				expect(res.body.result['company']['foundedYear']).to.equal(2015);
				done();
			});
	});

	it('Private people profile', (done) => {
		const url = 'https://www.linkedin.com/in/benoitgantaume/';
		request(app)
			.get('/request?linkedinUrl=' + url)
			.end((err, res) => {
				expect(res.statusCode).to.equal(200);
				expect(res.body.error).to.equal(null);
				expect(res.body.result['firstName']).to.equal('Benoit');
				expect(res.body.result['positions'][0]['companyName']).to.equal('artisandeveloppeur.fr');
				done();
			});
	});

	it('Company page', (done) => {
		const url = 'https://www.linkedin.com/company/talent-io';
		request(app)
			.get('/request?linkedinUrl=' + url)
			.end((err, res) => {
				expect(res.statusCode).to.equal(200);
				expect(res.body.error).to.equal(null);
				expect(res.body.result['linkedinUrl']).to.equal(url);
				expect(res.body.result['name']).to.equal('talent.io');
				expect(res.body.result['description'].length).to.be.not.equal(0);
				expect(res.body.result['website']).to.equal('https://www.talent.io/');
				expect(res.body.result['industry']).to.equal('Internet');
				expect(res.body.result['companySize']).to.equal('51-200 employees');
				expect(res.body.result['headquarters']).to.equal('Paris, Île-de-France');
				expect(res.body.result['companyType']).to.equal('Partnership');
				expect(res.body.result['foundedYear']).to.equal(2015);
				expect(res.body.result['specialties']).to.equal(
					'Startup, Recruiting, Tech Recruiting, and Software Engineers'
				);

				expect(Number.isInteger(res.body.result['followers'])).to.be.true;
				expect(Number.isInteger(res.body.result['membersOnLinkedin'])).to.be.true;
				done();
			});
	});
});
