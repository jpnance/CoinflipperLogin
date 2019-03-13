const Link = require('../models/link');
const Session = require('../models/session');

module.exports.create = (request, response) => {
	if (!request.params.linkKey) {
		response.status(400).send({ error: 'No magic link key provided.' });
	}
	else {
		Link.findOneAndDelete({
			key: request.params.linkKey
		}, (error, link) => {
			if (error) {
				response.status(400).send(error);
			}
			else if (!link) {
				response.status(404).send({ error: 'No magic link found for that key.' });
			}
			else {
				var session = new Session({
					user: link.user,
					key: Link.generateKey(32)
				});

				session.save((error) => {
					if (error) {
						response.status(500).send(error);
					}
					else {
						response.cookie('sessionKey', session.key, { domain: 'dev.coinflipper.org', expires: new Date('2038-01-01') }).send(session);
					}
				});
			}
		});
	}
};

module.exports.retrieve = (request, response) => {
	if (!request.params.key) {
		response.status(400).send({ error: 'No session key provided.' });
	}
	else {
		Session.findOne({ key: request.params.key }).populate('user').exec((error, session) => {
			if (error) {
				response.status(500).send(error);
			}
			else if (!session) {
				response.status(404).send({ error: 'No session found for that key.' });
			}
			else {
				response.send(session);
			}
		});
	}
};
