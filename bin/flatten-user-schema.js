#!/usr/bin/env node

// NOTE: This script was created 2026-01-14 to:
//   1. Remove the deprecated name.nick field from all users
//   2. Flatten name.first/name.last to firstName/lastName
// If you're reading this, you can very likely delete this file — it was only meant to be run once.

const dotenv = require('dotenv').config({ path: '/app/.env' });
const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI || null;

async function migrate() {
	await mongoose.connect(mongoUri);

	const db = mongoose.connection.db;
	const usersCollection = db.collection('users');

	// Count users that need migration
	const needsMigration = await usersCollection.countDocuments({ 'name': { $exists: true } });
	console.log(`Found ${needsMigration} user(s) with nested name structure.`);

	if (needsMigration === 0) {
		console.log('Nothing to migrate.');
		await mongoose.disconnect();
		return;
	}

	// Flatten name.first/name.last to firstName/lastName and remove the name object
	const users = await usersCollection.find({ 'name': { $exists: true } }).toArray();
	let migratedCount = 0;

	for (const user of users) {
		const update = {
			$set: {
				firstName: user.name.first,
				lastName: user.name.last
			},
			$unset: {
				name: ''
			}
		};

		await usersCollection.updateOne({ _id: user._id }, update);
		migratedCount++;
	}

	console.log(`Migrated ${migratedCount} user(s) to flattened schema.`);

	await mongoose.disconnect();
}

migrate().catch((error) => {
	console.error(error);
	process.exit(1);
});
