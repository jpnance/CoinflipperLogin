const dotenv = require('dotenv').config({ path: '/app/.env' });
const readline = require('readline');

const User = require('../models/user');

const mongoose = require('mongoose');
const mongoUri = process.env.MONGODB_URI || null;

mongoose.connect(mongoUri);

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

if (!process.argv[2] || !process.argv[3]) {
	console.error('Usage: node register [email] [username]');
	process.exit();
}

var firstNamePrompt = (user) => {
	rl.question('First Name: ', (firstName) => {
		if (firstName == '') {
			firstNamePrompt(user);
			return;
		}

		user.name.first = firstName;

		lastNamePrompt(user);
	});
};

var lastNamePrompt = (user) => {
	rl.question('Last Name: ', (lastName) => {
		if (lastName == '') {
			lastNamePrompt(user);
			return;
		}

		user.name.last = lastName;

		nickNamePrompt(user);
	});
};

var nickNamePrompt = (user) => {
	rl.question('Nickname: ', (nickName) => {
		if (nickName == '') {
			user.name.nick = user.name.first;
		}
		else {
			user.name.nick = nickName;
		}

		rl.close();

		user.save().then(() => {
			process.exit();
		}).catch((error) => {
			console.error(error);
		});
	});
};

if (User.validateEmail(process.argv[2])) {
	var user = new User({
		email: process.argv[2],
		username: process.argv[3],
		name: {}
	});

	firstNamePrompt(user);
}
