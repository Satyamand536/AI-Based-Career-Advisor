const JWT = require("jsonwebtoken");

const secret = process.env.JWT_SECRET || "$perumanu@123";

function createTokenForUser(user) {
  const payload = {
    _id: user._id,
    name: user.fullName || user.name,
    email: user.email,
    profileImageURL: user.profileImageURL,
    role: user.role,
  };
  
  const token = JWT.sign(payload, secret );
  return token;
}

function validateToken(token) {
  // Validate safely, throw if invalid
  const payload = JWT.verify(token, secret);
  return payload;
}

module.exports = {
  createTokenForUser,
  validateToken,
};
