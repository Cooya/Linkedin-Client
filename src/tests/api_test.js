const expect = require('chai').expect;
const request = require('supertest');
const simpleMock = require('simple-mock');

const { createApp } = require('../server');

describe('Linkedin client tests', () => {
	let app;

	before(async () => {
		app = createApp();
		simpleMock.mock(app.logger, 'info', () => {});
		simpleMock.mock(app.logger, 'error', () => {});
	});

	after(async () => {
		simpleMock.restore(app.logger, 'info');
		simpleMock.restore(app.logger, 'error');
	});

	it('No URL provided', done => {
		request(app)
			.get('/request')
			.end((err, res) => {
				expect(res.statusCode).to.equal(200);
				expect(res.body.error).to.have.string('A linkedin URL is required.');
				done();
			});
	});

	it('Invalid URL', done => {
		request(app)
			.get('/request?linkedinUrl=toto')
			.end((err, res) => {
				expect(res.statusCode).to.equal(200);
				expect(res.body.error).to.have.string('Invalid URL provided ("toto"), it must be a people profile URL or a company page URL.');
				done();
			});
	});

	it('Invalid linkedin URL', done => {
		request(app)
			.get('/request?linkedinUrl=https://www.linkedin.com/in/tototutu')
			.end((err, res) => {
				expect(res.statusCode).to.equal(200);
				expect(res.body.error).to.have.string('The people/company has not been found.');
				done();
			});
	});

	it('People profile without company', done => {
		request(app)
			.get('/request?linkedinUrl=https://www.linkedin.com/in/joana-ferraz-3388568b/')
			.end((err, res) => {
				expect(res.statusCode).to.equal(200);
				expect(res.body.error).to.equal(null);
				expect(res.body.result['firstName']).to.equal('Joana');
				done();
			});
	});

	it('People profile with company', done => {
		request(app)
			.get('/request?linkedinUrl=https://www.linkedin.com/in/alix-vandame/')
			.end((err, res) => {
				expect(res.statusCode).to.equal(200);
				expect(res.body.error).to.equal(null);
				expect(res.body.result['firstName']).to.equal('Alix');
				expect(res.body.result['lastName']).to.equal('Vandame');
				expect(res.body.result['headline']).to.equal('Helping great tech talents finding great jobs !');
				expect(res.body.result['summary'].length).to.be.not.equal(0);
				expect(res.body.result['location']).to.equal('Paris Area, France');
				expect(res.body.result['industry']).to.equal('Internet');
				expect(res.body.result['education'].length).to.equal(4);
				expect(res.body.result['languages'].length).to.equal(3);
				expect(res.body.result['positions'].length).to.equal(6);
				expect(res.body.result['skills'].length).to.equal(20);
				expect(res.body.result['linkedinUrl']).to.equal('https://www.linkedin.com/in/alix-vandame/');
				done();
			});
	});

	it('Private people profile', done => {
		request(app)
			.get('/request?linkedinUrl=https://www.linkedin.com/in/benoitgantaume/')
			.end((err, res) => {
				expect(res.statusCode).to.equal(200);
				expect(res.body.error).to.equal(null);
				expect(res.body.result['firstName']).to.equal('Benoit');
				expect(res.body.result['lastName']).to.equal('Gantaume');
				done();
			});
	});

	it('Company page', done => {
		const url = 'https://www.linkedin.com/company/talent-io';
		request(app)
			.get('/request?linkedinUrl=' + url)
			.end((err, res) => {
				expect(res.statusCode).to.equal(200);
				expect(res.body.error).to.equal(null);
				expect(res.body.result['linkedinUrl']).to.equal(url);
				expect(res.body.result['name']).to.equal('talent.io');
				expect(res.body.result['tagline']).to.equal('Great jobs for great developers');
				expect(res.body.result['description'].length).to.be.not.equal(0);
				expect(res.body.result['website']).to.equal('https://www.talent.io/');
				expect(res.body.result['industry']).to.equal('Internet');
				expect(res.body.result['companySize']).to.equal('51-200 employees');
				expect(res.body.result['headquarters']).to.deep.equal({
					country: 'FR',
					geographicArea: 'Île-de-France',
					city: 'Paris',
					line1: '18, Rue de Londres'
				});
				expect(res.body.result['companyType']).to.equal('Partnership');
				expect(res.body.result['foundedYear']).to.equal(2015);
				expect(res.body.result['specialties'].length).to.equal(4);

				expect(res.body.result['followers']).to.be.at.least(8500);
				expect(res.body.result['membersOnLinkedin']).to.be.at.least(100);
				done();
			});
	});

	it('Company page with a lot of followers and members on Linkedin', done => {
		const url = 'https://www.linkedin.com/company/microsoft';
		request(app)
			.get('/request?linkedinUrl=' + url)
			.end((err, res) => {
				expect(res.statusCode).to.equal(200);
				expect(res.body.error).to.equal(null);
				expect(res.body.result['name']).to.equal('Microsoft');
				expect(res.body.result['companySize']).to.equal('10001+ employees');
				expect(res.body.result['followers']).to.be.at.least(7000000);
				expect(res.body.result['membersOnLinkedin']).to.be.at.least(160000);
				done();
			});
	});
});
