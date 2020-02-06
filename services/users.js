const User = require('../models/user');

module.exports.create = (request, response) => {
	var adminKey = request.get('Coinflipper-Api-Key');

	if (!adminKey || adminKey != process.env.ADMIN_KEY) {
		response.status(401).send({ error: 'No authorization key provided.' });
	}
	else if (!request.body.email) {
		response.status(400).send({ error: 'No email address provided.' });
	}
	else if (!User.validateEmail(request.body.email)) {
		response.status(400).send({ error: 'Invalid email address provided.' });
	}
	else {
		var user = new User({
			email: request.body.email,
			username: request.body.username,
			name: {
				first: request.body.name.first,
				last: request.body.name.last,
				nick: request.body.name.nick
			},
			admin: false
		});

		user.save((error) => {
			if (error) {
				response.status(500).send(error);
			}
			else {
				response.send(user);
			}
		});
	}
};

module.exports.retrieve = (request, response) => {
	var adminKey = request.get('Coinflipper-Api-Key');

	if (!adminKey || adminKey != process.env.ADMIN_KEY) {
		response.status(401).send({ error: 'No authorization key provided.' });
	}
	else if (!request.params.email) {
		response.status(400).send({ error: 'No email address provided.' });
	}
	else {
		var user = User.findOne({ email: request.params.email }, (error, user) => {
			if (error) {
				response.status(500).send(error);
				return;
			}
			else if (!user) {
				response.status(404).send({ message: 'No user found with that email address.' });
				return;
			}
			else {
				response.send(user);
			}
		})
	}
};
