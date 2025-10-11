const express = require('express');
const router = express.Router();
const User = require('../model/user');
const Provider = require('../model/provider');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('../config/config');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');

// Add global error handlers to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.log('🔄 Unhandled Rejection caught:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('🔄 Uncaught Exception caught:', error.message);
  if (error.message.includes('email') || error.message.includes('fetch') || error.message.includes('Nodemailer')) {
    console.log('📧 Email error handled gracefully, continuing...');
    return;
  }
  console.error('🔴 Critical error, exiting:', error);
  process.exit(1);
});

// Validate configuration on startup
config.validate();

// Nodemailer configuration
// Nodemailer configuration - CORRECTED VERSION
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER, // Your Gmail address
      pass: process.env.GMAIL_APP_PASSWORD, // Your Gmail app password
    },
  });
};
// Rate limiting configurations
const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { 
    error: "Too many accounts created from this IP, please try again after 15 minutes",
    code: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const signinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 login attempts per windowMs
  message: { 
    error: "Too many login attempts from this IP, please try again after 15 minutes",
    code: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 password reset requests per hour
  message: { 
    error: "Too many password reset requests from this IP, please try again after 1 hour",
    code: "RATE_LIMIT_EXCEEDED"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Utility functions
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPassword(password) {
  return password && password.length >= 6;
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
}

function generateStrongToken() {
  return jwt.sign(
    { random: Math.random().toString() }, 
    config.jwt.secret + Date.now(), 
    { expiresIn: '1h' }
  );
}

// Enhanced email sending function using Nodemailer
// Enhanced email sending function using Nodemailer - CORRECTED
// Enhanced Nodemailer configuration with better timeout handling
async function sendNodemailerEmail(to, subject, html, text = null) {
  try {
    console.log('🔄 Attempting to send email via Nodemailer...');
    console.log('📧 To:', to);
    console.log('📋 Subject:', subject);

    // Validate required parameters
    if (!to || !subject || !html) {
      console.log('⚠️ Missing required email parameters');
      return { success: false, error: 'Missing required parameters' };
    }

    // Email validation
    if (!isValidEmail(to)) {
      console.log('⚠️ Invalid recipient email:', to);
      return { success: false, error: 'Invalid recipient email' };
    }

    // Check if Gmail credentials are available
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.log('⚠️ Gmail credentials not configured');
      return { success: false, error: 'Email service not configured' };
    }

    console.log('🔑 Gmail User:', process.env.GMAIL_USER);
    console.log('🔑 App Password:', process.env.GMAIL_APP_PASSWORD ? '✅ Set' : '❌ Missing');

    // Try multiple SMTP configurations
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // Use TLS
      requireTLS: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
      connectionTimeout: 30000, // 30 seconds
      socketTimeout: 30000,     // 30 seconds
      greetingTimeout: 30000,   // 30 seconds
      logger: true,
      debug: true
    });

    // Verify connection configuration
    console.log('🔍 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified');

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: to,
      subject: subject.substring(0, 78),
      html: html,
    };

    // Add text version if provided
    if (text) {
      mailOptions.text = text;
    }

    console.log('📤 Sending email...');
    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully via Nodemailer, Message ID:', result.messageId);
    console.log('✅ Response:', result.response);
    
    return { success: true, data: result };
    
  } catch (error) {
    console.log('❌ Nodemailer error:', error.message);
    console.log('🔍 Full error:', error);
    
    return { 
      success: false, 
      error: 'Email service temporarily unavailable: ' + error.message
    };
  }
}

// Professional email template functions
function generateActivationEmail(name, activationUrl, userType = 'user') {
  const typeText = userType === 'provider' ? 'Provider' : 'User';
  const currentYear = new Date().getFullYear();
  
  return {
    subject: `Activate Your ${typeText} Account - Uzhavan Rentals`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Activation</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; }
          .container { max-width: 600px; margin: 0 auto; background: white; }
          .header { background: linear-gradient(135deg, #2E7D32, #4CAF50); color: white; padding: 30px 20px; text-align: center; }
          .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .content { padding: 40px 30px; }
          .button { background: linear-gradient(135deg, #2E7D32, #4CAF50); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #e9ecef; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .code-block { background: #f8f9fa; padding: 15px; border-radius: 6px; border: 1px solid #e9ecef; margin: 15px 0; word-break: break-all; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🚜 Uzhavan Rentals</div>
            <h1>Welcome to Agricultural Equipment Rental</h1>
          </div>
          
          <div class="content">
            <h2>Hello ${sanitizeInput(name)},</h2>
            <p>Thank you for registering as a ${typeText} with Uzhavan Rentals!</p>
            
            <p>To activate your account, please click the button below:</p>
            
            <p style="text-align: center;">
              <a href="${activationUrl}" class="button">Activate Your Account</a>
            </p>
            
            <div class="warning">
              <strong>⚠️ Important:</strong> This activation link will expire in 24 hours.
            </div>
            
            <p>If the button doesn't work, copy and paste this URL into your browser:</p>
            <div class="code-block">${activationUrl}</div>
            
            <p>If you didn't create this account, please ignore this email.</p>
          </div>
          
          <div class="footer">
            <p>&copy; ${currentYear} Uzhavan Rentals. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Welcome to Uzhavan Rentals!

      Hello ${name},

      Thank you for registering as a ${typeText} with Uzhavan Rentals!

      To activate your account, please visit:
      ${activationUrl}

      This activation link will expire in 24 hours.

      If you didn't create this account, please ignore this email.

      © ${currentYear} Uzhavan Rentals. All rights reserved.
    `
  };
}

function generatePasswordResetEmail(name, resetUrl) {
  const currentYear = new Date().getFullYear();
  
  return {
    subject: 'Password Reset Request - Uzhavan Rentals',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; }
          .container { max-width: 600px; margin: 0 auto; background: white; }
          .header { background: linear-gradient(135deg, #D32F2F, #F44336); color: white; padding: 30px 20px; text-align: center; }
          .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .content { padding: 40px 30px; }
          .button { background: linear-gradient(135deg, #D32F2F, #F44336); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #e9ecef; }
          .warning { background: #ffebee; border: 1px solid #ffcdd2; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .code-block { background: #f8f9fa; padding: 15px; border-radius: 6px; border: 1px solid #e9ecef; margin: 15px 0; word-break: break-all; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🚜 Uzhavan Rentals</div>
            <h1>Password Reset Request</h1>
          </div>
          
          <div class="content">
            <h2>Hello ${sanitizeInput(name)},</h2>
            <p>We received a request to reset your password.</p>
            
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Your Password</a>
            </p>
            
            <div class="warning">
              <strong>🔒 Security Notice:</strong> This link will expire in 1 hour.
            </div>
            
            <p>If the button doesn't work, copy and paste this URL:</p>
            <div class="code-block">${resetUrl}</div>
            
            <p>If you didn't request this, please ignore this email.</p>
          </div>
          
          <div class="footer">
            <p>&copy; ${currentYear} Uzhavan Rentals. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Password Reset Request - Uzhavan Rentals

      Hello ${name},

      We received a request to reset your password.

      To reset your password, visit:
      ${resetUrl}

      This link will expire in 1 hour.

      If you didn't request this, please ignore this email.

      © ${currentYear} Uzhavan Rentals. All rights reserved.
    `
  };
}

// Enhanced password reset helper
function getMsFromExpiresIn(v) {
  if (typeof v !== 'string') return 3600000;
  const m = v.trim().match(/^(\d+)([smhd])$/i);
  if (!m) return 3600000;
  const num = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  const map = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return num * (map[unit] || 3600000);
}

// Input validation middleware
const validateSignup = (req, res, next) => {
  const { name, email, password, phone } = req.body;
  
  if (!name || !email || !password || !phone) {
    return res.status(400).json({
      error: "Missing required fields",
      required: ["name", "email", "password", "phone"]
    });
  }
  
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }
  
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: "Password must be at least 6 characters long" });
  }
  
  // Sanitize inputs
  req.body.name = sanitizeInput(name);
  req.body.email = sanitizeInput(email).toLowerCase();
  
  next();
};

// USER AUTHENTICATION ROUTES

// User Sign In
router.post('/user/signin', signinLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: "Validation failed",
        details: "Email and password are required" 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    if (!user.isActivated) {
      return res.status(400).json({ 
        error: "Account not activated",
        details: "Please check your email for the activation link" 
      });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      console.log(`🔐 Failed login attempt for email: ${email}`);
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({
      email: user.email,
      id: user._id,
      userType: 'user'
    }, config.jwt.secret, { 
      expiresIn: config.jwt.expiresIn
    });

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      userType: 'user',
      isActivated: user.isActivated
    };

    res.status(200).json({
      success: true,
      token,
      user: userData,
      message: "Login successful"
    });

  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json({ 
      error: "Internal server error"
    });
  }
});

// User Sign Up
router.post('/user/signup', signupLimiter, validateSignup, async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    console.log('User signup attempt:', email);

    // Enhanced duplicate check
    const normalizedEmail = email.toLowerCase().trim();
    const userExist = await User.findOne({ email: normalizedEmail });
    
    if (userExist) {
      console.log('❌ User already exists:', normalizedEmail);
      return res.status(400).json({ 
        error: "Email already registered",
        details: "This email address is already associated with an account" 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const activationToken = jwt.sign(
      { 
        email: normalizedEmail,
        type: 'activation'
      }, 
      config.jwt.activationSecret, 
      { expiresIn: '24h' }
    );

    console.log('Activation token generated for:', normalizedEmail);

    // Create user
    const user = new User({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      phone,
      address: address || '',
      userType: 'user',
      token: activationToken,
      activationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    await user.save();

    // Send activation email with Nodemailer
    const activationUrl = `${config.urls.frontend}/activate/${activationToken}`;
    const emailContent = generateActivationEmail(name, activationUrl, 'user');

    // Send email directly to user
    sendNodemailerEmail(normalizedEmail, emailContent.subject, emailContent.html, emailContent.text)
      .then(result => {
        if (result.success) {
          console.log('✅ User activation email sent successfully to:', normalizedEmail);
        } else {
          console.log('⚠️ User activation email failed:', result.error);
        }
      })
      .catch(err => {
        console.log('🔴 Email sending error:', err.message);
      });

    res.status(201).json({
      success: true,
      message: "Account created successfully! Please check your email to activate your account.",
      email: normalizedEmail,
      note: "If you don't see the email, check your spam folder"
    });

  } catch (err) {
    console.error('Signup error:', err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: "Validation failed",
        details: Object.values(err.errors).map(e => e.message)
      });
    }
    
    // Handle duplicate key errors
    if (err.code === 11000) {
      return res.status(400).json({
        error: "Email already registered",
        details: "This email address is already in use"
      });
    }
    
    res.status(500).json({ 
      error: "Internal server error"
    });
  }
});

// User Account Activation
router.get('/user/activate/:token', async (req, res) => {
  try {
    const token = req.params.token;
    
    if (!token) {
      return res.status(400).json({ error: "Activation token is required" });
    }

    const decoded = jwt.verify(token, config.jwt.activationSecret);

    const user = await User.findOneAndUpdate(
      { 
        email: decoded.email, 
        token: token,
        activationTokenExpires: { $gt: new Date() }
      },
      {
        $set: {
          isActivated: true,
          token: null,
          activationTokenExpires: null,
          activatedAt: new Date()
        }
      },
      { new: true }
    );

    if (!user) {
      return res.status(400).json({ 
        error: "Invalid or expired activation link",
        details: "Please request a new activation link"
      });
    }

    const loginToken = jwt.sign({
      email: user.email,
      id: user._id,
      userType: 'user'
    }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    res.status(200).json({
      success: true,
      message: "Account activated successfully!",
      email: user.email,
      userType: "user",
      id: user._id,
      token: loginToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        userType: 'user'
      }
    });

  } catch (err) {
    console.error('Activation error:', err);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(400).json({ 
        error: "Activation link expired",
        details: "Please request a new activation link"
      });
    }
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(400).json({ 
        error: "Invalid activation link",
        details: "The activation link is invalid"
      });
    }
    
    res.status(400).json({ 
      error: "Activation failed",
      details: "Invalid or expired activation link"
    });
  }
});

// PROVIDER AUTHENTICATION ROUTES

// Provider Sign In
router.post('/provider/signin', signinLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const provider = await Provider.findOne({ email: email.toLowerCase() });

    if (!provider) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    if (!provider.isActivated) {
      return res.status(400).json({ 
        error: "Account not activated",
        details: "Please check your email for the activation link" 
      });
    }

    const valid = await bcrypt.compare(password, provider.password);
    if (!valid) {
      console.log(`🔐 Failed provider login attempt for email: ${email}`);
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({
      email: provider.email,
      id: provider._id,
      userType: 'provider'
    }, config.jwt.secret, { 
      expiresIn: config.jwt.expiresIn
    });

    const providerData = {
      id: provider._id,
      name: provider.name,
      email: provider.email,
      phone: provider.phone,
      address: provider.address,
      businessName: provider.businessName,
      businessType: provider.businessType,
      userType: 'provider',
      isActivated: provider.isActivated
    };

    res.status(200).json({
      success: true,
      token,
      user: providerData,
      message: "Login successful"
    });

  } catch (err) {
    console.error('Provider signin error:', err);
    res.status(500).json({ 
      error: "Internal server error"
    });
  }
});

// Provider Sign Up
router.post('/provider/signup', signupLimiter, validateSignup, async (req, res) => {
  try {
    const {
      name, email, password, phone, address,
      businessName, businessType, licenseNumber
    } = req.body;

    console.log('Provider signup attempt:', email);

    const normalizedEmail = email.toLowerCase().trim();
    const providerExist = await Provider.findOne({ email: normalizedEmail });
    if (providerExist) {
      return res.status(400).json({ 
        error: "Email already registered",
        details: "This email address is already associated with a provider account" 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const activationToken = jwt.sign(
      { 
        email: normalizedEmail,
        type: 'activation'
      }, 
      config.jwt.activationSecret, 
      { expiresIn: '24h' }
    );

    console.log('Provider activation token generated for:', normalizedEmail);

    const providerData = {
      name: sanitizeInput(name),
      email: normalizedEmail,
      password: hashedPassword,
      phone,
      address: address || '',
      businessName: businessName || '',
      licenseNumber: licenseNumber || '',
      userType: 'provider',
      token: activationToken,
      activationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };

    if (businessType && businessType.trim() !== '') {
      providerData.businessType = businessType;
    }

    const provider = new Provider(providerData);
    await provider.save();

    // Send activation email directly to provider using Nodemailer
    const activationUrl = `${config.urls.frontend}/activate/${activationToken}`;
    const emailContent = generateActivationEmail(name, activationUrl, 'provider');

    sendNodemailerEmail(normalizedEmail, emailContent.subject, emailContent.html, emailContent.text)
      .then(result => {
        if (result.success) {
          console.log('✅ Provider activation email sent successfully to:', normalizedEmail);
        } else {
          console.log('⚠️ Provider activation email failed:', result.error);
        }
      })
      .catch(err => {
        console.log('🔴 Email sending error:', err.message);
      });

    res.status(201).json({
      success: true,
      message: "Provider account created successfully! Please check your email to activate your account.",
      email: normalizedEmail,
      note: "If you don't see the email, check your spam folder"
    });

  } catch (err) {
    console.error('Provider signup error:', err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: "Validation failed",
        details: Object.values(err.errors).map(e => e.message)
      });
    }
    
    if (err.code === 11000) {
      return res.status(400).json({
        error: "Email already registered",
        details: "This email address is already in use"
      });
    }
    
    res.status(500).json({ 
      error: "Internal server error"
    });
  }
});

// Provider Account Activation
router.get('/provider/activate/:token', async (req, res) => {
  try {
    const token = req.params.token;
    
    if (!token) {
      return res.status(400).json({ error: "Activation token is required" });
    }

    const decoded = jwt.verify(token, config.jwt.activationSecret);

    const provider = await Provider.findOneAndUpdate(
      { 
        email: decoded.email, 
        token: token,
        activationTokenExpires: { $gt: new Date() }
      },
      {
        $set: {
          isActivated: true,
          token: null,
          activationTokenExpires: null,
          activatedAt: new Date()
        }
      },
      { new: true }
    );

    if (!provider) {
      return res.status(400).json({ 
        error: "Invalid or expired activation link",
        details: "Please request a new activation link"
      });
    }

    const loginToken = jwt.sign({
      email: provider.email,
      id: provider._id,
      userType: 'provider'
    }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    res.status(200).json({
      success: true,
      message: "Provider account activated successfully!",
      email: provider.email,
      userType: "provider",
      id: provider._id,
      token: loginToken,
      user: {
        id: provider._id,
        name: provider.name,
        email: provider.email,
        phone: provider.phone,
        address: provider.address,
        businessName: provider.businessName,
        businessType: provider.businessType,
        userType: 'provider'
      }
    });

  } catch (err) {
    console.error('Provider activation error:', err);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(400).json({ 
        error: "Activation link expired",
        details: "Please request a new activation link"
      });
    }
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(400).json({ 
        error: "Invalid activation link",
        details: "The activation link is invalid"
      });
    }
    
    res.status(400).json({ 
      error: "Activation failed",
      details: "Invalid or expired activation link"
    });
  }
});

// ===== Password Reset (User + Provider) =====

// 1) Request reset link
router.post('/password/forgot', passwordResetLimiter, async (req, res) => {
  try {
    const { email, userType } = req.body;
    
    if (!email || !userType) {
      return res.status(400).json({ 
        error: "Missing required fields",
        details: "email and userType are required" 
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const Model = userType === 'provider' ? Provider : User;
    const account = await Model.findOne({ email: email.toLowerCase() });

    // Always respond 200 to prevent account enumeration
    if (!account) {
      return res.status(200).json({ 
        success: true,
        message: "If the email exists, a reset link has been sent." 
      });
    }

    const payload = { 
      email: email.toLowerCase(), 
      userType,
      purpose: 'password_reset'
    };
    
    const token = jwt.sign(payload, config.jwt.resetSecret, { 
      expiresIn: config.jwt.resetExpiresIn 
    });

    account.passwordResetToken = token;
    const expiresMs = getMsFromExpiresIn(config.jwt.resetExpiresIn);
    account.passwordResetExpires = new Date(Date.now() + expiresMs);
    await account.save();

    const frontendBase = (config.urls.frontend || '').replace(/\/+$/, '');
    const resetUrl = `${frontendBase}/reset-password/${token}`;

    // Send reset email directly to user/provider using Nodemailer
    const emailContent = generatePasswordResetEmail(account.name, resetUrl);

    sendNodemailerEmail(email, emailContent.subject, emailContent.html, emailContent.text)
      .then(result => {
        if (result.success) {
          console.log('✅ Password reset email sent successfully to:', email);
        } else {
          console.log('⚠️ Password reset email failed:', result.error);
        }
      })
      .catch(err => {
        console.log('🔴 Email sending error:', err.message);
      });

    return res.status(200).json({ 
      success: true,
      message: "If the email exists, a reset link has been sent.",
      note: "Check your email and also your spam folder"
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ 
      error: "Internal server error"
    });
  }
});

// 2) Reset password
router.post('/password/reset', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ 
        error: "Missing required fields",
        details: "token and password are required" 
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({ 
        error: "Invalid password",
        details: "Password must be at least 6 characters long" 
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.resetSecret);
    } catch (e) {
      return res.status(400).json({ 
        error: "Invalid or expired token",
        details: "Please request a new password reset link" 
      });
    }

    const Model = decoded.userType === 'provider' ? Provider : User;
    const account = await Model.findOne({ 
      email: decoded.email, 
      passwordResetToken: token 
    });

    if (!account || !account.passwordResetExpires || account.passwordResetExpires < new Date()) {
      return res.status(400).json({ 
        error: "Invalid or expired token",
        details: "Please request a new password reset link" 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    account.password = hashedPassword;
    account.passwordResetToken = null;
    account.passwordResetExpires = null;
    await account.save();

    return res.status(200).json({ 
      success: true,
      message: "Password updated successfully",
      note: "You can now log in with your new password"
    });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ 
      error: "Internal server error"
    });
  }
});

// 2b) Verify reset token (for frontend pre-check)
router.get('/password/reset/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({ 
        valid: false, 
        error: "Token is required" 
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.resetSecret);
    } catch (e) {
      return res.status(400).json({ 
        valid: false, 
        error: "Invalid or expired token" 
      });
    }

    const Model = decoded.userType === 'provider' ? Provider : User;
    const account = await Model.findOne({ 
      email: decoded.email, 
      passwordResetToken: token 
    });
    
    if (!account || !account.passwordResetExpires || account.passwordResetExpires < new Date()) {
      return res.status(400).json({ 
        valid: false, 
        error: "Invalid or expired token" 
      });
    }

    return res.status(200).json({ 
      valid: true, 
      userType: decoded.userType,
      email: decoded.email
    });
  } catch (err) {
    console.error('Verify reset token error:', err);
    return res.status(500).json({ 
      valid: false, 
      error: "Internal server error"
    });
  }
});

// Password verification endpoint for profile updates
router.post('/verify-password', async (req, res) => {
  try {
    const { email, password, userType } = req.body;

    console.log('Password verification request:', { email, userType });

    if (!email || !password || !userType) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        details: "Email, password, and userType are required"
      });
    }

    let user;
    if (userType === 'provider') {
      user = await Provider.findOne({ email: email.toLowerCase() });
    } else {
      user = await User.findOne({ email: email.toLowerCase() });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    res.json({
      success: true,
      isValid: isValidPassword
    });

  } catch (err) {
    console.error('Password verification error:', err);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

// Resend activation email endpoint
router.post('/resend-activation', async (req, res) => {
  try {
    const { email, userType } = req.body;

    if (!email || !userType) {
      return res.status(400).json({
        error: "Missing required fields",
        details: "Email and userType are required"
      });
    }

    const Model = userType === 'provider' ? Provider : User;
    const account = await Model.findOne({ email: email.toLowerCase() });

    if (!account) {
      return res.status(404).json({
        error: "Account not found",
        details: "No account found with this email address"
      });
    }

    if (account.isActivated) {
      return res.status(400).json({
        error: "Account already activated",
        details: "This account is already activated"
      });
    }

    // Generate new activation token
    const activationToken = jwt.sign(
      { 
        email: email.toLowerCase(),
        type: 'activation'
      }, 
      config.jwt.activationSecret, 
      { expiresIn: '24h' }
    );

    // Update account with new token
    account.token = activationToken;
    account.activationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await account.save();

    // Send activation email directly to user/provider using Nodemailer
    const activationUrl = `${config.urls.frontend}/activate/${activationToken}`;
    const emailContent = generateActivationEmail(account.name, activationUrl, userType);

    const emailResult = await sendNodemailerEmail(email, emailContent.subject, emailContent.html, emailContent.text);

    if (emailResult.success) {
      res.json({
        success: true,
        message: "Activation email sent successfully",
        note: "Check your email and also your spam folder"
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to send activation email",
        details: emailResult.error
      });
    }

  } catch (err) {
    console.error('Resend activation error:', err);
    res.status(500).json({
      error: "Internal server error"
    });
  }
});

// Health check for auth routes
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Authentication API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    features: {
      userAuth: true,
      providerAuth: true,
      emailService: !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD),
      passwordReset: true,
      rateLimiting: true
    }
  });
});

module.exports = router;