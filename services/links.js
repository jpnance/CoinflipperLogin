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
					key: Link.generateKey(6),
					user: user._id
				});

				if (request.body.redirectTo) {
					link.redirectTo = request.body.redirectTo;
				}

				link.save((error) => {
					if (error) {
						response.status(400).send(error);
					}
					else if (request.body.sendLoginLink) {
						const nodemailer = require('nodemailer').createTransport({
							host: 'smtp.gmail.com',
							port: 465,
							secure: true,
							auth: {
								user: process.env.GMAIL_USERNAME,
								pass: process.env.GMAIL_PASSWORD
							},
							tls: {
								rejectUnauthorized: false
							}
						});

						nodemailer.sendMail({
							from: process.env.GMAIL_FROM,
							to: user.email,

							subject: 'Coinflipper Login Link for ' + user.email,

							text: (process.env.NODE_ENV == 'production') ? ('Here\'s your Coinflipper login link! Click it anytime within the next five minutes and you\'ll instantly be logged in to all Coinflipper games on this device.' + "\n\n" + 'https://login.' + process.env.COOKIE_DOMAIN + '/sessions/create/' + link.key) : ('https://login.' + process.env.COOKIE_DOMAIN + ':' + process.env.PORT + '/sessions/create/' + link.key)
						}).then(function() {
							response.send(link);
						}).catch(function(error) {
							response.status(500).send(error);
						});
					}
					else {
						response.send(link);
					}
				});
			}
		});
	}
};
