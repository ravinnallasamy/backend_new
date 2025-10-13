const express = require('express');
const router = express.Router();
const User = require('../model/user');
const Provider = require('../model/provider');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const rateLimit = require('express-rate-limit');
const { OAuth2Client } = require('google-auth-library');

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

/**
 * Verify Google token and extract user data
 */
async function verifyGoogleToken(token) {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      emailVerified: payload.email_verified
    };
  } catch (error) {
    console.error('Google token verification failed:', error);
    throw new Error('Invalid Google token');
  }
}

// ===== GOOGLE OAUTH ROUTES =====

// User Google OAuth Signin/Signup
router.post('/user/google', signinLimiter, async (req, res) => {
  try {
    const { token } = req.body;

    console.log('🔧 User Google OAuth attempt');

    if (!token) {
      return res.status(400).json({
        success: false,
        error: "Google token is required"
      });
    }

    // Verify Google token and extract user data
    const googleUser = await verifyGoogleToken(token);
    
    console.log('Google user data:', {
      email: googleUser.email,
      name: googleUser.name,
      googleId: googleUser.googleId
    });

    // Check if user already exists by email or googleId
    let user = await User.findOne({
      $or: [
        { email: googleUser.email.toLowerCase() },
        { googleId: googleUser.googleId }
      ]
    });

    const isNewUser = !user;

    if (!user) {
      // Create new user
      user = new User({
        name: googleUser.name,
        email: googleUser.email.toLowerCase(),
        avatar: googleUser.picture,
        googleId: googleUser.googleId,
        userType: 'user',
        authMethod: 'google',
        isActivated: true,
        emailVerified: googleUser.emailVerified
      });
      await user.save();
      console.log('✅ New user created:', user.email);
    } else {
      // Update existing user with Google data if needed
      if (!user.googleId) {
        user.googleId = googleUser.googleId;
        user.authMethod = 'google';
        await user.save();
      }
      console.log('✅ Existing user logged in:', user.email);
    }

    // Prepare user data for response
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      phone: user.phone || '',
      address: user.address || '',
      userType: user.userType,
      isActivated: user.isActivated,
      authMethod: user.authMethod
    };

    // Generate JWT token
    const jwtToken = jwt.sign({
      userId: user._id,
      email: user.email,
      userType: user.userType,
      authMethod: user.authMethod
    }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    res.status(200).json({
      success: true,
      token: jwtToken,
      user: userData,
      isNewUser: isNewUser,
      message: isNewUser ? "Account created successfully!" : "Login successful!"
    });

  } catch (err) {
    console.error('User Google OAuth error:', err);
    res.status(400).json({ 
      success: false,
      error: "Google authentication failed",
      details: err.message
    });
  }
});

// Provider Google OAuth Signin/Signup
router.post('/provider/google', signinLimiter, async (req, res) => {
  try {
    const { token } = req.body;

    console.log('🔧 Provider Google OAuth attempt');

    if (!token) {
      return res.status(400).json({
        success: false,
        error: "Google token is required"
      });
    }

    // Verify Google token and extract user data
    const googleUser = await verifyGoogleToken(token);
    
    console.log('Google provider data:', {
      email: googleUser.email,
      name: googleUser.name,
      googleId: googleUser.googleId
    });

    // Check if provider already exists by email or googleId
    let provider = await Provider.findOne({
      $or: [
        { email: googleUser.email.toLowerCase() },
        { googleId: googleUser.googleId }
      ]
    });

    const isNewProvider = !provider;

    if (!provider) {
      // Create new provider
      provider = new Provider({
        name: googleUser.name,
        email: googleUser.email.toLowerCase(),
        avatar: googleUser.picture,
        googleId: googleUser.googleId,
        businessName: `${googleUser.name}'s Equipment Rental`,
        businessType: 'Agricultural Equipment',
        userType: 'provider',
        authMethod: 'google',
        isActivated: true,
        emailVerified: googleUser.emailVerified
      });
      await provider.save();
      console.log('✅ New provider created:', provider.email);
    } else {
      // Update existing provider with Google data if needed
      if (!provider.googleId) {
        provider.googleId = googleUser.googleId;
        provider.authMethod = 'google';
        await provider.save();
      }
      console.log('✅ Existing provider logged in:', provider.email);
    }

    // Prepare provider data for response
    const providerData = {
      id: provider._id,
      name: provider.name,
      email: provider.email,
      avatar: provider.avatar,
      phone: provider.phone || '',
      address: provider.address || '',
      businessName: provider.businessName,
      businessType: provider.businessType,
      userType: provider.userType,
      isActivated: provider.isActivated,
      authMethod: provider.authMethod
    };

    // Generate JWT token
    const jwtToken = jwt.sign({
      userId: provider._id,
      email: provider.email,
      userType: provider.userType,
      authMethod: provider.authMethod
    }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

    res.status(200).json({
      success: true,
      token: jwtToken,
      user: providerData,
      isNewUser: isNewProvider,
      message: isNewProvider ? "Provider account created successfully!" : "Provider login successful!"
    });

  } catch (err) {
    console.error('Provider Google OAuth error:', err);
    res.status(400).json({ 
      success: false,
      error: "Google authentication failed",
      details: err.message
    });
  }
});

// Check if email exists (for frontend to show appropriate UI)
router.post('/check-email', async (req, res) => {
  try {
    const { email, userType } = req.body;

    if (!email || !userType) {
      return res.status(400).json({
        success: false,
        error: "Email and userType are required"
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid email format" 
      });
    }

    const Model = userType === 'provider' ? Provider : User;
    const account = await Model.findOne({ email: email.toLowerCase() });

    if (account) {
      return res.json({
        success: true,
        exists: true,
        authMethod: account.authMethod || 'google',
        userType: account.userType,
        name: account.name
      });
    } else {
      return res.json({
        success: true,
        exists: false,
        authMethod: 'google'
      });
    }

  } catch (err) {
    console.error('Check email error:', err);
    res.status(500).json({ 
      success: false,
      error: "Internal server error"
    });
  }
});

// Update user/profile information
router.put('/user/profile', async (req, res) => {
  try {
    const { userId, updates } = req.body;

    if (!userId || !updates) {
      return res.status(400).json({
        success: false,
        error: "User ID and updates are required"
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
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
      success: false,
      error: "Internal server error"
    });
  }
});

// Update provider/profile information
router.put('/provider/profile', async (req, res) => {
  try {
    const { providerId, updates } = req.body;

    if (!providerId || !updates) {
      return res.status(400).json({
        success: false,
        error: "Provider ID and updates are required"
      });
    }

    const provider = await Provider.findByIdAndUpdate(
      providerId,
      { $set: updates },
      { new: true }
    );

    if (!provider) {
      return res.status(404).json({
        success: false,
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
      success: false,
      error: "Internal server error"
    });
  }
});

// ===== ADDITIONAL AUTH ROUTES =====

// Get current user profile
router.get('/me', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const userType = req.user.userType;
    const Model = userType === 'provider' ? Provider : User;
    
    const user = await Model.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    const userData = userType === 'provider' ? {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      phone: user.phone,
      address: user.address,
      businessName: user.businessName,
      businessType: user.businessType,
      userType: user.userType,
      isActivated: user.isActivated,
      authMethod: user.authMethod
    } : {
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
      user: userData
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
    const userType = req.user.userType;
    
    // Generate new JWT token
    const jwtToken = jwt.sign({
      userId: req.user.userId,
      email: req.user.email,
      userType: userType,
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
      passwordReset: false,
      emailActivation: false,
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