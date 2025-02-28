const dotenv = require('dotenv').config({ path: '/app/.env' });

const mongoose = require('mongoose');
const mongoUri = 'mongodb://login-mongo:27017/test';

mongoose.connect(mongoUri);

const Link = require('./models/link');
const Session = require('./models/session');
const User = require('./models/user');

const users = require('./services/users');
const links = require('./services/links');
const sessions = require('./services/sessions');

const mockRequest = (data) => {
	const request = {
		body: {},
		cookies: {},
		get: () => process.env.ADMIN_KEY,
		headers: {},
		params: {},
	};

	Object.assign(request, data);

	return request;
};

const mockResponse = () => {
	const response = {};

	const { promise, resolve: fulfill, reject } = Promise.withResolvers();

	response.clearCookie = () => {};

	response.cookie = () => {};

	response.done = promise;

	response.send = (data) => {
		fulfill(data);
	};

	response.status = () => response;

	return response;
};

const resetDatabase = Promise.allSettled([
	Link.collection.drop(),
	Session.collection.drop(),
	User.collection.drop()
]);

const createDefaultUser = () => {
	const request = mockRequest({
		body: {
			email: 'jpnance@gmail.com',
			username: 'jpnance',
			name: {
				first: 'Patrick',
				last: 'Nance',
				nick: 'Patrick'
			}
		}
	});

	const response = mockResponse();

	users.create(request, response);

	return response.done;
};

const askForMagicLink = (user) => {
	const request = mockRequest({
		body: {
			email: user.email
		}
	});

	const response = mockResponse();

	links.create(request, response);

	return response.done;
};

const askForMagicLinkWithNoEmail = (user) => {
	const request = mockRequest();

	const response = mockResponse();

	links.create(request, response);

	return response.done;
};

const askForMagicLinkWithInvalidEmail = (user) => {
	const request = mockRequest({
		body: {
			email: 'aoeu@aoeu.com'
		}
	});

	const response = mockResponse();

	links.create(request, response);

	return response.done;
};

const clickMagicLink = (link) => {
	const request = mockRequest({
		params: {
			linkKey: link.key
		}
	});

	const response = mockResponse();

	sessions.create(request, response);

	return response.done;
};

const retrieveSession = (session) => {
	const request = mockRequest({
		body: {
			key: session.key
		}
	});

	const response = mockResponse();

	sessions.retrieve(request, response);

	return response.done;
};

const expectActiveSession = (session) => {
	if (session.error) {
		return Promise.reject({
			error: 'Encountered an error when we expected to see an active session',
			session: session
		});
	}

	return Promise.resolve(session);
};

const logOut = (session) => {
	const request = mockRequest({
		cookies: {
			sessionKey: session.key
		}
	});

	const response = mockResponse();

	sessions.delete(request, response);

	return response.done.then(() => Promise.resolve(session));
};

const expectInactiveSession = (session) => {
	if (!session.error) {
		return Promise.reject({
			error: 'Found an active session when we expected to see an inactive session',
			session: session
		});
	}

	return Promise.resolve(session);
};

const expectNoLink = (link) => {
	if (!link.error) {
		return Promise.reject({
			error: 'We didn\'t expect to get a valid magic link back but we did',
			link: link
		});
	}

	return Promise.resolve(link);
};

const disconnectAndExit = (data) => {
	console.log();
	mongoose.disconnect();
};

const displayErrorAndExit = (error) => {
	console.log(error);
	mongoose.disconnect();
};

const print = (message) => {
	return () => {
		console.log(message);
	};
};

const test = (testPromise, description) => {
	return testPromise
		.then(print(`✓ ${description}`))
		.catch(print(`× ${description}`));
};

const testHappyPath =
	resetDatabase
		.then(createDefaultUser)
		.then(askForMagicLink)
		.then(clickMagicLink)
		.then(retrieveSession)
		.then(expectActiveSession)
		.then(logOut)
		.then(retrieveSession)
		.then(expectInactiveSession);

const testNoEmailProvided =
	resetDatabase
		.then(createDefaultUser)
		.then(askForMagicLinkWithNoEmail)
		.then(expectNoLink);

const testInvalidEmailProvided =
	resetDatabase
		.then(createDefaultUser)
		.then(askForMagicLinkWithInvalidEmail)
		.then(expectNoLink);

test(testHappyPath, 'happy path works')
	.then(test(testNoEmailProvided, 'no email'))
	.then(test(testInvalidEmailProvided, 'invalid email'))
	.then(resetDatabase)
	.then(disconnectAndExit);
