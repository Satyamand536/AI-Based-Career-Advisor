// backend/middlewares/auth.js
const jwt = require('jsonwebtoken');
const User = require('./models/user');

function checkForAuthenticationCookie(cookieName) {
  return async (req, res, next) => {
    const tokenCookieValue = req.cookies[cookieName];
    if (!tokenCookieValue) {
      // No token, continue without user
      return next();
    }

    try {
      const payload = jwt.verify(tokenCookieValue, process.env.JWT_SECRET || 'default_secret');
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
