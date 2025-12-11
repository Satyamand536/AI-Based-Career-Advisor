const { Schema, model } = require("mongoose");
const { createHmac, randomBytes } = require("crypto");
const { createTokenForUser } = require("../services/authentication");

const userSchema = new Schema({
  fullName: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  // store salt as Buffer (not readable string)
  salt: { type: Buffer },
  password: { type: String, required: true },
  profileImageURL: { type: String, default: "/images/hacker.png" },
  role: { type: String, enum: ["USER", "ADMIN"], default: "USER" },
}, { timestamps: true });

// Hash password before saving
userSchema.pre("save", function (next) {
  const user = this;
  if (!user.isModified("password")) return next();

  // Generate binary salt
  const salt = randomBytes(16);
  const hashedPassword = createHmac("sha256", salt)
    .update(user.password)
    .digest("hex");

  user.salt = salt; // now stored as Buffer
  user.password = hashedPassword;
  next();
});

// Compare passwords and return JWT
userSchema.statics.matchPasswordAndGenerateToken = async function (email, password) {
  const user = await this.findOne({ email });
  if (!user) throw new Error("User not found!");

  // Convert stored Buffer salt back to binary for hashing
  const salt = Buffer.from(user.salt);
  const hashedPassword = user.password;

  const userProvidedHash = createHmac("sha256", salt)
    .update(password)
    .digest("hex");

  if (hashedPassword !== userProvidedHash) throw new Error("incorrect password");

  const token = createTokenForUser(user);
  return token;
};

const User = model("user", userSchema);
module.exports = User;
