const Session = require('./models/session');
const User = require('./models/user');
const Link = require('./models/link');
const nodemailer = require('nodemailer');

const { attachSession, requireLogin, requireAdmin } = require('./auth/middleware');

module.exports = function(app) {
	// Attach session to all requests
	app.use(attachSession);

	// Welcome / Login
	app.get('/', (req, res) => {
		res.render('welcome', { session: req.session });
	});

	app.get('/login', (req, res) => {
		const responseData = { session: req.session };

		if (req.query.error == 'invalid-email') {
			responseData.error = { message: 'Invalid email address.' };
		} else if (req.query.error == 'not-found') {
			responseData.error = { message: 'No user found for that email address.' };
		} else if (req.query.error == 'unknown') {
			responseData.error = { message: 'Unknown server error.' };
		} else if (req.query.success == 'email-sent') {
			responseData.success = { message: 'Check your email for your login link!' };
		}

		res.render('welcome', responseData);
	});

	// Web login form submission
	app.post('/login', async (req, res) => {
		if (!req.body.email) {
			res.redirect('/login?error=invalid-email');
			return;
		}

		try {
			const user = await User.findOne({ email: req.body.email.toLowerCase() });

			if (!user) {
				res.redirect('/login?error=not-found');
				return;
			}

			const link = new Link({
				key: Link.generateKey(6),
				user: user._id
			});

			if (req.body.redirectTo) {
				link.redirectTo = req.body.redirectTo;
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

			res.redirect('/login?success=email-sent');
		} catch (error) {
			console.error(error);
			res.redirect('/login?error=unknown');
		}
	});

	// Admin: Users list
	app.get('/admin/users', requireLogin, requireAdmin, async (req, res) => {
		const users = await User.find({}).sort({ username: 1 });
		res.render('users/list', { session: req.session, users: users });
	});

	// Admin: Add user form
	app.get('/admin/users/add', requireLogin, requireAdmin, (req, res) => {
		res.render('users/add', { session: req.session });
	});

	// Admin: Add user POST
	app.post('/admin/users/add', requireLogin, requireAdmin, async (req, res) => {
		try {
			if (!User.validateEmail(req.body.email)) {
				res.render('users/add', { session: req.session, error: { message: 'Invalid email address.' } });
				return;
			}

			const user = new User({
				email: req.body.email.toLowerCase(),
				username: req.body.username,
				name: {
					first: req.body.firstName,
					last: req.body.lastName,
					nick: req.body.nickName || req.body.firstName
				},
				admin: req.body.admin === 'on'
			});

			await user.save();
			res.redirect('/admin/users');
		} catch (error) {
			res.render('users/add', { session: req.session, error: { message: error.message } });
		}
	});

	// Admin: Edit user form
	app.get('/admin/users/edit/:userId', requireLogin, requireAdmin, async (req, res) => {
		const user = await User.findById(req.params.userId);

		if (!user) {
			res.redirect('/admin/users');
			return;
		}

		res.render('users/edit', { session: req.session, user: user });
	});

	// Admin: Edit user POST
	app.post('/admin/users/edit/:userId', requireLogin, requireAdmin, async (req, res) => {
		try {
			const user = await User.findById(req.params.userId);

			if (!user) {
				res.redirect('/admin/users');
				return;
			}

			if (!User.validateEmail(req.body.email)) {
				res.render('users/edit', { session: req.session, user: user, error: { message: 'Invalid email address.' } });
				return;
			}

			user.email = req.body.email.toLowerCase();
			user.username = req.body.username;
			user.name.first = req.body.firstName;
			user.name.last = req.body.lastName;
			user.name.nick = req.body.nickName || req.body.firstName;
			user.admin = req.body.admin === 'on';

			await user.save();
			res.render('users/edit', { session: req.session, user: user, success: { message: 'User updated successfully.' } });
		} catch (error) {
			const user = await User.findById(req.params.userId);
			res.render('users/edit', { session: req.session, user: user, error: { message: error.message } });
		}
	});

	// Admin: Sessions list
	app.get('/admin/sessions', requireLogin, requireAdmin, async (req, res) => {
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

		res.render('sessions/list', {
			session: req.session,
			sessions: allSessions,
			sessionMap: sessionMap,
			totalSessions: allSessions.length,
			totalUsers: uniqueUsers,
			oldSessions: oldSessionCount
		});
	});

	// Admin: Delete single session
	app.post('/admin/sessions/delete/:key', requireLogin, requireAdmin, async (req, res) => {
		await Session.deleteOne({ key: req.params.key });
		res.redirect('/admin/sessions');
	});

	// Admin: Delete all sessions for a user
	app.post('/admin/sessions/delete-user/:username', requireLogin, requireAdmin, async (req, res) => {
		const user = await User.findOne({ username: req.params.username });

		if (user) {
			await Session.deleteMany({ user: user._id });
		}

		res.redirect('/admin/sessions');
	});

	// Admin: Cleanup old sessions
	app.post('/admin/sessions/cleanup', requireLogin, requireAdmin, async (req, res) => {
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		await Session.deleteMany({
			$or: [
				{ lastActivity: { $lt: thirtyDaysAgo } },
				{ lastActivity: null }
			]
		});

		res.redirect('/admin/sessions');
	});
};
