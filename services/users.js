const User = require('../models/user');

module.exports.create = (request, response) => {
	if (!request.body.email) {
		response.status(400).send({ error: 'No email address provided.' });
	}
	else if (!User.validateEmail(request.body.email)) {
		response.status(400).send({ error: 'Invalid email address provided.' });
	}
	else {
		var user = new User({
			email: request.body.email,
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
