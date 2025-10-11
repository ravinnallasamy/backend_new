var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.json({
    message: '🚜 Agricultural Equipment Rental Platform - Backend API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    authentication: 'Google OAuth',
    features: [
      'User & Provider Authentication via Google OAuth',
      'Equipment Management',
      'Rental Request System',
      'Real-time Status Tracking',
      'Feedback & Rating System'
    ],
    endpoints: {
      auth: {
        path: '/api/auth',
        methods: ['POST'],
        description: 'Google OAuth authentication for users and providers'
      },
      users: {
        path: '/api/users',
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        description: 'User management and profile operations'
      },
      providers: {
        path: '/api/providers',
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        description: 'Provider management and business operations'
      },
      equipments: {
        path: '/api/equipments',
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        description: 'Equipment listing and management'
      },
      requests: {
        path: '/api/requests',
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        description: 'Rental request management and tracking'
      },
      health: {
        path: '/health',
        methods: ['GET'],
        description: 'API health check and status'
      }
    },
    documentation: 'Check the README for detailed API documentation',
    support: 'Contact support for technical assistance'
  });
});

// Health check endpoint
router.get('/health', function(req, res, next) {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;