const dotenv = require('dotenv').config({ path: '/app/.env' });

const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const app = express();
const port = process.env.PORT || 3000;

const allowedDomains = process.env.ALLOWED_DOMAINS.split(/,/);

// Static files
app.use(express.static(__dirname + '/public'));
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist'));
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// View engine
app.set('view engine', 'pug');

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

const links = require('./services/links');
const sessions = require('./services/sessions');
const { attachSession } = require('./auth/middleware');

// API routes
app.post('/links/create', links.create);

app.get('/sessions', sessions.showAll);
app.post('/sessions/retrieve', sessions.retrieve);
app.get('/sessions/create/:linkKey', attachSession, sessions.create);
app.get('/sessions/delete', sessions.delete);
app.get('/sessions/delete/:key', sessions.delete);
app.get('/sessions/deleteAll', sessions.deleteAll);
app.get('/sessions/deleteAll/:key', sessions.deleteAll);

// Web UI routes
require('./routes')(app);

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

process.on('SIGTERM', () => {
	console.log('SIGTERM received, shutting down...');
	server.close(() => {
		mongoose.connection.close(false).then(() => {
			console.log('Closed out remaining connections');
			process.exit(0);
		});
	});
});
