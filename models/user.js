const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
	email: { type: String, required: true, unique: true },
	username: { type: String, required: true, unique: true },
	firstName: { type: String, required: true },
	lastName: { type: String, required: true },
	admin: { type: Boolean, default: false }
});

userSchema.statics.validateEmail = (email) => {
	var emailRegex = /.+?@.+?\..+?/;
	return email.match(emailRegex) != null;
};

userSchema.statics.generateUsername = (firstName, lastName) => {
	return [firstName, lastName].join('-').toLowerCase().replaceAll(/[']/g, '').replaceAll(/\s+/g, '-');
};

module.exports = mongoose.model('User', userSchema);
