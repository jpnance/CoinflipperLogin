#!/usr/bin/env node

// NOTE: This script was created 2026-01-12 to clean up legacy sessions with null lastActivity.
// If you're reading this, you can very likely delete this file — it was only meant to be run once.

const dotenv = require('dotenv').config({ path: '/app/.env' });
const mongoose = require('mongoose');

const Session = require('../models/session');

const mongoUri = process.env.MONGODB_URI || null;

async function cleanup() {
	await mongoose.connect(mongoUri);

	const count = await Session.countDocuments({ lastActivity: null });
	console.log(`Found ${count} session(s) with null lastActivity.`);

	if (count === 0) {
		console.log('Nothing to clean up.');
		await mongoose.disconnect();
		return;
	}

	const result = await Session.deleteMany({ lastActivity: null });
	console.log(`Deleted ${result.deletedCount} session(s).`);

	await mongoose.disconnect();
}

cleanup().catch((error) => {
	console.error(error);
	process.exit(1);
});
