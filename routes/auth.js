const express = require('express');
const router = express.Router();
const User = require('../model/user');
const Provider = require('../model/provider');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const sgMail = require('@sendgrid/mail');
const config = require('../config/config');

// Validate configuration on startup
config.validate();

// Configure SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Helper function to send emails
async function sendEmail({ to, subject, html }) {
  try {
    await sgMail.send({
      to,
      from: process.env.EMAIL_FROM,
      subject,
      html
    });
    console.log('Email sent to', to);
  } catch (err) {
    console.error('Email sending failed:', err);
    throw err;
  }
}

// ------------------ USER ROUTES ------------------

// User Sign In
router.post('/user/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json("Email and password are required");

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json("User not found");
    if (!user.isActivated) return res.status(400).json("Account not activated. Please check your email.");

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json("Invalid password");

    const token = jwt.sign({ email: user.email, id: user._id, userType: 'user' }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        userType: 'user'
      },
      message: "Login successful"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json("Internal Server Error");
  }
});

// User Sign Up
router.post('/user/signup', async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;
    const userExist = await User.findOne({ email });
    if (userExist) return res.status(400).json("User email already exists");

    const hashedPassword = await bcrypt.hash(password, 10);
    const activationToken = jwt.sign({ email }, config.jwt.activationSecret);

    const html = `
      <h1>Welcome ${name}!</h1>
      <p>Click <a href='${config.urls.frontend}/?activate=${activationToken}'>here</a> to activate your account.</p>
      <p>If link doesn’t work, copy: ${config.urls.frontend}/?activate=${activationToken}</p>
    `;

    await sendEmail({ to: email, subject: "Activate Your Account", html });

    const user = new User({
      name, email, password: hashedPassword, phone, address, userType: 'user', token: activationToken
    });
    await user.save();

    res.status(201).json({ message: "Account created successfully! Check your email to activate it.", email });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// User Activation
router.get('/user/activate/:token', async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, config.jwt.activationSecret);
    const user = await User.findOneAndUpdate(
      { email: decoded.email, token: req.params.token },
      { $set: { isActivated: true, token: null } },
      { new: true }
    );
    if (!user) return res.status(400).json({ message: "Invalid or expired activation link" });

    res.status(200).json({ message: "Account activated successfully!", email: user.email, userType: "user", id: user._id });
  } catch (err) {
    console.error('Activation error:', err);
    res.status(400).json({ message: "Invalid or expired activation link" });
  }
});

// ------------------ PROVIDER ROUTES ------------------

// Provider Sign In
router.post('/provider/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json("Email and password are required");

    const provider = await Provider.findOne({ email });
    if (!provider) return res.status(400).json("Provider not found");
    if (!provider.isActivated) return res.status(400).json("Account not activated. Please check your email.");

    const valid = await bcrypt.compare(password, provider.password);
    if (!valid) return res.status(400).json("Invalid password");

    const token = jwt.sign({ email: provider.email, id: provider._id, userType: 'provider' }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    res.status(200).json({
      token,
      user: { id: provider._id, name: provider.name, email: provider.email, phone: provider.phone, address: provider.address, businessName: provider.businessName, businessType: provider.businessType, userType: 'provider' },
      message: "Login successful"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json("Internal Server Error");
  }
});

// Provider Sign Up
router.post('/provider/signup', async (req, res) => {
  try {
    const { name, email, password, phone, address, businessName, businessType, licenseNumber } = req.body;
    const providerExist = await Provider.findOne({ email });
    if (providerExist) return res.status(400).json("Provider email already exists");

    const hashedPassword = await bcrypt.hash(password, 10);
    const activationToken = jwt.sign({ email }, config.jwt.activationSecret);

    const html = `
      <h1>Welcome ${name}!</h1>
      <p>Business: ${businessName || 'Not specified'}</p>
      <p>Click <a href='${config.urls.frontend}/?activate=${activationToken}'>here</a> to activate your account.</p>
      <p>If link doesn’t work, copy: ${config.urls.frontend}/?activate=${activationToken}</p>
    `;

    await sendEmail({ to: email, subject: "Activate Provider Account", html });

    const provider = new Provider({ name, email, password: hashedPassword, phone, address, businessName: businessName || '', licenseNumber: licenseNumber || '', businessType: businessType || '', userType: 'provider', token: activationToken });
    await provider.save();

    res.status(201).json({ message: "Provider account created successfully! Check your email to activate it.", email });
  } catch (err) {
    console.error('Provider signup error:', err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Provider Activation
router.get('/provider/activate/:token', async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, config.jwt.activationSecret);
    const provider = await Provider.findOneAndUpdate({ email: decoded.email, token: req.params.token }, { $set: { isActivated: true, token: null } }, { new: true });
    if (!provider) return res.status(400).json({ message: "Invalid or expired activation link" });

    res.status(200).json({ message: "Provider account activated successfully!", email: provider.email, userType: "provider", id: provider._id });
  } catch (err) {
    console.error('Provider activation error:', err);
    res.status(400).json({ message: "Invalid or expired activation link" });
  }
});

// ------------------ PASSWORD RESET ------------------

// Helper
function getMsFromExpiresIn(v) {
  if (typeof v !== 'string') return 3600000;
  const m = v.trim().match(/^(\d+)([smhd])$/i);
  if (!m) return 3600000;
  const num = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  const map = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return num * (map[unit] || 3600000);
}

// Forgot Password
router.post('/password/forgot', async (req, res) => {
  try {
    const { email, userType } = req.body;
    if (!email || !userType) return res.status(400).json({ message: 'email and userType are required' });

    const Model = userType === 'provider' ? Provider : User;
    const account = await Model.findOne({ email });
    if (!account) return res.status(200).json({ message: 'If the email exists, a reset link has been sent.' });

    const token = jwt.sign({ email, userType }, config.jwt.resetSecret, { expiresIn: config.jwt.resetExpiresIn });
    account.passwordResetToken = token;
    account.passwordResetExpires = new Date(Date.now() + getMsFromExpiresIn(config.jwt.resetExpiresIn));
    await account.save();

    const resetUrl = `${config.urls.frontend.replace(/\/+$/, '')}/reset-password/${token}`;
    const html = `<p>Click <a href="${resetUrl}">here</a> to reset your password. Expires in ${config.jwt.resetExpiresIn}</p>`;
    await sendEmail({ to: email, subject: 'Reset your password', html });

    res.status(200).json({ message: 'If the email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Reset Password
router.post('/password/reset', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'token and password are required' });

    let decoded;
    try { decoded = jwt.verify(token, config.jwt.resetSecret); }
    catch (e) { return res.status(400).json({ message: 'Invalid or expired token' }); }

    const Model = decoded.userType === 'provider' ? Provider : User;
    const account = await Model.findOne({ email: decoded.email, passwordResetToken: token });
    if (!account || !account.passwordResetExpires || account.passwordResetExpires < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    account.password = await bcrypt.hash(password, 10);
    account.passwordResetToken = null;
    account.passwordResetExpires = null;
    await account.save();

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Verify reset token
router.get('/password/reset/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;
    let decoded;
    try { decoded = jwt.verify(token, config.jwt.resetSecret); }
    catch (e) { return res.status(400).json({ valid: false, message: 'Invalid or expired token' }); }

    const Model = decoded.userType === 'provider' ? Provider : User;
    const account = await Model.findOne({ email: decoded.email, passwordResetToken: token });
    if (!account || !account.passwordResetExpires || account.passwordResetExpires < new Date()) {
      return res.status(400).json({ valid: false, message: 'Invalid or expired token' });
    }

    res.status(200).json({ valid: true, userType: decoded.userType });
  } catch (err) {
    console.error('Verify reset token error:', err);
    res.status(500).json({ valid: false, message: 'Internal server error' });
  }
});

// Password verification endpoint
router.post('/verify-password', async (req, res) => {
  try {
    const { email, password, userType } = req.body;
    if (!email || !password || !userType) return res.status(400).json({ success: false, message: "Email, password, and userType are required" });

    const Model = userType === 'provider' ? Provider : User;
    const user = await Model.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const isValidPassword = await bcrypt.compare(password, user.password);
    res.json({ success: true, isValid: isValidPassword });
  } catch (err) {
    console.error('Password verification error:', err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;
