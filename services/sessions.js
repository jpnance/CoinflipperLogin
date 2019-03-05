const Link = require('../models/link');
const Session = require('../models/session');

module.exports.create = (request, response) => {
	if (!request.params.key) {
		response.status(400).send({ error: 'No key provided.' });
	}
	else {
		Link.findOneAndDelete({
			key: request.params.key
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
					cookie: Link.generateKey(32)
				});

				session.save((error) => {
					if (error) {
						response.status(500).send(error);
					}
					else {
						response.send(session);
					}
				});
			}
		});
	}
};
