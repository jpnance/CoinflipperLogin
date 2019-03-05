const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const sessionSchema = new Schema({
	user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	key: { type: String, required: true, unique: true }
});

module.exports = mongoose.model('Session', sessionSchema);
