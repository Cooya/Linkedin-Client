module.exports = {
	env: {
		node: true,
		commonjs: true,
		browser: true,
		es6: true,
		mocha: true
	},
	extends: 'eslint:recommended',
	parserOptions: {
		ecmaVersion: 2018,
		sourceType: 'module'
	},
	rules: {
		indent: ['error', 'tab'],
		'linebreak-style': ['error', 'unix'],
		quotes: ['error', 'single', { allowTemplateLiterals: true }],
		semi: ['error', 'always'],
		'object-curly-spacing': ['error', 'always'],
		'function-paren-newline': ['error', 'never'],
		'one-var': 0,
		'one-var-declaration-per-line': 0,
		'newline-per-chained-call': 0,
		'line-comment-position': 0,
		'no-console': 0,
		'no-constant-condition': 0,
		'no-empty': 0
	}
};
