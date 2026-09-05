const JWT = require("jsonwebtoken");

// Single source of truth for the JWT secret. No hardcoded fallback: a secret
// shipped in source is a forgery key, so the app fails closed when unset.
function getJWTSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return secret;
}

// Sessions are long-lived so users are not logged out mid-use; the cookie
// maxAge in routes/userRoute.js mirrors this same window.
const SESSION_TTL = "30d";

function createTokenForUser(user) {
  const payload = {
    _id: user._id,
    name: user.fullName || user.name,
    email: user.email,
    profileImageURL: user.profileImageURL,
    role: user.role,
  };

  const token = JWT.sign(payload, getJWTSecret(), { expiresIn: SESSION_TTL });
  return token;
}

function validateToken(token) {
  // Validate safely, throw if invalid
  const payload = JWT.verify(token, getJWTSecret());
  return payload;
}

module.exports = {
  createTokenForUser,
  validateToken,
};
