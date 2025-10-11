const express = require('express');
const router = express.Router();
const User = require('../model/user');
const Provider = require('../model/provider');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('../config/config');
const { Resend } = require('resend');
const rateLimit = require('express-rate-limit');

// Add global error handlers to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.log('🔄 Unhandled Rejection caught:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('🔄 Uncaught Exception caught:', error.message);
  if (error.message.includes('email') || error.message.includes('fetch') || error.message.includes('Resend')) {
    console.log('📧 Email error handled gracefully, continuing...');
    return;
  }
  console.error('🔴 Critical error, exiting:', error);
  process.exit(1);
});

// Validate configuration on startup
config.validate();

// Resend configuration
const resend = new Resend(process.env.RESEND_API_KEY);

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

// Enhanced email sending function with comprehensive features
async function sendResendEmail(to, subject, html, text = null) {
  try {
    // Test mode - don't send actual emails in test environment
    if (process.env.NODE_ENV === 'test') {
      console.log('📧 TEST MODE: Email would be sent to:', to);
      return { success: true, data: { id: 'test-mode', test: true } };
    }

    // Development mode logging
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Attempting to send email via Resend...');
      console.log('📧 To:', to);
      console.log('📋 Subject:', subject);
    }

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

    const emailData = {
      from: process.env.RESEND_FROM_EMAIL || 'Uzhavan Rentals <onboarding@resend.dev>',
      to: to,
      subject: subject.substring(0, 78), // Limit subject length
      html: html,
    };

    // Add text version if provided
    if (text) {
      emailData.text = text.substring(0, 100000); // Limit text length
    }

    // Add headers for tracking
    emailData.headers = {
      'X-Application': 'Uzhavan-Rentals',
      'X-Environment': process.env.NODE_ENV || 'development',
    };

    const { data, error } = await resend.emails.send(emailData);

    if (error) {
      console.log('❌ Resend API error:', error);
      
      // Categorize errors for better handling
      const errorCategories = {
        'validation_error': 'Email validation failed',
        'rate_limit_exceeded': 'Email rate limit exceeded',
        'invalid_api_key': 'Invalid Resend API key',
        'domain_not_verified': 'Domain not verified in Resend'
      };
      
      let errorMessage = error.message;
      for (const [key, message] of Object.entries(errorCategories)) {
        if (error.message.includes(key)) {
          errorMessage = message;
          break;
        }
      }
      
      return { success: false, error: errorMessage, details: error };
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Email sent successfully via Resend, ID:', data?.id);
    }

    return { success: true, data: data };
    
  } catch (error) {
    console.log('⚠️ Resend request failed (non-critical):', error.message);
    return { 
      success: false, 
      error: 'Email service temporarily unavailable',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
          .social-links { margin: 20px 0; }
          .social-links a { color: #4CAF50; text-decoration: none; margin: 0 10px; }
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
            <p>Thank you for registering as a ${typeText} with Uzhavan Rentals! We're excited to have you join our agricultural community.</p>
            
            <p>To get started and access all features, please activate your account by clicking the button below:</p>
            
            <p style="text-align: center;">
              <a href="${activationUrl}" class="button">Activate Your Account</a>
            </p>
            
            <div class="warning">
              <strong>⚠️ Important:</strong> This activation link will expire in 24 hours for security reasons.
            </div>
            
            <p>If the button doesn't work, copy and paste the following URL into your browser:</p>
            <div class="code-block">${activationUrl}</div>
            
            <p>Once activated, you'll be able to:</p>
            <ul style="margin: 15px 0; padding-left: 20px;">
              ${userType === 'provider' 
                ? '<li>List your equipment for rent</li><li>Manage rental requests</li><li>Connect with farmers</li><li>Grow your business</li>'
                : '<li>Browse available equipment</li><li>Make rental requests</li><li>Contact providers</li><li>Manage your rentals</li>'
              }
            </ul>
            
            <p>If you didn't create this account, please ignore this email. Your email address will not be used for any other purpose.</p>
            
            <div class="social-links">
              <p>Need help? Contact our support team:</p>
              <p>📧 <a href="mailto:support@uzhavanrentals.com">support@uzhavanrentals.com</a></p>
            </div>
          </div>
          
          <div class="footer">
            <p>&copy; ${currentYear} Uzhavan Rentals. All rights reserved.</p>
            <p>Building a stronger agricultural community together.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Welcome to Uzhavan Rentals!

      Hello ${name},

      Thank you for registering as a ${typeText} with Uzhavan Rentals!

      To activate your account, please visit the following link:
      ${activationUrl}

      This activation link will expire in 24 hours.

      Once activated, you'll be able to:
      ${userType === 'provider' 
        ? '- List your equipment for rent\n- Manage rental requests\n- Connect with farmers\n- Grow your business'
        : '- Browse available equipment\n- Make rental requests\n- Contact providers\n- Manage your rentals'
      }

      If you didn't create this account, please ignore this email.

      Need help? Contact our support team: support@uzhavanrentals.com

      © ${currentYear} Uzhavan Rentals. All rights reserved.
      Building a stronger agricultural community together.
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
          .security-note { background: #e8f5e8; border: 1px solid #c8e6c9; padding: 15px; border-radius: 6px; margin: 20px 0; }
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
            <p>We received a request to reset your password for your Uzhavan Rentals account.</p>
            
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Your Password</a>
            </p>
            
            <div class="warning">
              <strong>🔒 Security Notice:</strong> This password reset link will expire in 1 hour for your protection.
            </div>
            
            <p>If the button doesn't work, copy and paste this URL into your browser:</p>
            <div class="code-block">${resetUrl}</div>
            
            <div class="security-note">
              <strong>💡 Important:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Never share your password with anyone</li>
                <li>Use a strong, unique password</li>
                <li>Enable two-factor authentication if available</li>
              </ul>
            </div>
            
            <p>If you didn't request this password reset, please ignore this email. Your account remains secure, and no changes have been made.</p>
            
            <p>For security reasons, this request was initiated from IP: [System will log this automatically]</p>
          </div>
          
          <div class="footer">
            <p>&copy; ${currentYear} Uzhavan Rentals. All rights reserved.</p>
            <p>Protecting your account security is our priority.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Password Reset Request - Uzhavan Rentals

      Hello ${name},

      We received a request to reset your password for your Uzhavan Rentals account.

      To reset your password, visit this link:
      ${resetUrl}

      🔒 Security Notice: This password reset link will expire in 1 hour.

      If the link doesn't work, copy and paste the URL into your browser.

      💡 Security Tips:
      - Never share your password with anyone
      - Use a strong, unique password
      - Enable two-factor authentication if available

      If you didn't request this password reset, please ignore this email. Your account remains secure.

      © ${currentYear} Uzhavan Rentals. All rights reserved.
      Protecting your account security is our priority.
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
  
  if (name.length < 2 || name.length > 50) {
    return res.status(400).json({ error: "Name must be between 2 and 50 characters" });
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
      // Log failed login attempt
      console.log(`🔐 Failed login attempt for email: ${email}`);
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Generate secure token
    const token = jwt.sign({
      email: user.email,
      id: user._id,
      userType: 'user',
      sessionId: generateStrongToken()
    }, config.jwt.secret, { 
      expiresIn: config.jwt.expiresIn,
      issuer: 'uzhavan-rentals',
      subject: user._id.toString()
    });

    // Update last login
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    // Return user data for frontend (exclude sensitive info)
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      userType: 'user',
      isActivated: user.isActivated,
      createdAt: user.createdAt
    };

    res.status(200).json({
      success: true,
      token,
      user: userData,
      message: "Login successful",
      expiresIn: config.jwt.expiresIn
    });

  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json({ 
      error: "Internal server error",
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }
});

// User Sign Up
router.post('/user/signup', signupLimiter, validateSignup, async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    console.log('User signup attempt:', email);

    // Check if user already exists
    const userExist = await User.findOne({ email: email.toLowerCase() });
    if (userExist) {
      return res.status(400).json({ 
        error: "Email already registered",
        details: "This email address is already associated with an account" 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    const activationToken = jwt.sign(
      { 
        email: email.toLowerCase(),
        type: 'activation',
        timestamp: Date.now()
      }, 
      config.jwt.activationSecret, 
      { expiresIn: '24h' }
    );

    console.log('Activation token generated for:', email);

    // Create user
    const user = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      address: address || '',
      userType: 'user',
      token: activationToken,
      activationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    await user.save();

    // Send activation email with Resend (non-blocking)
    const activationUrl = `${config.urls.frontend}/activate/${activationToken}`;
    const emailContent = generateActivationEmail(name, activationUrl, 'user');

    // Send email in background
    sendResendEmail(email, emailContent.subject, emailContent.html, emailContent.text)
      .then(result => {
        if (result.success) {
          console.log('✅ User activation email sent successfully to:', email);
        } else {
          console.log('⚠️ User activation email failed:', result.error);
          // You might want to log this to a monitoring service
        }
      })
      .catch(err => {
        console.log('🔴 Email sending error:', err.message);
      });

    res.status(201).json({
      success: true,
      message: "Account created successfully! Please check your email to activate your account.",
      email: email,
      note: "If you don't see the email, check your spam folder"
    });

  } catch (err) {
    console.error('Signup error:', err);
    
    // Handle specific errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: "Validation failed",
        details: Object.values(err.errors).map(e => e.message)
      });
    }
    
    res.status(500).json({ 
      error: "Internal server error",
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
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
        details: "Please request a new activation link if this one has expired"
      });
    }

    // Generate login token for automatic login after activation
    const loginToken = jwt.sign({
      email: user.email,
      id: user._id,
      userType: 'user'
    }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    // Return success response
    res.status(200).json({
      success: true,
      message: "Account activated successfully! You can now log in to your account.",
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
        details: "Please request a new activation link from the signin page"
      });
    }
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(400).json({ 
        error: "Invalid activation link",
        details: "The activation link is invalid or has already been used"
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
      userType: 'provider',
      sessionId: generateStrongToken()
    }, config.jwt.secret, { 
      expiresIn: config.jwt.expiresIn,
      issuer: 'uzhavan-rentals',
      subject: provider._id.toString()
    });

    // Update last login
    await Provider.findByIdAndUpdate(provider._id, { lastLogin: new Date() });

    const providerData = {
      id: provider._id,
      name: provider.name,
      email: provider.email,
      phone: provider.phone,
      address: provider.address,
      businessName: provider.businessName,
      businessType: provider.businessType,
      userType: 'provider',
      isActivated: provider.isActivated,
      createdAt: provider.createdAt
    };

    res.status(200).json({
      success: true,
      token,
      user: providerData,
      message: "Login successful",
      expiresIn: config.jwt.expiresIn
    });

  } catch (err) {
    console.error('Provider signin error:', err);
    res.status(500).json({ 
      error: "Internal server error",
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
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

    const providerExist = await Provider.findOne({ email: email.toLowerCase() });
    if (providerExist) {
      return res.status(400).json({ 
        error: "Email already registered",
        details: "This email address is already associated with a provider account" 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const activationToken = jwt.sign(
      { 
        email: email.toLowerCase(),
        type: 'activation',
        timestamp: Date.now()
      }, 
      config.jwt.activationSecret, 
      { expiresIn: '24h' }
    );

    console.log('Provider activation token generated for:', email);

    const providerData = {
      name: sanitizeInput(name),
      email: email.toLowerCase(),
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

    // Send activation email
    const activationUrl = `${config.urls.frontend}/activate/${activationToken}`;
    const emailContent = generateActivationEmail(name, activationUrl, 'provider');

    sendResendEmail(email, emailContent.subject, emailContent.html, emailContent.text)
      .then(result => {
        if (result.success) {
          console.log('✅ Provider activation email sent successfully to:', email);
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
      email: email,
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
    
    res.status(500).json({ 
      error: "Internal server error",
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
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
        details: "Please request a new activation link if this one has expired"
      });
    }

    const loginToken = jwt.sign({
      email: provider.email,
      id: provider._id,
      userType: 'provider'
    }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    res.status(200).json({
      success: true,
      message: "Provider account activated successfully! You can now log in to your account.",
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
        details: "Please request a new activation link from the signin page"
      });
    }
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(400).json({ 
        error: "Invalid activation link",
        details: "The activation link is invalid or has already been used"
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

    // Check if there's already a valid reset token
    if (account.passwordResetExpires && account.passwordResetExpires > new Date()) {
      return res.status(200).json({
        success: true,
        message: "A password reset link has already been sent. Please check your email.",
        note: "Previous reset link is still valid for 1 hour"
      });
    }

    const payload = { 
      email: email.toLowerCase(), 
      userType,
      purpose: 'password_reset',
      timestamp: Date.now()
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

    // Send reset email
    const emailContent = generatePasswordResetEmail(account.name, resetUrl);

    sendResendEmail(email, emailContent.subject, emailContent.html, emailContent.text)
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
      error: "Internal server error",
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
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
    account.lastPasswordChange = new Date();
    await account.save();

    // Send confirmation email (optional)
    const confirmationEmail = {
      subject: 'Password Updated Successfully - Uzhavan Rentals',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #4CAF50; color: white; padding: 20px; text-align: center;">
            <h1>Password Updated Successfully</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>Hello ${account.name},</h2>
            <p>Your password has been successfully updated for your Uzhavan Rentals account.</p>
            <p>If you did not make this change, please contact our support team immediately.</p>
            <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>Security Tip:</strong> Always use a strong, unique password and enable two-factor authentication when available.
            </div>
          </div>
        </div>
      `,
      text: `
        Password Updated Successfully

        Hello ${account.name},

        Your password has been successfully updated for your Uzhavan Rentals account.

        If you did not make this change, please contact our support team immediately.

        Security Tip: Always use a strong, unique password and enable two-factor authentication when available.
      `
    };

    // Send confirmation in background
    sendResendEmail(account.email, confirmationEmail.subject, confirmationEmail.html, confirmationEmail.text)
      .then(result => {
        if (result.success) {
          console.log('✅ Password change confirmation sent to:', account.email);
        }
      });

    return res.status(200).json({ 
      success: true,
      message: "Password updated successfully",
      note: "You can now log in with your new password"
    });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ 
      error: "Internal server error",
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
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
      error: "Internal server error",
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
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
      error: "Internal server error",
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
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
        type: 'activation',
        timestamp: Date.now()
      }, 
      config.jwt.activationSecret, 
      { expiresIn: '24h' }
    );

    // Update account with new token
    account.token = activationToken;
    account.activationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await account.save();

    // Send activation email
    const activationUrl = `${config.urls.frontend}/activate/${activationToken}`;
    const emailContent = generateActivationEmail(account.name, activationUrl, userType);

    const emailResult = await sendResendEmail(email, emailContent.subject, emailContent.html, emailContent.text);

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
      error: "Internal server error",
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
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
      emailService: config.isEmailConfigured(),
      passwordReset: true,
      rateLimiting: true
    }
  });
});

module.exports = router;