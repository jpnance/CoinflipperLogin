const dotenv = require('dotenv').config({ path: '/app/.env' });

const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 3000;

const allowedDomains = process.env.ALLOWED_DOMAINS.split(/,/);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

const allowCoinflipperSites = (request, response, next) => {
	if (allowedDomains.includes(request.headers.origin)) {
		response.set('Access-Control-Allow-Origin', request.headers.origin);
	}

	next();
};

app.use(allowCoinflipperSites);

const mongoose = require('mongoose');
const mongoUri = process.env.MONGODB_URI || null;

mongoose.connect(mongoUri);

const users = require('./services/users');
const links = require('./services/links');
const sessions = require('./services/sessions');

app.get('/', (request, response) => {
	response.send('Hello, world!');
});

app.get('/users', users.showAll);
app.post('/users/create', users.create);
app.get('/users/retrieve/:email', users.retrieve);

app.post('/links/create', links.create);

app.get('/sessions', sessions.showAll);
app.post('/sessions/retrieve', sessions.retrieve);
app.get('/sessions/create/:linkKey', sessions.create);
app.get('/sessions/delete', sessions.delete);
app.get('/sessions/delete/:key', sessions.delete);
app.get('/sessions/deleteAll', sessions.deleteAll);
app.get('/sessions/deleteAll/:key', sessions.deleteAll);
app.get('/sessions/pretend/:username', sessions.pretend);

if (process.env.NODE_ENV == 'dev') {
	const fs = require('fs');
	const https = require('https');

	const options = {
		key: fs.readFileSync('../ssl/server.key'),
		cert: fs.readFileSync('../ssl/server.crt'),
		requestCert: false,
		rejectUnauthorized: false
	};

	const server = https.createServer(options, app);

	server.listen(port, () => {
		console.log('Listening on port', port);
	});
}
else {
	app.listen(port, () => {
		console.log('Listening on port', port);
	});
}
