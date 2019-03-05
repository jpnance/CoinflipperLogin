var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userSchema = new Schema({
	email: { type: String, required: true, unique: true },
	admin: { type: Boolean, default: false }
});

userSchema.statics.validateEmail = (email) => {
	var emailRegex = /.+?@.+?\..+?/;
	return email.match(emailRegex) != null;
};

module.exports = mongoose.model('User', userSchema);
