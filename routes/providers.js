const express = require('express');
const router = express.Router();
const Provider = require('../model/provider');
const { authenticateToken, requireProvider, requireOwnershipOrProvider } = require('../middleware/auth');

// GET all providers
router.get('/', async (req, res) => {
  try {
    const providers = await Provider.find({ isActive: true }).select('-googleId');
    res.json({
      success: true,
      data: providers,
      count: providers.length
    });
  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching providers', 
      error: error.message 
    });
  }
});

// GET provider by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id).select('-googleId');
    if (!provider) {
      return res.status(404).json({ 
        success: false, 
        message: 'Provider not found' 
      });
    }
    res.json({
      success: true,
      data: provider
    });
  } catch (error) {
    console.error('Error fetching provider:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching provider', 
      error: error.message 
    });
  }
});

// POST create new provider (for admin/manual creation if needed)
router.post('/', async (req, res) => {
  try {
    const { 
      name, email, phone, address, 
      businessName, businessType, licenseNumber,
      serviceArea, experience, certifications,
      googleId, avatar // For manual provider creation if needed
    } = req.body;
    
    // Check if provider already exists
    const existingProvider = await Provider.findOne({ 
      $or: [
        { email: email.toLowerCase() },
        { googleId: googleId }
      ]
    });
    
    if (existingProvider) {
      return res.status(400).json({ 
        success: false, 
        message: 'Provider with this email or Google ID already exists' 
      });
    }
    
    // Create new provider
    const newProvider = new Provider({
      name,
      email: email.toLowerCase(),
      phone,
      address,
      googleId: googleId || `manual_${Date.now()}`, // Fallback for manual creation
      avatar: avatar || null,
      authMethod: 'google',
      businessName: businessName || `${name}'s Equipment Rental`,
      businessType: businessType || 'Equipment Rental',
      licenseNumber,
      serviceArea,
      experience,
      certifications,
      userType: 'provider',
      isActivated: true, // Always true for providers
      activatedAt: new Date()
    });
    
    const savedProvider = await newProvider.save();
    
    res.status(201).json({
      success: true,
      message: 'Provider created successfully',
      data: savedProvider.toPublicJSON() // Use the safe public method
    });
  } catch (error) {
    console.error('Error creating provider:', error);
    res.status(400).json({ 
      success: false, 
      message: 'Error creating provider', 
      error: error.message 
    });
  }
});

// PUT update provider (requires authentication)
router.put('/:id', authenticateToken, requireOwnershipOrProvider, async (req, res) => {
  try {
    const { 
      name, phone, address,
      businessName, businessType, licenseNumber,
      serviceArea, experience, certifications,
      avatar
    } = req.body;
    
    // Remove fields that shouldn't be updated
    const updates = { 
      name, phone, address,
      businessName, businessType, licenseNumber,
      serviceArea, experience, certifications,
      avatar
    };
    
    // Remove undefined fields
    Object.keys(updates).forEach(key => {
      if (updates[key] === undefined) {
        delete updates[key];
      }
    });
    
    const updatedProvider = await Provider.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-googleId');
    
    if (!updatedProvider) {
      return res.status(404).json({ 
        success: false, 
        message: 'Provider not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Provider updated successfully',
      data: updatedProvider.toPublicJSON()
    });
  } catch (error) {
    console.error('Error updating provider:', error);
    res.status(400).json({ 
      success: false, 
      message: 'Error updating provider', 
      error: error.message 
    });
  }
});

// PATCH update provider (partial update)
router.patch('/:id', async (req, res) => {
  try {
    const updates = req.body;
    
    // Remove fields that shouldn't be updated via PATCH
    const restrictedFields = ['email', 'googleId', 'authMethod', 'userType', 'isActivated', 'activatedAt'];
    restrictedFields.forEach(field => {
      if (updates[field]) {
        delete updates[field];
      }
    });
    
    const updatedProvider = await Provider.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-googleId');
    
    if (!updatedProvider) {
      return res.status(404).json({ 
        success: false, 
        message: 'Provider not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Provider updated successfully',
      data: updatedProvider.toPublicJSON()
    });
  } catch (error) {
    console.error('Error updating provider:', error);
    res.status(400).json({ 
      success: false, 
      message: 'Error updating provider', 
      error: error.message 
    });
  }
});

// DELETE provider (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const provider = await Provider.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-googleId');
    
    if (!provider) {
      return res.status(404).json({ 
        success: false, 
        message: 'Provider not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Provider deleted successfully',
      data: provider.toPublicJSON()
    });
  } catch (error) {
    console.error('Error deleting provider:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting provider', 
      error: error.message 
    });
  }
});

// GET provider's equipment (requires authentication)
router.get('/:id/equipment', authenticateToken, requireOwnershipOrProvider, async (req, res) => {
  try {
    const Equipment = require('../model/equipment');
    const mongoose = require('mongoose');
    const providerId = req.params.id;

    // Handle both ObjectId and string comparisons
    const equipment = await Equipment.find({
      $or: [
        { providerId: providerId },
        { providerId: mongoose.Types.ObjectId.isValid(providerId) ? new mongoose.Types.ObjectId(providerId) : null },
        { providerEmail: { $exists: true } } // Fallback for email-based matching
      ],
      isActive: true
    });

    // Additional filtering for cases where providerId is stored as string
    const filteredEquipment = equipment.filter(item =>
      item.providerId?.toString() === providerId.toString()
    );

    res.json({
      success: true,
      data: filteredEquipment,
      count: filteredEquipment.length
    });
  } catch (error) {
    console.error('Error fetching provider equipment:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching provider equipment',
      error: error.message
    });
  }
});

// GET provider's requests
router.get('/:id/requests', async (req, res) => {
  try {
    const Request = require('../model/request');
    const requests = await Request.find({ 
      providerId: req.params.id, 
      isActive: true 
    }).sort({ requestDate: -1 });
    
    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Error fetching provider requests:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching provider requests', 
      error: error.message 
    });
  }
});

// GET provider statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id).select('-googleId');
    if (!provider) {
      return res.status(404).json({ 
        success: false, 
        message: 'Provider not found' 
      });
    }

    const Equipment = require('../model/equipment');
    const Request = require('../model/request');

    const equipmentCount = await Equipment.countDocuments({ 
      providerId: req.params.id, 
      isActive: true 
    });

    const activeRequests = await Request.countDocuments({ 
      providerId: req.params.id, 
      status: { $in: ['pending', 'accepted'] },
      isActive: true 
    });

    const completedRentals = await Request.countDocuments({ 
      providerId: req.params.id, 
      status: 'completed',
      isActive: true 
    });

    res.json({
      success: true,
      data: {
        provider: provider.toPublicJSON(),
        statistics: {
          totalEquipment: equipmentCount,
          activeRequests: activeRequests,
          completedRentals: completedRentals,
          totalRentals: provider.totalRentals,
          averageRating: provider.averageRating,
          reviewCount: provider.reviewCount,
          isProfileComplete: provider.isProfileComplete
        }
      }
    });
  } catch (error) {
    console.error('Error fetching provider stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching provider statistics', 
      error: error.message 
    });
  }
});

module.exports = router;