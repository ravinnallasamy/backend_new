const express = require('express');
const router = express.Router();
const User = require('../model/user');
const Provider = require('../model/provider');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('../config/config');

// Validate configuration on startup
config.validate();

// EmailJS configuration
const emailjsConfig = {
  serviceId: process.env.EMAILJS_SERVICE_ID,
  activationTemplateId: process.env.EMAILJS_ACTIVATION_TEMPLATE_ID,
  resetTemplateId: process.env.EMAILJS_RESET_TEMPLATE_ID,
  publicKey: process.env.EMAILJS_PUBLIC_KEY,
  privateKey: process.env.EMAILJS_PRIVATE_KEY,
};

// Helper function to send emails with EmailJS REST API
async function sendEmailJS(templateId, templateParams) {
  try {
    console.log('🔄 Sending email via EmailJS REST API...');
    console.log('Template ID:', templateId);
    console.log('To email:', templateParams.to_email);
    
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify({
        service_id: emailjsConfig.serviceId,
        template_id: templateId,
        user_id: emailjsConfig.publicKey,
        accessToken: emailjsConfig.privateKey,
        template_params: templateParams
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Email sent successfully via EmailJS');
      return { success: true, data: result };
    } else {
      console.error('❌ EmailJS API error:', result);
      return { success: false, error: result };
    }
  } catch (error) {
    console.error('❌ EmailJS network error:', error);
    return { success: false, error: error.message };
  }
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
    console.error(err);
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

    // Send activation email with EmailJS
    const templateParams = {
      to_email: email,
      name: name,
      activation_url: `${config.urls.frontend}/?activate=${activationToken}`,
      email: email,
    };

    // Send email but don't block response
    sendEmailJS(emailjsConfig.activationTemplateId, templateParams)
      .then(result => {
        if (result.success) {
          console.log('✅ User activation email sent successfully');
        } else {
          console.log('⚠️ User activation email failed:', result.error);
        }
      })
      .catch(err => {
        console.error('Email sending error:', err);
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

    // Send activation email with EmailJS
    const templateParams = {
      to_email: email,
      name: name,
      activation_url: `${config.urls.frontend}/?activate=${activationToken}`,
      email: email,
      business_name: businessName || 'Not specified'
    };

    // Send email but don't block response
    sendEmailJS(emailjsConfig.activationTemplateId, templateParams)
      .then(result => {
        if (result.success) {
          console.log('✅ Provider activation email sent successfully');
        } else {
          console.log('⚠️ Provider activation email failed:', result.error);
        }
      })
      .catch(err => {
        console.error('Email sending error:', err);
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

    // Send reset email with EmailJS
    const templateParams = {
      to_email: email,
      name: account.name,
      reset_url: resetUrl,
      email: email,
      time: new Date().toLocaleString(),
    };

    // Send email but don't block response
    sendEmailJS(emailjsConfig.resetTemplateId, templateParams)
      .then(result => {
        if (result.success) {
          console.log('✅ Password reset email sent successfully');
        } else {
          console.log('⚠️ Password reset email failed:', result.error);
        }
      })
      .catch(err => {
        console.error('Reset email error:', err);
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