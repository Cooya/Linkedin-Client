import 'whatwg-fetch'
import React from 'react';
import ReactDOM from 'react-dom';

import './assets/custom.scss';

class LinkedinForm extends React.Component {
	constructor(props) {
		super(props);
		this.state = { linkedinUrl: '', error: null, result: null, loading: false };
		this.handleUrlChange = this.handleUrlChange.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);
	}

	handleUrlChange(event) {
		this.setState({
			linkedinUrl: event.target.value
		});
	}

	handleSubmit(event) {
		event.preventDefault();
		if (!this.state.linkedinUrl)
			return;

		this.setState({
			error: null,
			result: null,
			loading: true
		});

		const token = new URL(window.location.href).searchParams.get('token');
		const endpoint = '/request?linkedinUrl=' + this.state.linkedinUrl + (token ? '&token=' + token : '');
		fetch(endpoint, {
			method: 'GET',
			credentials: 'same-origin'
		}).then((response) => {
			if (response.status !== 200) {
				return response.text().then((text) => {
					this.setState({
						error: text,
						result: null,
						loading: false
					});
				});
			}
			else {
				return response.json().then((json) => {
					this.setState({
						error: json['error'],
						result: json['result'],
						loading: false
					});
				});
			}
		}, (error) => {
			this.setState({
				error: error.message,
				result: null,
				loading: false
			});
		})
	}

	render() {
		const loading = this.state.loading ? <div>
			<p style={{ textAlign: 'center', marginTop: '50px' }}>Retrieving data... It will take a few seconds.</p>
			<div className="spinner" style={{ margin: '10px auto' }}>
				<div className="double-bounce1" />
				<div className="double-bounce2" />
			</div>
		</div> : null;

		return <div>
			<section className="hero is-linkedin">
				<div className="hero-body">
					<div className="container has-text-centered">
						<h1 className="title">
							Linkedin Client Demo
                        </h1>
						<h2 className="subtitle">
							Data scraping tool prototype
                        </h2>
					</div>
				</div>
			</section>
			<section>
				<div className="column box is-half is-offset-one-quarter content" style={{ 'marginTop': '50px' }}>
					<p>
						Submit a company page or people profile URL and data will be extracted and displayed. This a demonstration tool, you got 10 shots.
					</p>
					<p>
						The tool does not use the LinkedIn API or any headless web browser, a simple HTTP request is sent and followed by some HTML parsing.
						As of now, you can :
						<ul>
							<li>retrieve people details from an individual profile</li>
							<li>retrieve company details from a company page</li>
							<li>guess people's email address through a third-party API (not available in this demonstration)</li>
						</ul>
					</p>
					<p>
						If you are interested by retrieving data from Linkedin, to complete your leads file for instance, feel free to <a href="http://cooya.fr">contact me</a>.
                    </p>
					<form onSubmit={this.handleSubmit}>
						<div className="field is-grouped">
							<div className="control is-expanded">
								<input className="input" type="text" value={this.state.linkedinUrl} onChange={this.handleUrlChange} placeholder="Company page or people profile URL" />
							</div>
							<div className="control">
								<input type="submit" className="button is-linkedin" value="Submit" disabled={this.state.loading} />
							</div>
						</div>
					</form>
				</div>
			</section>
			<section>
				{loading}
				<JsonDisplay data={this.state.result} />
				<Message error={this.state.error} />
			</section>
		</div>;
	}
}

class JsonDisplay extends React.Component {
	constructor(props) {
		super(props);
	}

	render() {
		if (!this.props.data)
			return null;
		return <div className="column box is-half is-offset-one-quarter content" style={{ 'marginTop': '20px', 'padding': '0' }}>
			<pre><code>{JSON.stringify(this.props.data, null, 4)}</code></pre>
		</div>;
	}
}

class Message extends React.Component {
	constructor(props) {
		super(props);
	}

	render() {
		if (!this.props.error)
			return null;
		return <div className="column box is-half is-offset-one-quarter content" style={{ 'marginTop': '20px', 'padding': '0' }}>
			<div className="notification is-danger">{this.props.error}</div>
		</div>;
	}
}

ReactDOM.render(<LinkedinForm />, document.getElementById('app'));
