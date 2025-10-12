/**
 * Authentication Middleware
 * 
 * This middleware handles JWT token verification and user authentication
 * for protected routes in the agricultural equipment rental platform.
 */

const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../model/user');
const Provider = require('../model/provider');

/**
 * Middleware to verify JWT token and authenticate user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        message: 'Please provide a valid authentication token'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Find user based on decoded information
    let user;
    if (decoded.userType === 'provider') {
      user = await Provider.findById(decoded.id).select('-googleId');
    } else {
      user = await User.findById(decoded.id).select('-googleId');
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'User not found or token is invalid'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account deactivated',
        message: 'Your account has been deactivated'
      });
    }

    // Add user information to request object
    req.user = {
      id: user._id,
      email: user.email,
      userType: decoded.userType,
      authMethod: decoded.authMethod
    };
    
    req.userData = user; // Full user data for advanced operations

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'The provided token is invalid'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        message: 'Your session has expired. Please sign in again'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: 'An error occurred during authentication'
    });
  }
};

/**
 * Middleware to verify that user is a regular user/customer
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requireUser = (req, res, next) => {
  if (req.user && req.user.userType === 'user') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'This endpoint is only accessible to users/customers'
    });
  }
};

/**
 * Middleware to verify that user is a provider
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requireProvider = (req, res, next) => {
  if (req.user && req.user.userType === 'provider') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'This endpoint is only accessible to providers'
    });
  }
};

/**
 * Middleware to verify that user owns the resource or is a provider
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requireOwnershipOrProvider = async (req, res, next) => {
  try {
    const resourceId = req.params.id || req.params.userId || req.params.providerId;
    const userId = req.user.id;
    const userType = req.user.userType;

    // Providers can access their own resources
    if (userType === 'provider' && resourceId === userId.toString()) {
      return next();
    }

    // Users can access their own resources
    if (userType === 'user' && resourceId === userId.toString()) {
      return next();
    }

    // For other cases, check if the resource belongs to the user
    if (userType === 'provider') {
      // Check if this is the provider's resource
      const resource = await req.Model?.findById(resourceId);
      if (resource && resource.providerId?.toString() === userId) {
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'You can only access your own resources'
    });
  } catch (error) {
    console.error('Ownership verification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authorization failed',
      message: 'An error occurred while verifying resource ownership'
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    
    let user;
    if (decoded.userType === 'provider') {
      user = await Provider.findById(decoded.id).select('-googleId');
    } else {
      user = await User.findById(decoded.id).select('-googleId');
    }

    if (user && user.isActive) {
      req.user = {
        id: user._id,
        email: user.email,
        userType: decoded.userType,
        authMethod: decoded.authMethod
      };
      req.userData = user;
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on token errors
    req.user = null;
    next();
  }
};

/**
 * Middleware to validate Google OAuth token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateGoogleToken = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Google token required',
        message: 'Please provide a valid Google authentication token'
      });
    }

    // Verify Google token
    const { OAuth2Client } = require('google-auth-library');
    const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    
    if (!payload.email_verified) {
      return res.status(400).json({
        success: false,
        error: 'Email not verified',
        message: 'Please verify your email with Google first'
      });
    }

    // Add Google user info to request
    req.googleUser = {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      googleId: payload.sub,
      email_verified: payload.email_verified
    };

    next();
  } catch (error) {
    console.error('Google token validation error:', error);
    
    if (error.message.includes('Token used too late')) {
      return res.status(400).json({
        success: false,
        error: 'Token expired',
        message: 'Google token has expired. Please sign in again'
      });
    }
    
    if (error.message.includes('Wrong number of segments')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token',
        message: 'The provided Google token is invalid'
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Google authentication failed',
      message: 'Failed to verify Google token. Please try again'
    });
  }
};

module.exports = {
  authenticateToken,
  requireUser,
  requireProvider,
  requireOwnershipOrProvider,
  optionalAuth,
  validateGoogleToken
};
