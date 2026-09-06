const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  // Defaults to true so pre-existing/seeded accounts aren't locked out; registerUser
  // explicitly sets this false to require OTP verification for new signups.
  isVerified: { type: Boolean, default: true },
  otp: { type: String, select: false },
  otpExpires: { type: Date, select: false },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
