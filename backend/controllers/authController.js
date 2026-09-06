const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sendEmail = require('../utils/sendEmail');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

const sendOtpEmail = async (user, otp) => {
  const message = `
    <h2>Welcome to ShopNest, ${user.name}!</h2>
    <p>Thank you for registering on our platform.</p>
    <p>Your email verification OTP is: <strong>${otp}</strong></p>
    <p>This code expires in 10 minutes.</p>
  `;
  await sendEmail({ email: user.email, subject: 'ShopNest - Verify your email', message });
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const otp = generateOtp();
    const user = await User.create({
      name, email, password: hashedPassword,
      isVerified: false,
      otp,
      otpExpires: Date.now() + OTP_TTL_MS
    });

    if (user) {
      await sendOtpEmail(user, otp);
      res.status(201).json({
        message: 'Registration successful! Please check your email for the OTP to verify your account.',
        email: user.email
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email }).select('+otp +otpExpires');

    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Email is already verified' });
    if (!user.otp || user.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });
    if (user.otpExpires < Date.now()) return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Email is already verified' });

    const otp = generateOtp();
    user.otp = otp;
    user.otpExpires = Date.now() + OTP_TTL_MS;
    await user.save();

    await sendOtpEmail(user, otp);
    res.json({ message: 'A new OTP has been sent to your email' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      if (!user.isVerified) {
        return res.status(403).json({
          message: 'Please verify your email before logging in',
          needsVerification: true,
          email: user.email
        });
      }
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { registerUser, loginUser, getUsers, verifyEmail, resendOtp };
