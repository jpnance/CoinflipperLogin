const Session = require('../models/session');

/**
 * Attaches session and user to request if logged in.
 * Always calls next() - doesn't block unauthenticated users.
 * Use on all routes via app.use().
 */
async function attachSession(req, res, next) {
	req.session = null;
	req.user = null;

	var sessionKey = req.cookies.sessionKey;
	if (!sessionKey) {
		return next();
	}

	try {
		var session = await Session.findOne({ key: sessionKey }).populate('user').populate('pretendingToBe');

		if (session && session.user) {
			req.session = session;
			req.user = session.user;
			res.locals.session = session;

			// For admins, find all their sessions that are pretending
			if (session.user.admin) {
				res.locals.pretendingSessions = await Session.find({
					user: session.user._id,
					pretendingToBe: { $ne: null }
				}).populate('pretendingToBe');
			}
		}
	} catch (error) {
		// Invalid/expired session - just continue as logged out
	}

	next();
}

/**
 * Requires a logged-in user. Redirects to /login if not.
 * Use on specific routes: app.get('/profile', requireLogin, handler)
 */
function requireLogin(req, res, next) {
	if (!req.user) {
		return res.redirect('/login');
	}
	next();
}

/**
 * Requires an admin user. Redirects to /login if not logged in, 403 if not admin.
 * Use after requireLogin: app.get('/admin', requireLogin, requireAdmin, handler)
 */
function requireAdmin(req, res, next) {
	if (!req.session || !req.session.user || !req.session.user.admin) {
		return res.status(403).send('Forbidden');
	}
	next();
}

module.exports = {
	attachSession: attachSession,
	requireLogin: requireLogin,
	requireAdmin: requireAdmin
};
