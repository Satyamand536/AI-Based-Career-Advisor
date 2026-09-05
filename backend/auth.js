// backend/middlewares/auth.js
const { validateToken } = require('./services/authentication');
const User = require('./models/user');
const { isDbConnectionError } = require('./services/dbGuard');

function checkForAuthenticationCookie(cookieName) {
  return async (req, res, next) => {
    const tokenCookieValue = req.cookies[cookieName];
    if (!tokenCookieValue) {
      // No token, continue without user
      return next();
    }

    try {
      const payload = validateToken(tokenCookieValue);
      const user = await User.findById(payload._id);
      if (user) {
        req.user = user;
      }
    } catch (error) {
      // Mongo blip (restart / network) must not read as "logged out": the
      // token is valid, we just could not confirm freshness against the DB.
      if (isDbConnectionError(error)) {
        return res.status(503).json({ error: "db_unavailable" });
      }
      // Invalid token, continue without user
      console.error('Auth error:', error.message);
    }
    next();
  };
}

module.exports = { checkForAuthenticationCookie };
