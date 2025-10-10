const express = require('express');
const router = express.Router();
const User = require('../model/user');
const Provider = require('../model/provider');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('../config/config');
const { Resend } = require('resend');

// Add global error handlers to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.log('🔄 Unhandled Rejection caught:', reason);
  // Don't exit the process - just log it
});

process.on('uncaughtException', (error) => {
  console.error('🔄 Uncaught Exception caught:', error.message);
  // Don't exit the process for email-related errors
  if (error.message.includes('email') || error.message.includes('fetch') || error.message.includes('Resend')) {
    console.log('📧 Email error handled gracefully, continuing...');
    return;
  }
  // Only exit for critical errors
  console.error('🔴 Critical error, exiting:', error);
  process.exit(1);
});

// Validate configuration on startup
config.validate();

// Resend configuration
const resend = new Resend(process.env.RESEND_API_KEY);

// Safe email sending function with comprehensive error handling
async function sendResendEmail(to, subject, html, text = null) {
  try {
    console.log('🔄 Attempting to send email via Resend...');
    console.log('📧 To:', to);
    console.log('📋 Subject:', subject);
    
    // Validate required parameters
    if (!to || !subject || !html) {
      console.log('⚠️ Missing required email parameters');
      return { success: false, error: 'Missing required parameters' };
    }

    const emailData = {
      from: process.env.RESEND_FROM_EMAIL || 'Acme <onboarding@resend.dev>',
      to: to,
      subject: subject,
      html: html,
    };

    // Add text version if provided
    if (text) {
      emailData.text = text;
    }

    const { data, error } = await resend.emails.send(emailData);

    if (error) {
      console.log('❌ Resend API error:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Email sent successfully via Resend, ID:', data?.id);
    return { success: true, data: data };
    
  } catch (error) {
    console.log('⚠️ Resend request failed (non-critical):', error.message);
    return { success: false, error: error.message };
  }
}

// Email template functions
function generateActivationEmail(name, activationUrl, userType = 'user') {
  const typeText = userType === 'provider' ? 'Provider' : 'User';
  
  return {
    subject: `Activate Your ${typeText} Account`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Account Activation</h1>
          </div>
          <div class="content">
            <h2>Hello ${name},</h2>
            <p>Thank you for registering as a ${userType} with our service. To complete your registration, please activate your account by clicking the button below:</p>
            
            <p style="text-align: center; margin: 30px 0;">
              <a href="${activationUrl}" class="button">Activate Your Account</a>
            </p>
            
            <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
            <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 4px;">${activationUrl}</p>
            
            <p>This activation link will expire in 24 hours.</p>
            
            <p>If you didn't create an account, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Hello ${name},

      Thank you for registering as a ${userType} with our service. To complete your registration, please activate your account by visiting the following link:

      ${activationUrl}

      This activation link will expire in 24 hours.

      If you didn't create an account, please ignore this email.

      Best regards,
      Your Company Name
    `
  };
}

function generatePasswordResetEmail(name, resetUrl) {
  return {
    subject: 'Password Reset Request',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #DC2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { background: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          .warning { background: #FEF2F2; border-left: 4px solid #DC2626; padding: 10px 15px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset</h1>
          </div>
          <div class="content">
            <h2>Hello ${name},</h2>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            
            <p style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" class="button">Reset Your Password</a>
            </p>
            
            <div class="warning">
              <p><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>
            </div>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 4px;">${resetUrl}</p>
            
            <p>If you didn't request a password reset, please ignore this email. Your account remains secure.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Hello ${name},

      We received a request to reset your password. Visit the following link to create a new password:

      ${resetUrl}

      Important: This link will expire in 1 hour for security reasons.

      If you didn't request a password reset, please ignore this email. Your account remains secure.

      Best regards,
      Your Company Name
    `
  };
}

// USER AUTHENTICATION ROUTES

// User Sign In
router.post('/user/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json("Email and password are required");
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json("User not found");
    }

    if (!user.isActivated) {
      return res.status(400).json("Account not activated. Please check your email.");
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json("Invalid password");
    }

    const token = jwt.sign({
      email: user.email,
      id: user._id,
      userType: 'user'
    }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    // Return user data for frontend
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      userType: 'user'
    };

    res.status(200).json({
      token,
      user: userData,
      message: "Login successful"
    });

  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json("Internal Server Error");
  }
});

// User Sign Up
router.post('/user/signup', async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    console.log('User signup attempt:', email);

    const userExist = await User.findOne({ email });
    if (userExist) {
      return res.status(400).json("User email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const activationToken = jwt.sign({ email }, config.jwt.activationSecret);

    console.log('Activation token generated:', activationToken);

    // Create user first
    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      address,
      userType: 'user',
      token: activationToken
    });

    await user.save();

    // Send activation email with Resend (non-blocking)
    const activationUrl = `${config.urls.frontend}/?activate=${activationToken}`;
    const emailContent = generateActivationEmail(name, activationUrl, 'user');

    // Send email in background - don't await
    sendResendEmail(email, emailContent.subject, emailContent.html, emailContent.text)
      .then(result => {
        if (result.success) {
          console.log('✅ User activation email sent successfully');
        } else {
          console.log('⚠️ User activation email failed (user still created):', result.error);
        }
      })
      .catch(err => {
        console.log('🔴 Email sending error (non-critical):', err.message);
      });

    res.status(201).json({
      "message": "Account created successfully! Please check your email to activate your account.",
      "email": email
    });

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ "message": "Internal server error" });
  }
});

// User Account Activation
router.get('/user/activate/:token', async (req, res) => {
  try {
    const token = req.params.token;
    const decoded = jwt.verify(token, config.jwt.activationSecret);

    const user = await User.findOneAndUpdate(
      { email: decoded.email, token: token },
      {
        $set: {
          isActivated: true,
          token: null
        }
      },
      { new: true }
    );

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired activation link" });
    }

    // Return JSON response for frontend to handle
    res.status(200).json({
      message: "Account activated successfully!",
      email: user.email,
      userType: "user",
      id: user._id
    });

  } catch (err) {
    console.error('Activation error:', err);
    res.status(400).json({ message: "Invalid or expired activation link" });
  }
});

// PROVIDER AUTHENTICATION ROUTES

// Provider Sign In
router.post('/provider/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json("Email and password are required");
    }

    const provider = await Provider.findOne({ email });

    if (!provider) {
      return res.status(400).json("Provider not found");
    }

    if (!provider.isActivated) {
      return res.status(400).json("Account not activated. Please check your email.");
    }

    const valid = await bcrypt.compare(password, provider.password);
    if (!valid) {
      return res.status(400).json("Invalid password");
    }

    const token = jwt.sign({
      email: provider.email,
      id: provider._id,
      userType: 'provider'
    }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    // Return provider data for frontend
    const providerData = {
      id: provider._id,
      name: provider.name,
      email: provider.email,
      phone: provider.phone,
      address: provider.address,
      businessName: provider.businessName,
      businessType: provider.businessType,
      userType: 'provider'
    };

    res.status(200).json({
      token,
      user: providerData,
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
    const {
      name, email, password, phone, address,
      businessName, businessType, licenseNumber
    } = req.body;

    console.log('Provider signup attempt:', email);

    const providerExist = await Provider.findOne({ email });
    if (providerExist) {
      return res.status(400).json("Provider email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const activationToken = jwt.sign({ email }, config.jwt.activationSecret);

    console.log('Provider activation token generated:', activationToken);

    // Prepare provider data with proper defaults
    const providerData = {
      name,
      email,
      password: hashedPassword,
      phone,
      address,
      businessName: businessName || '',
      licenseNumber: licenseNumber || '',
      userType: 'provider',
      token: activationToken
    };

    // Only set businessType if it's not empty, let the model handle the default
    if (businessType && businessType.trim() !== '') {
      providerData.businessType = businessType;
    }

    const provider = new Provider(providerData);
    await provider.save();

    // Send activation email with Resend (non-blocking)
    const activationUrl = `${config.urls.frontend}/?activate=${activationToken}`;
    const emailContent = generateActivationEmail(name, activationUrl, 'provider');

    // Send email in background - don't await
    sendResendEmail(email, emailContent.subject, emailContent.html, emailContent.text)
      .then(result => {
        if (result.success) {
          console.log('✅ Provider activation email sent successfully');
        } else {
          console.log('⚠️ Provider activation email failed (provider still created):', result.error);
        }
      })
      .catch(err => {
        console.log('🔴 Email sending error (non-critical):', err.message);
      });

    res.status(201).json({
      "message": "Provider account created successfully! Please check your email to activate your account.",
      "email": email
    });

  } catch (err) {
    console.error('Provider signup error:', err);
    res.status(500).json({ "message": "Internal server error" });
  }
});

// Provider Account Activation
router.get('/provider/activate/:token', async (req, res) => {
  try {
    const token = req.params.token;
    const decoded = jwt.verify(token, config.jwt.activationSecret);

    const provider = await Provider.findOneAndUpdate(
      { email: decoded.email, token: token },
      {
        $set: {
          isActivated: true,
          token: null
        }
      },
      { new: true }
    );

    if (!provider) {
      return res.status(400).json({ message: "Invalid or expired activation link" });
    }

    // Return JSON response for frontend to handle
    res.status(200).json({
      message: "Provider account activated successfully!",
      email: provider.email,
      userType: "provider",
      id: provider._id
    });

  } catch (err) {
    console.error('Provider activation error:', err);
    res.status(400).json({ message: "Invalid or expired activation link" });
  }
});

// ===== Password Reset (User + Provider) =====
// helper to convert expiresIn like '1h', '30m', '1d' to ms
function getMsFromExpiresIn(v) {
  if (typeof v !== 'string') return 3600000;
  const m = v.trim().match(/^(\d+)([smhd])$/i);
  if (!m) return 3600000;
  const num = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  const map = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return num * (map[unit] || 3600000);
}

// 1) Request reset link
router.post('/password/forgot', async (req, res) => {
  try {
    const { email, userType } = req.body;
    if (!email || !userType) {
      return res.status(400).json({ message: 'email and userType are required' });
    }

    const Model = userType === 'provider' ? Provider : User;
    const account = await Model.findOne({ email });

    // Always respond 200 to prevent account enumeration
    if (!account) {
      return res.status(200).json({ message: 'If the email exists, a reset link has been sent.' });
    }

    const payload = { email, userType };
    const token = jwt.sign(payload, config.jwt.resetSecret, { expiresIn: config.jwt.resetExpiresIn });

    account.passwordResetToken = token;
    const expiresMs = getMsFromExpiresIn(config.jwt.resetExpiresIn);
    account.passwordResetExpires = new Date(Date.now() + expiresMs);
    await account.save();

    const frontendBase = (config.urls.frontend || '').replace(/\/+$/, '');
    const resetUrl = `${frontendBase}/reset-password/${token}`;

    // Send reset email with Resend (non-blocking)
    const emailContent = generatePasswordResetEmail(account.name, resetUrl);

    // Send email in background - don't await
    sendResendEmail(email, emailContent.subject, emailContent.html, emailContent.text)
      .then(result => {
        if (result.success) {
          console.log('✅ Password reset email sent successfully');
        } else {
          console.log('⚠️ Password reset email failed:', result.error);
        }
      })
      .catch(err => {
        console.log('🔴 Email sending error (non-critical):', err.message);
      });

    return res.status(200).json({ message: 'If the email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// 2) Reset password
router.post('/password/reset', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: 'token and password are required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.resetSecret);
    } catch (e) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    const Model = decoded.userType === 'provider' ? Provider : User;
    const account = await Model.findOne({ email: decoded.email, passwordResetToken: token });

    if (!account || !account.passwordResetExpires || account.passwordResetExpires < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    account.password = hashedPassword;
    account.passwordResetToken = null;
    account.passwordResetExpires = null;
    await account.save();

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// 2b) Verify reset token (for frontend pre-check)
router.get('/password/reset/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.resetSecret);
    } catch (e) {
      return res.status(400).json({ valid: false, message: 'Invalid or expired token' });
    }

    const Model = decoded.userType === 'provider' ? Provider : User;
    const account = await Model.findOne({ email: decoded.email, passwordResetToken: token });
    if (!account || !account.passwordResetExpires || account.passwordResetExpires < new Date()) {
      return res.status(400).json({ valid: false, message: 'Invalid or expired token' });
    }

    return res.status(200).json({ valid: true, userType: decoded.userType });
  } catch (err) {
    console.error('Verify reset token error:', err);
    return res.status(500).json({ valid: false, message: 'Internal server error' });
  }
});

// Password verification endpoint for profile updates
router.post('/verify-password', async (req, res) => {
  try {
    const { email, password, userType } = req.body;

    console.log('Password verification request:', { email, userType, hasPassword: !!password });

    if (!email || !password || !userType) {
      console.log('Missing required fields:', { email: !!email, password: !!password, userType: !!userType });
      return res.status(400).json({
        success: false,
        message: "Email, password, and userType are required",
        received: { email: !!email, password: !!password, userType: !!userType }
      });
    }

    let user;
    if (userType === 'provider') {
      user = await Provider.findOne({ email });
    } else {
      user = await User.findOne({ email });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
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
      message: "Internal server error"
    });
  }
});

module.exports = router;