const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
	email: { type: String, required: true, unique: true },
	username: { type: String, require: true, unique: true },
	name: {
		first: { type: String, require: true },
		last: { type: String, require: true },
		nick: { type: String, require: true }
	},
	admin: { type: Boolean, default: false }
});

userSchema.statics.validateEmail = (email) => {
	var emailRegex = /.+?@.+?\..+?/;
	return email.match(emailRegex) != null;
};

module.exports = mongoose.model('User', userSchema);
