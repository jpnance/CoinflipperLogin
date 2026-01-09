const Session = require('./models/session');
const User = require('./models/user');
const Link = require('./models/link');
const nodemailer = require('nodemailer');

const withSession = async (request) => {
	if (!request.cookies.sessionKey) {
		return null;
	}

	const session = await Session.findOne({ key: request.cookies.sessionKey }).populate('user');
	return session;
};

const requireAdmin = async (request, response) => {
	const session = await withSession(request);

	if (!session || !session.user || !session.user.admin) {
		response.redirect('/login');
		return null;
	}

	return session;
};

module.exports = function(app) {
	// Welcome / Login
	app.get('/', async (request, response) => {
		const session = await withSession(request);
		response.render('welcome', { session: session });
	});

	app.get('/login', async (request, response) => {
		const session = await withSession(request);

		const responseData = { session: session };

		if (request.query.error == 'invalid-email') {
			responseData.error = { message: 'Invalid email address.' };
		} else if (request.query.error == 'not-found') {
			responseData.error = { message: 'No user found for that email address.' };
		} else if (request.query.error == 'unknown') {
			responseData.error = { message: 'Unknown server error.' };
		} else if (request.query.success == 'email-sent') {
			responseData.success = { message: 'Check your email for your login link!' };
		}

		response.render('welcome', responseData);
	});

	// Web login form submission
	app.post('/login', async (request, response) => {
		const session = await withSession(request);

		if (!request.body.email) {
			response.redirect('/login?error=invalid-email');
			return;
		}

		try {
			const user = await User.findOne({ email: request.body.email.toLowerCase() });

			if (!user) {
				response.redirect('/login?error=not-found');
				return;
			}

			const link = new Link({
				key: Link.generateKey(6),
				user: user._id
			});

			if (request.body.redirectTo) {
				link.redirectTo = request.body.redirectTo;
			}

			await link.save();

			const transporter = nodemailer.createTransport({
				host: 'smtp.gmail.com',
				port: 465,
				secure: true,
				auth: {
					user: process.env.GMAIL_USERNAME,
					pass: process.env.GMAIL_PASSWORD
				},
				tls: {
					rejectUnauthorized: false
				}
			});

			const loginUrl = (process.env.NODE_ENV == 'production')
				? 'https://login.' + process.env.COOKIE_DOMAIN + '/sessions/create/' + link.key
				: 'https://login.' + process.env.COOKIE_DOMAIN + ':' + process.env.PORT + '/sessions/create/' + link.key;

			await transporter.sendMail({
				from: process.env.GMAIL_FROM,
				to: user.email,
				subject: 'Coinflipper Login Link',
				text: 'Here\'s your Coinflipper login link! Click it anytime within the next five minutes and you\'ll instantly be logged in.\n\n' + loginUrl
			});

			response.redirect('/login?success=email-sent');
		} catch (error) {
			console.error(error);
			response.redirect('/login?error=unknown');
		}
	});

	// Admin: Users list
	app.get('/admin/users', async (request, response) => {
		const session = await requireAdmin(request, response);
		if (!session) return;

		const users = await User.find({}).sort({ username: 1 });
		response.render('users/list', { session: session, users: users });
	});

	// Admin: Add user form
	app.get('/admin/users/add', async (request, response) => {
		const session = await requireAdmin(request, response);
		if (!session) return;

		response.render('users/add', { session: session });
	});

	// Admin: Add user POST
	app.post('/admin/users/add', async (request, response) => {
		const session = await requireAdmin(request, response);
		if (!session) return;

		try {
			if (!User.validateEmail(request.body.email)) {
				response.render('users/add', { session: session, error: { message: 'Invalid email address.' } });
				return;
			}

			const user = new User({
				email: request.body.email.toLowerCase(),
				username: request.body.username,
				name: {
					first: request.body.firstName,
					last: request.body.lastName,
					nick: request.body.nickName || request.body.firstName
				},
				admin: request.body.admin === 'on'
			});

			await user.save();
			response.redirect('/admin/users');
		} catch (error) {
			response.render('users/add', { session: session, error: { message: error.message } });
		}
	});

	// Admin: Edit user form
	app.get('/admin/users/edit/:userId', async (request, response) => {
		const session = await requireAdmin(request, response);
		if (!session) return;

		const user = await User.findById(request.params.userId);

		if (!user) {
			response.redirect('/admin/users');
			return;
		}

		response.render('users/edit', { session: session, user: user });
	});

	// Admin: Edit user POST
	app.post('/admin/users/edit/:userId', async (request, response) => {
		const session = await requireAdmin(request, response);
		if (!session) return;

		try {
			const user = await User.findById(request.params.userId);

			if (!user) {
				response.redirect('/admin/users');
				return;
			}

			if (!User.validateEmail(request.body.email)) {
				response.render('users/edit', { session: session, user: user, error: { message: 'Invalid email address.' } });
				return;
			}

			user.email = request.body.email.toLowerCase();
			user.username = request.body.username;
			user.name.first = request.body.firstName;
			user.name.last = request.body.lastName;
			user.name.nick = request.body.nickName || request.body.firstName;
			user.admin = request.body.admin === 'on';

			await user.save();
			response.render('users/edit', { session: session, user: user, success: { message: 'User updated successfully.' } });
		} catch (error) {
			const user = await User.findById(request.params.userId);
			response.render('users/edit', { session: session, user: user, error: { message: error.message } });
		}
	});

	// Admin: Sessions list
	app.get('/admin/sessions', async (request, response) => {
		const session = await requireAdmin(request, response);
		if (!session) return;

		const allSessions = await Session.find({}).populate('user').sort({ lastActivity: -1 });

		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		const sessionMap = {};
		let oldSessionCount = 0;

		allSessions.forEach(s => {
			if (!s.user) return;

			const username = s.user.username;

			if (!sessionMap[username]) {
				sessionMap[username] = {
					count: 0,
					lastActivity: null
				};
			}

			sessionMap[username].count++;

			if (s.lastActivity && (!sessionMap[username].lastActivity || s.lastActivity > sessionMap[username].lastActivity)) {
				sessionMap[username].lastActivity = s.lastActivity;
			}

			if (!s.lastActivity || s.lastActivity < thirtyDaysAgo) {
				oldSessionCount++;
			}
		});

		const uniqueUsers = Object.keys(sessionMap).length;

		response.render('sessions/list', {
			session: session,
			sessions: allSessions,
			sessionMap: sessionMap,
			totalSessions: allSessions.length,
			totalUsers: uniqueUsers,
			oldSessions: oldSessionCount
		});
	});

	// Admin: Delete single session
	app.post('/admin/sessions/delete/:key', async (request, response) => {
		const session = await requireAdmin(request, response);
		if (!session) return;

		await Session.deleteOne({ key: request.params.key });
		response.redirect('/admin/sessions');
	});

	// Admin: Delete all sessions for a user
	app.post('/admin/sessions/delete-user/:username', async (request, response) => {
		const session = await requireAdmin(request, response);
		if (!session) return;

		const user = await User.findOne({ username: request.params.username });

		if (user) {
			await Session.deleteMany({ user: user._id });
		}

		response.redirect('/admin/sessions');
	});

	// Admin: Cleanup old sessions
	app.post('/admin/sessions/cleanup', async (request, response) => {
		const session = await requireAdmin(request, response);
		if (!session) return;

		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		await Session.deleteMany({
			$or: [
				{ lastActivity: { $lt: thirtyDaysAgo } },
				{ lastActivity: null }
			]
		});

		response.redirect('/admin/sessions');
	});
};
