const dotenv = require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const mongoose = require('mongoose');
const mongoUri = process.env.MONGODB_URI || null;

mongoose.connect(mongoUri, { useNewUrlParser: true });

const users = require('./services/users');
const links = require('./services/links');

app.get('/', (request, response) => {
	response.send('Hello, world!');
});

app.post('/users/create', users.create);

app.post('/links/create', links.create);

app.listen(port, () => {
	console.log('Listening on port', port);
});
