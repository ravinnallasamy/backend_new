const express = require('express');
const router = express.Router();
const Equipment = require('../model/equipment');
const { authenticateToken, requireProvider } = require('../middleware/auth');

// GET all equipment
router.get('/', async (req, res) => {
  try {
    const { category, type, available, providerId, minPrice, maxPrice, limit, page } = req.query;
    
    // Build filter object
    let filter = { isActive: true };
    
    if (category) filter.category = category;
    if (type) filter.type = type;
    if (available !== undefined) filter.available = available === 'true';
    if (providerId) filter.providerId = providerId;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    
    // Pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 12;
    const skip = (pageNum - 1) * limitNum;
    
    const equipment = await Equipment.find(filter)
      .populate('providerId', 'name businessName rating avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    const totalCount = await Equipment.countDocuments(filter);
    
    res.json({
      success: true,
      data: equipment,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching equipment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching equipment', 
      error: error.message 
    });
  }
});

// GET equipment by ID
router.get('/:id', async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id)
      .populate('providerId', 'name businessName phone email rating reviewCount avatar businessType');
    
    if (!equipment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Equipment not found' 
      });
    }
    
    res.json({
      success: true,
      data: equipment
    });
  } catch (error) {
    console.error('Error fetching equipment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching equipment', 
      error: error.message 
    });
  }
});

// POST create new equipment (requires provider authentication)
router.post('/', authenticateToken, requireProvider, async (req, res) => {
  try {
    const { 
      name, category, type, description, price, address,
      providerId, providerEmail, providerName,
      specifications, images, available, condition
    } = req.body;
    
    // Validate required fields
    const requiredFields = { name, category, type, price, address, providerId };
    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }
    
    // Create new equipment
    const newEquipment = new Equipment({
      name,
      category,
      type,
      description,
      price: parseFloat(price),
      address,
      providerId,
      providerEmail,
      providerName,
      specifications: specifications || {},
      images: images || [],
      available: available !== undefined ? available : true,
      condition: condition || 'Excellent'
    });
    
    const savedEquipment = await newEquipment.save();
    
    // Update provider's equipment count
    const Provider = require('../model/provider');
    await Provider.findByIdAndUpdate(
      providerId,
      { $inc: { totalEquipment: 1 } }
    );
    
    res.status(201).json({
      success: true,
      message: 'Equipment created successfully',
      data: savedEquipment
    });
  } catch (error) {
    console.error('Error creating equipment:', error);
    res.status(400).json({ 
      success: false, 
      message: 'Error creating equipment', 
      error: error.message 
    });
  }
});

// PUT update equipment
router.put('/:id', async (req, res) => {
  try {
    const { 
      name, category, type, description, price, address,
      specifications, images, available, condition 
    } = req.body;
    
    const updateData = {
      name, category, type, description, address,
      specifications, images, available, condition
    };
    
    if (price) updateData.price = parseFloat(price);
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );
    
    const updatedEquipment = await Equipment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedEquipment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Equipment not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Equipment updated successfully',
      data: updatedEquipment
    });
  } catch (error) {
    console.error('Error updating equipment:', error);
    res.status(400).json({ 
      success: false, 
      message: 'Error updating equipment', 
      error: error.message 
    });
  }
});

// PATCH update equipment (partial update)
router.patch('/:id', async (req, res) => {
  try {
    const updates = req.body;
    
    // Convert price to number if present
    if (updates.price) {
      updates.price = parseFloat(updates.price);
    }
    
    // Remove fields that shouldn't be updated
    const restrictedFields = ['providerId', 'providerEmail', 'providerName'];
    restrictedFields.forEach(field => {
      if (updates[field]) {
        delete updates[field];
      }
    });
    
    const updatedEquipment = await Equipment.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!updatedEquipment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Equipment not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Equipment updated successfully',
      data: updatedEquipment
    });
  } catch (error) {
    console.error('Error updating equipment:', error);
    res.status(400).json({ 
      success: false, 
      message: 'Error updating equipment', 
      error: error.message 
    });
  }
});

// DELETE equipment (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const equipment = await Equipment.findByIdAndUpdate(
      req.params.id,
      { isActive: false, available: false },
      { new: true }
    );
    
    if (!equipment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Equipment not found' 
      });
    }
    
    // Update provider's equipment count
    const Provider = require('../model/provider');
    await Provider.findByIdAndUpdate(
      equipment.providerId,
      { $inc: { totalEquipment: -1 } }
    );
    
    res.json({
      success: true,
      message: 'Equipment deleted successfully',
      data: equipment
    });
  } catch (error) {
    console.error('Error deleting equipment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting equipment', 
      error: error.message 
    });
  }
});

// GET equipment by category
router.get('/category/:category', async (req, res) => {
  try {
    const { limit, page } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 12;
    const skip = (pageNum - 1) * limitNum;
    
    const equipment = await Equipment.find({ 
      category: req.params.category,
      isActive: true,
      available: true 
    })
    .populate('providerId', 'name businessName rating avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);
    
    const totalCount = await Equipment.countDocuments({ 
      category: req.params.category,
      isActive: true,
      available: true 
    });
    
    res.json({
      success: true,
      data: equipment,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching equipment by category:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching equipment by category', 
      error: error.message 
    });
  }
});

// GET equipment search
router.get('/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const { limit, page } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 12;
    const skip = (pageNum - 1) * limitNum;
    
    const equipment = await Equipment.find({
      $and: [
        { isActive: true },
        {
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { category: { $regex: query, $options: 'i' } },
            { type: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    })
    .populate('providerId', 'name businessName rating avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);
    
    const totalCount = await Equipment.countDocuments({
      $and: [
        { isActive: true },
        {
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { category: { $regex: query, $options: 'i' } },
            { type: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    });
    
    res.json({
      success: true,
      data: equipment,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error) {
    console.error('Error searching equipment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error searching equipment', 
      error: error.message 
    });
  }
});

// GET equipment statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const { providerId } = req.query;
    
    let filter = { isActive: true };
    if (providerId) filter.providerId = providerId;
    
    const totalEquipment = await Equipment.countDocuments(filter);
    const availableEquipment = await Equipment.countDocuments({ ...filter, available: true });
    const unavailableEquipment = await Equipment.countDocuments({ ...filter, available: false });
    
    // Get equipment count by category
    const categoryStats = await Equipment.aggregate([
      { $match: filter },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get price statistics
    const priceStats = await Equipment.aggregate([
      { $match: filter },
      { 
        $group: {
          _id: null,
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        totalEquipment,
        availableEquipment,
        unavailableEquipment,
        categoryStats,
        priceStats: priceStats[0] || { avgPrice: 0, minPrice: 0, maxPrice: 0 }
      }
    });
  } catch (error) {
    console.error('Error fetching equipment statistics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching equipment statistics', 
      error: error.message 
    });
  }
});

module.exports = router;