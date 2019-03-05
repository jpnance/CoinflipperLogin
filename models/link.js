const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const linkSchema = new Schema({
	key: { type: String, required: true, unique: true },
	user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	createdAt: { type: Date, default: Date.now, expires: 300 }
});

linkSchema.statics.generateKey = () => {
	const length = 6;
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

	var key = '';

	for (var i = 0; i < length; i++) {
		key += possible.charAt(Math.floor(Math.random() * possible.length));
	}

	return key;
};

module.exports = mongoose.model('Link', linkSchema);
