const Link = require('../models/link');
const User = require('../models/user');

module.exports.create = (request, response) => {
	if (!request.body.email) {
		response.status(400).send({ error: 'No email address provided.' });
	}
	else {
		User.findOne({
			email: request.body.email
		}, (error, user) => {
			if (error) {
				response.status(400).send(error);
			}
			else if (!user) {
				response.status(404).send({ error: 'No user with that email address.' });
			}
			else {
				var link = new Link({
					key: Link.generateKey(),
					user: user._id
				});

				link.save((error) => {
					if (error) {
						response.status(400).send(error);
					}
					else {
						response.send(link);
					}
				});
			}
		});
	}
};
