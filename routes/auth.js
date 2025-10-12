const express = require('express');
const router = express.Router();
const User = require('../model/user');
const Provider = require('../model/provider');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const rateLimit = require('express-rate-limit');
const { validateGoogleToken } = require('../middleware/auth');

// Rate limiting configurations
const signinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 login attempts per windowMs
  message: { 
    error: "Too many login attempts from this IP, please try again after 15 minutes",
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

function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
}

// ===== GOOGLE OAUTH ROUTES =====

// User Google OAuth Signin/Signup
router.post('/user/google', signinLimiter, validateGoogleToken, async (req, res) => {
  try {
    const { email, name, picture, googleId, email_verified } = req.googleUser;
    
    console.log('✅ Google token verified for user:', email);

    // Check if user exists
    let user = await User.findOne({ 
      $or: [
        { email: email.toLowerCase() },
        { googleId: googleId }
      ]
    });

    const isNewUser = !user;

    if (user) {
      // Existing user - update profile if needed
      if (!user.googleId) {
        user.googleId = googleId;
      }
      if (!user.avatar) {
        user.avatar = picture;
      }
      if (!user.isActivated) {
        user.isActivated = true;
        user.activatedAt = new Date();
      }
      await user.save();
      console.log('✅ User logged in via Google OAuth:', email);
    } else {
      // New user - create account automatically
      user = new User({
        name: sanitizeInput(name),
        email: email.toLowerCase(),
        googleId,
        avatar: picture,
        isActivated: true, // Google emails are pre-verified
        userType: 'user',
        authMethod: 'google',
        activatedAt: new Date()
      });
      await user.save();
      console.log('✅ New user created via Google OAuth:', email);
    }

    // Generate JWT token
    const jwtToken = jwt.sign({
      email: user.email,
      id: user._id,
      userType: 'user',
      authMethod: 'google'
    }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      phone: user.phone || '',
      address: user.address || '',
      userType: 'user',
      isActivated: true,
      authMethod: 'google'
    };

    res.status(200).json({
      success: true,
      token: jwtToken,
      user: userData,
      isNewUser: isNewUser,
      message: isNewUser ? "Account created successfully!" : "Login successful!"
    });

  } catch (err) {
    console.error('Google OAuth error:', err);
    
    if (err.message.includes('Token used too late')) {
      return res.status(400).json({ 
        error: "Google token expired",
        details: "Please sign in with Google again"
      });
    }
    
    if (err.message.includes('Wrong number of segments')) {
      return res.status(400).json({ 
        error: "Invalid Google token",
        details: "The provided token is invalid"
      });
    }
    
    res.status(400).json({ 
      error: "Google authentication failed",
      details: "Please try signing in with Google again"
    });
  }
});

// Provider Google OAuth Signin/Signup
router.post('/provider/google', signinLimiter, validateGoogleToken, async (req, res) => {
  try {
    const { email, name, picture, googleId, email_verified } = req.googleUser;
    
    console.log('✅ Google token verified for provider:', email);

    // Check if provider exists
    let provider = await Provider.findOne({ 
      $or: [
        { email: email.toLowerCase() },
        { googleId: googleId }
      ]
    });

    const isNewUser = !provider;

    if (provider) {
      // Existing provider - update profile if needed
      if (!provider.googleId) {
        provider.googleId = googleId;
      }
      if (!provider.avatar) {
        provider.avatar = picture;
      }
      if (!provider.isActivated) {
        provider.isActivated = true;
        provider.activatedAt = new Date();
      }
      await provider.save();
      console.log('✅ Provider logged in via Google OAuth:', email);
    } else {
      // New provider - create account
      provider = new Provider({
        name: sanitizeInput(name),
        email: email.toLowerCase(),
        googleId,
        avatar: picture,
        isActivated: true,
        userType: 'provider',
        authMethod: 'google',
        activatedAt: new Date(),
        businessName: `${name}'s Equipment Rental`,
        businessType: 'Agricultural Equipment'
      });
      await provider.save();
      console.log('✅ New provider created via Google OAuth:', email);
    }

    // Generate JWT token
    const jwtToken = jwt.sign({
      email: provider.email,
      id: provider._id,
      userType: 'provider',
      authMethod: 'google'
    }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    const providerData = {
      id: provider._id,
      name: provider.name,
      email: provider.email,
      avatar: provider.avatar,
      phone: provider.phone || '',
      address: provider.address || '',
      businessName: provider.businessName,
      businessType: provider.businessType,
      userType: 'provider',
      isActivated: true,
      authMethod: 'google'
    };

    res.status(200).json({
      success: true,
      token: jwtToken,
      user: providerData,
      isNewUser: isNewUser,
      message: isNewUser ? "Provider account created successfully!" : "Provider login successful!"
    });

  } catch (err) {
    console.error('Provider Google OAuth error:', err);
    
    if (err.message.includes('Token used too late')) {
      return res.status(400).json({ 
        error: "Google token expired",
        details: "Please sign in with Google again"
      });
    }
    
    res.status(400).json({ 
      error: "Google authentication failed",
      details: "Please try signing in with Google again"
    });
  }
});

// Check if email exists (for frontend to show appropriate UI)
router.post('/check-email', async (req, res) => {
  try {
    const { email, userType } = req.body;

    if (!email || !userType) {
      return res.status(400).json({
        error: "Email and userType are required"
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const Model = userType === 'provider' ? Provider : User;
    const account = await Model.findOne({ email: email.toLowerCase() });

    if (account) {
      return res.json({
        exists: true,
        authMethod: account.authMethod || 'traditional',
        userType: account.userType,
        name: account.name
      });
    } else {
      return res.json({
        exists: false,
        authMethod: 'google' // Suggest Google OAuth for new users
      });
    }

  } catch (err) {
    console.error('Check email error:', err);
    res.status(500).json({ 
      error: "Internal server error"
    });
  }
});

// Update user/profile information
router.put('/user/profile', async (req, res) => {
  try {
    const { email, updates } = req.body;

    if (!email || !updates) {
      return res.status(400).json({
        error: "Email and updates are required"
      });
    }

    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { $set: updates },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      phone: user.phone,
      address: user.address,
      userType: user.userType,
      isActivated: user.isActivated,
      authMethod: user.authMethod
    };

    res.json({
      success: true,
      user: userData,
      message: "Profile updated successfully"
    });

  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ 
      error: "Internal server error"
    });
  }
});

// Update provider/profile information
router.put('/provider/profile', async (req, res) => {
  try {
    const { email, updates } = req.body;

    if (!email || !updates) {
      return res.status(400).json({
        error: "Email and updates are required"
      });
    }

    const provider = await Provider.findOneAndUpdate(
      { email: email.toLowerCase() },
      { $set: updates },
      { new: true }
    );

    if (!provider) {
      return res.status(404).json({
        error: "Provider not found"
      });
    }

    const providerData = {
      id: provider._id,
      name: provider.name,
      email: provider.email,
      avatar: provider.avatar,
      phone: provider.phone,
      address: provider.address,
      businessName: provider.businessName,
      businessType: provider.businessType,
      userType: provider.userType,
      isActivated: provider.isActivated,
      authMethod: provider.authMethod
    };

    res.json({
      success: true,
      user: providerData,
      message: "Profile updated successfully"
    });

  } catch (err) {
    console.error('Update provider profile error:', err);
    res.status(500).json({ 
      error: "Internal server error"
    });
  }
});

// ===== ADDITIONAL AUTH ROUTES =====

// Get current user profile
router.get('/me', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.userData.toPublicJSON(),
      authInfo: {
        userType: req.user.userType,
        authMethod: req.user.authMethod
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile'
    });
  }
});

// Refresh JWT token
router.post('/refresh', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    // Generate new JWT token
    const jwtToken = jwt.sign({
      email: req.user.email,
      id: req.user.id,
      userType: req.user.userType,
      authMethod: req.user.authMethod
    }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    res.json({
      success: true,
      token: jwtToken,
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token'
    });
  }
});

// Logout (client-side token removal)
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful. Please remove the token from client storage.'
  });
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
      googleOAuth: true,
      passwordReset: false, // Disabled since we're using Google OAuth
      emailActivation: false, // Disabled since we're using Google OAuth
      rateLimiting: true,
      tokenRefresh: true,
      profileAccess: true
    },
    googleOAuth: {
      configured: !!process.env.GOOGLE_CLIENT_ID,
      clientId: process.env.GOOGLE_CLIENT_ID ? '✅ Configured' : '❌ Missing'
    },
    endpoints: {
      userLogin: 'POST /api/auth/user/google',
      providerLogin: 'POST /api/auth/provider/google',
      profile: 'GET /api/auth/me',
      refresh: 'POST /api/auth/refresh',
      logout: 'POST /api/auth/logout',
      checkEmail: 'POST /api/auth/check-email'
    }
  });
});

module.exports = router;