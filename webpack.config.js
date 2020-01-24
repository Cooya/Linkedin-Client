// browserify -> reactify -> babelify :
// ./node_modules/.bin/browserify app.jsx -t reactify -t babelify --outfile app.js

const path = require('path');

module.exports = {
	entry: './web/app.jsx',
	output: {
		path: path.resolve(__dirname, 'web/assets'),
		filename: 'bundle.js'
	},
	module: {
		rules: [
			{
				test: /\.jsx$/,
				exclude: /node_modules/,
				loader: 'babel-loader',
				query: {
					presets: ['es2015', 'react']
				}
			},
			{
				test: /\.css$/,
				use: ['style-loader', 'css-loader']
			},
			{
				test: /\.scss$/,
				use: ['style-loader', 'css-loader', 'sass-loader']
			}
		]
	},
	//mode: 'development',
	//watch: true,
	watchOptions: {
		poll: 1000
	}
};
