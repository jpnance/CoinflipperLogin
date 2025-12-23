const dotenv = require('dotenv').config({ path: '/app/.env' });

const mongoose = require('mongoose');
const mongoUri = process.env.MONGODB_URI || null;

mongoose.connect(mongoUri);

const User = require('./models/user');

User.find({}).then(handleUsers).then(disconnect);

function handleUsers(users) {
	return Promise.all(users.map(convertUsername));
}

function disconnect() {
	mongoose.disconnect();
	process.exit();
}

function convertUsername(user) {
	const { name } = user;
	const newUsername = [name.first, name.last].join('-').toLowerCase().replaceAll(/[']/g, '');

	user.username = newUsername;

	return user.save();
}
