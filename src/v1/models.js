const mongoose = require('mongoose');

const PeopleToProcess = mongoose.model('PeopleToProcess', new mongoose.Schema({
	linkedinUrl: {
		type: String,
		required: true,
		unique: true
	},
	processed: {
		type: Boolean,
		required: true
	}
}));

const companySchema = new mongoose.Schema({
	linkedinUrl: {
		type: String,
		required: true,
		sparse: true
	},
	name: {
		type: String,
		required: true
	},
	industry: {
		type: String,
		required: true
	},
	description: {
		type: String,
		required: false
	},
	website: {
		type: String,
		required: false
	},
	headquarters: {
		type: String,
		required: false
	},
	foundedYear: {
		type: Number,
		required: false
	},
	companyType: {
		type: String,
		required: false
	},
	companySize: {
		type: Number,
		required: false
	},
	specialties: {
		type: String,
		required: false
	},
	followers: {
		type: Number,
		required: true
	},
	membersOnLinkedin: {
		type: Number,
		required: false
	}
});

companySchema.pre('validate', function(next) {
	const docKeys = Object.keys(this.toObject()); // new Object(this) is not working
	for (let schemaKey in companySchema.obj)
		if (!docKeys.includes(schemaKey)) return next(new Error('"' + schemaKey + '" key is required.'));
	next();
});

const Company = mongoose.model('Company', companySchema);

const People = mongoose.model('People', new mongoose.Schema({
	linkedinUrl: {
		type: String,
		required: true,
		unique: true
	},
	firstName: {
		type: String,
		required: true
	},
	lastName: {
		type: String,
		required: true
	},
	headline: {
		type: String,
		required: true
	},
	location: {
		type: String,
		required: true
	},
	summary: {
		type: String,
		validate: {
			validator: (v) => {
				return v != null;
			}
		},
		required: false
	},
	currentCompany: {
		type: Object,
		required: function() {
			return this.positions.length;
		}
	},
	school: {
		type: String,
		required: false
	},
	connectionsNumber: {
		type: Number,
		required: true
	},
	positions: {
		type: Array,
		required: true
	},
	relatedPeople: {
		type: Array,
		required: true
	},
	company: {
		type: companySchema,
		required: function() {
			return (
				this.positions.length &&
				this.positions[0]['linkedinUrl'].includes('https://www.linkedin.com/company/')
			);
		}
	}
}));

module.exports = {
	PeopleToProcess: PeopleToProcess,
	Company: Company,
	People: People
};
