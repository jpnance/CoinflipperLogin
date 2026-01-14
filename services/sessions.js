const Link = require('../models/link');
const Session = require('../models/session');
const User = require('../models/user');

module.exports.create = (request, response) => {
	if (!request.params.linkKey) {
		response.status(400).send({ error: 'No magic link key provided.' });
	}
	else {
		Link.findOne({
			key: request.params.linkKey
		}).then((link) => {
			if (!link) {
				if (request.session) {
					// Already logged in, no need to show an error
					response.redirect('/');
				}
				else {
					response.status(404).render('sessions/expired');
				}
			}
			else {
				var session = new Session({
					user: link.user,
					key: Link.generateKey(32)
				});

				session.save().then(() => {
					if (link.tokenCallbackUrl) {
						const tokenCallbackUrl = new URL(link.tokenCallbackUrl);

						const params = { token: session.key };

						if (link.redirectTo) {
							params.redirectTo = link.redirectTo;
						}

						tokenCallbackUrl.search = new URLSearchParams(params);

						response.redirect(tokenCallbackUrl.toString());
					}
					else {
						response.cookie('sessionKey', session.key, { domain: process.env.COOKIE_DOMAIN, expires: new Date('2038-01-01'), secure: true, httpOnly: true })
						if (link.redirectTo) {
							response.redirect(link.redirectTo);
						}
						else {
							response.send(session);
						}
					}
				}).catch((error) => {
					response.status(500).send(error);
				});
			}
		}).catch((error) => {
			response.status(400).send(error);
		});
	}
};

module.exports.delete = (request, response) => {
	if (!request.params.key && !request.cookies.sessionKey) {
		response.status(400).send({ error: 'No session key provided.' });
	}
	else {
		var sessionKey = request.params.key || request.cookies.sessionKey;

		Session.deleteOne({ key: sessionKey }).then((stats) => {
			if (stats.deletedCount == 0) {
				response.status(404).send({ error: 'No session found for that key.' });
			}
			else {
				response.clearCookie('sessionKey');

				if (request.headers.referer && request.headers.referer.startsWith('https://')) {
					var sanitizedReferer = request.headers.referer.split('/').slice(0, 3).join('/');
					response.redirect(sanitizedReferer);
				}
				else {
					response.status(200).send({});
				}
			}
		}).catch((error) => {
			response.status(500).send(error);
		});
	}
};

module.exports.deleteAll = (request, response) => {
	if (!request.params.key && !request.cookies.sessionKey) {
		response.status(400).send({ error: 'No session key provided.' });
	}
	else {
		var sessionKey = request.params.key || request.cookies.sessionKey;

		Session.findOne({ key: sessionKey }).then((session) => {
			if (!session) {
				response.status(404).send({ error: 'No session found for that key.' });
			}
			else {
				Session.deleteMany({ user: session.user }).then((stats) => {
					response.clearCookie('sessionKey');

					if (request.headers.referer && request.headers.referer.startsWith('https://')) {
						var sanitizedReferer = request.headers.referer.split('/').slice(0, 3).join('/');
						response.redirect(sanitizedReferer);
					}
					else {
						response.status(200).send({});
					}
				}).catch((error) => {
					response.status(500).send(error);
				});
			}
		}).catch((error) => {
			response.status(500).send(error);
		});
	}
};

module.exports.retrieve = (request, response) => {
	if (!request.body.key) {
		response.status(400).send({ error: 'No session key provided.' });
	}
	else {
		Session.findOneAndUpdate({ key: request.body.key }, { '$set': { lastActivity: Date.now() } }).populate('user').populate('pretendingToBe').then((session) => {
			if (!session) {
				response.send(null);
			}
			else {
				// If pretending to be someone, return that user instead
				if (session.pretendingToBe) {
					var pretendSession = session.toObject();
					pretendSession.user = session.pretendingToBe;
					response.send(pretendSession);
				}
				else {
					response.send(session);
				}
			}
		}).catch((error) => {
			response.status(500).send(error);
		});
	}
};

module.exports.showAll = (request, response) => {
	if (!request.cookies.sessionKey) {
		response.status(401).send({ error: 'You must be logged in to view this page.' });
	}

	var dataPromises = [
		Session.findOne({ key: request.cookies.sessionKey }).populate('user'),
		Session.find({}).populate('user')
	];

	Promise.all(dataPromises).then(function(values) {
		var adminSession = values[0];
		var allSessions = values[1];

		if (!adminSession || !adminSession.user || !adminSession.user.admin) {
			response.status(403).send({ error: 'You are not authorized to view this page.' });
		}

		var sessionMap = {};

		allSessions.forEach(session => {
			if (!sessionMap[session.user.username]) {
				sessionMap[session.user.username] = [];
			}

			sessionMap[session.user.username].push(session.lastActivity);
		});

		response.send(sessionMap);
	});
};

