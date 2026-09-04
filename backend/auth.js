// backend/middlewares/auth.js
const { validateToken } = require('./services/authentication');
const User = require('./models/user');

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
      // Invalid token, continue without user
      console.error('Auth error:', error.message);
    }
    next();
  };
}

module.exports = { checkForAuthenticationCookie };
