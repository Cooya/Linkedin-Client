import 'whatwg-fetch'
import React from 'react';
import ReactDOM from 'react-dom';

import './assets/custom.scss';

class LinkedinForm extends React.Component {
    constructor(props) {
        super(props);
        this.state = {linkedinUrl: '', error: null, result: null, loading: false};
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
        if(!this.state.linkedinUrl)
            return;

        this.setState({
            error: null,
            result: null,
            loading: true
        });

        fetch('/?url=' + this.state.linkedinUrl, {
            method: 'GET',
            credentials: 'same-origin'
        }).then((response) => {
            const hasFailed = response.status !== 200;
            this.setState({
                error: hasFailed ? response.text() : null,
                result: !hasFailed ? response.text() : null,
                loading: false
            });
        }, (error) => {
            this.setState({
                error: error.message,
                result: null,
                loading: false
            });
        })
    }

    render() {
        const loading = this.state.loading ? <div className="spinner">
            <div className="double-bounce1"/>
            <div className="double-bounce2"/>
        </div> : null;

        return <div>
            <section className="hero is-linkedin">
                <div className="hero-body">
                    <div className="container has-text-centered">
                        <h1 className="title">
                            Linkedin Scraper Demo
                        </h1>
                        <h2 className="subtitle">
                            Data scraping tool prototype
                        </h2>
                    </div>
                </div>
            </section>
            <section>
                <div className="column box is-half is-offset-one-quarter content" style={{'marginTop': '50px'}}>
                    <p>Submit a company page or people profile URL and data will be scrapped and displayed. This a demonstration tool, you got 3 shots.</p>
                    <p>This tool is using either the Linkedin API for people profiles or a headless browser for company pages.
                        If you are interested by retrieving data from Linkedin, to complete your leads file for instance, feel free to contact me.</p>
                    <form onSubmit={this.handleSubmit}>
                        <div className="field is-grouped">
                            <div className="control is-expanded">
                                <input className="input" type="text" value={this.state.linkedinUrl} onChange={this.handleUrlChange} placeholder="Company or people profile URL"/>
                            </div>
                            <div className="control">
                                <input type="submit" className="button is-linkedin" value="Submit"/>
                            </div>
                        </div>
                    </form>
                </div>
            </section>
            <section>
                {loading}
                <DataArray data={this.state.result}/>
                <Message error={this.state.error}/>
            </section>
        </div>;
    }
}

class DataArray extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        if(this.props.data)
            return null;
        return <div/>; // TODO
    }
}

class Message extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        if(!this.props.error)
            return null;
        return <div className="column is-half is-offset-one-quarter content" style={{'marginTop': '20px', 'padding': '0'}}>
            <div className="notification is-danger">
                {this.props.error}
            </div>
        </div>;
    }
}

ReactDOM.render(<LinkedinForm/>, document.getElementById('app'));
