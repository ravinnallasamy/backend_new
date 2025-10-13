const express = require('express');
const router = express.Router();
const User = require('../model/user');
const { authenticateToken, requireUser, requireOwnershipOrProvider } = require('../middleware/auth');

// GET all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find({ isActive: true }).select('-googleId');
    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
});

// GET user by ID (requires authentication)
router.get('/:id', authenticateToken, requireOwnershipOrProvider, async (req, res) => {
  try {
    const userId = req.params.id;

    // Check for undefined or invalid ID
    if (!userId || userId === 'undefined' || userId === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID provided'
      });
    }

    const user = await User.findById(userId).select('-googleId');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: user.toPublicJSON() // Use safe public method
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
});

// POST create new user (for admin/manual creation if needed)
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, address, userType, googleId, avatar } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: email.toLowerCase() },
        { googleId: googleId }
      ]
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or Google ID already exists'
      });
    }

    // Create new user
    const newUser = new User({
      name,
      email: email.toLowerCase(),
      phone,
      address,
      googleId: googleId || `manual_${Date.now()}`, // Fallback for manual creation
      avatar: avatar || null,
      authMethod: 'google',
      userType: userType || 'user',
      isActivated: true, // Always true for Google OAuth
      activatedAt: new Date()
    });

    const savedUser = await newUser.save();

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: savedUser.toPublicJSON() // Use safe public method
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(400).json({
      success: false,
      message: 'Error creating user',
      error: error.message
    });
  }
});

// PUT update user (requires authentication)
router.put('/:id', authenticateToken, requireOwnershipOrProvider, async (req, res) => {
  try {
    const { name, phone, address, avatar } = req.body;

    // Remove fields that shouldn't be updated
    const updates = { 
      name, 
      phone, 
      address,
      avatar 
    };
    
    // Remove undefined fields
    Object.keys(updates).forEach(key => {
      if (updates[key] === undefined) {
        delete updates[key];
      }
    });

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-googleId');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser.toPublicJSON() // Use safe public method
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating user',
      error: error.message
    });
  }
});

// PATCH update user (partial update) (requires authentication)
router.patch('/:id', authenticateToken, requireOwnershipOrProvider, async (req, res) => {
  try {
    const updates = req.body;

    // Remove fields that shouldn't be updated via PATCH
    const restrictedFields = ['email', 'googleId', 'authMethod', 'userType', 'isActivated', 'activatedAt'];
    restrictedFields.forEach(field => {
      if (updates[field]) {
        delete updates[field];
      }
    });

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-googleId');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser.toPublicJSON() // Use safe public method
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating user',
      error: error.message
    });
  }
});

// DELETE user (soft delete) (requires authentication)
router.delete('/:id', authenticateToken, requireOwnershipOrProvider, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-googleId');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
      data: user.toPublicJSON() // Use safe public method
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
});

// GET user's rental requests (requires authentication)
router.get('/:id/requests', authenticateToken, requireOwnershipOrProvider, async (req, res) => {
  try {
    const Request = require('../model/request');
    const requests = await Request.find({ 
      customerId: req.params.id, 
      isActive: true 
    }).sort({ requestDate: -1 });
    
    res.json({
      success: true,
      data: requests,
      count: requests.length
    });
  } catch (error) {
    console.error('Error fetching user requests:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching user requests', 
      error: error.message 
    });
  }
});

// GET user statistics (requires authentication)
router.get('/:id/stats', authenticateToken, requireOwnershipOrProvider, async (req, res) => {
  try {
    const userId = req.params.id;

    if (!userId || userId === 'undefined' || userId === 'null') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID provided'
      });
    }

    const user = await User.findById(userId).select('-googleId');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const Request = require('../model/request');

    const totalRequests = await Request.countDocuments({ 
      customerId: userId, 
      isActive: true 
    });

    const pendingRequests = await Request.countDocuments({ 
      customerId: userId, 
      status: 'pending',
      isActive: true 
    });

    const completedRentals = await Request.countDocuments({ 
      customerId: userId, 
      status: 'completed',
      isActive: true 
    });

    const activeRentals = await Request.countDocuments({ 
      customerId: userId, 
      status: { $in: ['approved', 'in-progress'] },
      isActive: true 
    });

    res.json({
      success: true,
      data: {
        user: user.toPublicJSON(),
        statistics: {
          totalRequests: totalRequests,
          pendingRequests: pendingRequests,
          completedRentals: completedRentals,
          activeRentals: activeRentals,
          isProfileComplete: user.isProfileComplete
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching user statistics', 
      error: error.message 
    });
  }
});

module.exports = router;