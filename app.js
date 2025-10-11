/**
 * Agricultural Equipment Rental Platform - Backend Server
 *
 * This application serves as the backend API for an agricultural equipment rental platform
 * where farmers can rent equipment from providers. The system handles user authentication,
 * equipment management, and rental request processing.
 *
 * Author: Development Team
 * Created: 2025
 * Purpose: Educational project for learning full-stack development
 */

// Import essential Node.js modules for web server functionality
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const helmet = require('helmet'); // Added for security headers

// Import configuration and database connection
const config = require('./config/config');
const connectDB = require('./config/database');

// Import routes
const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const providersRouter = require('./routes/providers');
const equipmentsRouter = require('./routes/equipments');
const requestsRouter = require('./routes/requests');

const app = express();

// Validate and display configuration
try {
  config.validate();
  config.display();
} catch (error) {
  console.error('❌ Configuration validation failed:', error.message);
  if (config.nodeEnv === 'production') {
    process.exit(1);
  } else {
    console.log('⚠️  Continuing in development mode despite configuration issues...');
  }
}

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// ========== IMPORTANT FIX: Trust proxy for rate limiting ==========
// This must be set BEFORE any middleware that uses rate limiting
app.set('trust proxy', 1); // Trust first proxy

// Middleware
app.use(logger('dev'));

// Security middleware - Added Helmet for security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // Disable CSP for API (can be configured later)
}));

// Enhanced CORS configuration to allow frontend connections from multiple ports
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests, Postman)
    if (!origin) return callback(null, true);

    // Dynamic allowed origins from configuration
    const allowedOrigins = [
      ...config.urls.frontendUrls,  // All configured frontend URLs
      config.urls.frontend,         // Primary frontend URL
      config.urls.backend,          // Backend URL for testing
      config.urls.userFrontend,     // User frontend URL
      config.urls.providerFrontend  // Provider frontend URL
    ];

    // Add localhost variations for development
    config.urls.frontendPorts.forEach(port => {
      allowedOrigins.push(`http://localhost:${port}`);
      allowedOrigins.push(`http://127.0.0.1:${port}`);
      allowedOrigins.push(`http://0.0.0.0:${port}`);
    });

    // Add production deployment patterns for common hosting platforms
    const productionPatterns = [
      /^https:\/\/.*\.netlify\.app$/,
      /^https:\/\/.*\.vercel\.app$/,
      /^https:\/\/.*\.herokuapp\.com$/,
      /^https:\/\/.*\.railway\.app$/,
      /^https:\/\/.*\.render\.com$/,
      /^https:\/\/.*\.surge\.sh$/,
      /^https:\/\/.*\.github\.io$/,
      /^https:\/\/.*\.onrender\.com$/,
      /^https:\/\/.*\.up\.railway\.app$/
    ];

    // Check if origin matches production patterns
    const isProductionOrigin = productionPatterns.some(pattern => pattern.test(origin));
    if (isProductionOrigin) {
      allowedOrigins.push(origin);
    }

    // Remove duplicates and filter out null/undefined values
    const uniqueOrigins = [...new Set(allowedOrigins.filter(Boolean))];

    // Check if origin is allowed
    const isAllowed = uniqueOrigins.some(allowedOrigin => {
      return origin === allowedOrigin || 
             (allowedOrigin instanceof RegExp && allowedOrigin.test(origin));
    });

    if (isAllowed) {
      if (config.nodeEnv === 'development') {
        console.log(`✅ CORS allowed origin: ${origin}`);
      }
      callback(null, true);
    } else {
      console.log(`❌ CORS blocked origin: ${origin}`);
      if (config.nodeEnv === 'development') {
        console.log(`   Allowed origins: ${uniqueOrigins.join(', ')}`);
      }
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-API-Key'],
  exposedHeaders: ['Content-Length', 'X-Request-Id', 'X-Response-Time'],
  preflightContinue: false,
  optionsSuccessStatus: 200,
  maxAge: 86400 // 24 hours
}));

// Body parsing middleware with better limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf; // Store raw body for signature verification if needed
  }
}));
app.use(express.urlencoded({ 
  extended: true, // Changed to true for better nested object support
  limit: '10mb' 
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Request logging middleware - Enhanced
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// API Routes
app.use('/', indexRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/providers', providersRouter);
app.use('/api/equipments', equipmentsRouter);
app.use('/api/requests', requestsRouter);

// Enhanced Health check endpoint
app.get('/health', (req, res) => {
  const healthCheck = {
    status: 'OK',
    message: 'Agricultural Equipment Rental Platform Backend is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    services: {
      database: 'MongoDB',
      email: config.isEmailConfigured() ? 'Resend (Configured)' : 'Resend (Not Configured)',
      authentication: 'JWT',
      rateLimiting: 'Enabled'
    }
  };
  
  // Add database connection status if possible
  const mongoose = require('mongoose');
  healthCheck.services.databaseStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  
  res.json(healthCheck);
});

// Enhanced Root endpoint
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Agricultural Equipment Rental Platform</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          max-width: 800px; 
          margin: 0 auto; 
          padding: 20px; 
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          min-height: 100vh;
        }
        .container { 
          background: white; 
          padding: 40px; 
          border-radius: 10px; 
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          text-align: center;
        }
        h1 { 
          color: #2c5530; 
          margin-bottom: 20px;
        }
        .status { 
          background: #e8f5e8; 
          padding: 15px; 
          border-radius: 5px; 
          margin: 20px 0; 
          border-left: 4px solid #4CAF50;
        }
        .warning { 
          background: #fff3cd; 
          padding: 15px; 
          border-radius: 5px; 
          margin: 20px 0; 
          border-left: 4px solid #ffc107;
        }
        .endpoints { 
          text-align: left; 
          margin: 30px 0; 
          background: #f8f9fa; 
          padding: 20px; 
          border-radius: 5px;
        }
        .endpoint { 
          margin: 10px 0; 
          padding: 8px; 
          background: white; 
          border-radius: 4px; 
          border-left: 3px solid #4F46E5;
        }
        a { 
          color: #4F46E5; 
          text-decoration: none; 
          font-weight: bold;
        }
        a:hover { 
          text-decoration: underline; 
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #dee2e6;
          color: #6c757d;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚜 Agricultural Equipment Rental Platform</h1>
        <div class="status">
          <strong>✅ Backend server is running successfully!</strong>
        </div>
        
        <p><strong>Environment:</strong> ${config.nodeEnv}</p>
        <p><strong>Email Service:</strong> ${config.isEmailConfigured() ? '✅ Resend Configured' : '⚠️ Resend Not Configured'}</p>
        <p><strong>Database:</strong> ${config.mongodb.uri.includes('localhost') ? '🔧 Development' : '☁️ Production'}</p>
        
        ${!config.isEmailConfigured() ? `
          <div class="warning">
            <strong>⚠️ Email service not configured:</strong> Activation emails will not be sent until Resend is properly configured.
          </div>
        ` : ''}
        
        <div class="endpoints">
          <h3>📊 Available Endpoints:</h3>
          <div class="endpoint"><a href="/health">/health</a> - API status and service information</div>
          <div class="endpoint"><a href="/api/auth">/api/auth</a> - Authentication endpoints (Signup, Login, Password Reset)</div>
          <div class="endpoint"><a href="/api/users">/api/users</a> - User management</div>
          <div class="endpoint"><a href="/api/providers">/api/providers</a> - Provider management</div>
          <div class="endpoint"><a href="/api/equipments">/api/equipments</a> - Equipment management</div>
          <div class="endpoint"><a href="/api/requests">/api/requests</a> - Rental requests</div>
        </div>
        
        <div class="footer">
          <p><strong>Server:</strong> ${config.urls.backend}</p>
          <p><strong>Frontend:</strong> ${config.urls.frontend}</p>
          <p>For API documentation, please refer to the project README.</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

// 404 handler for API routes - Enhanced
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `The requested API endpoint ${req.originalUrl} does not exist`,
    availableEndpoints: [
      '/api/auth',
      '/api/users', 
      '/api/providers',
      '/api/equipments',
      '/api/requests',
      '/health'
    ]
  });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// Enhanced error handler
app.use(function(err, req, res, next) {
  // Log error with more context
  console.error('🔴 Error:', {
    message: err.message,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    stack: config.isDevelopment() ? err.stack : undefined
  });
  
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // If it's an API route, return JSON error
  if (req.path.startsWith('/api/')) {
    const errorResponse = {
      error: {
        message: err.message,
        status: err.status || 500,
        timestamp: new Date().toISOString(),
        path: req.originalUrl
      }
    };
    
    // Add stack trace in development
    if (config.isDevelopment()) {
      errorResponse.error.stack = err.stack;
    }
    
    return res.status(err.status || 500).json(errorResponse);
  }

  // render the error page for non-API routes
  res.status(err.status || 500);
  res.render('error');
});

// Server startup with database connection
const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectDB();
    console.log('✅ MongoDB connected successfully');

    // Check email configuration
    if (config.isEmailConfigured()) {
      console.log('✅ Email service (Resend) is configured and ready');
    } else {
      console.log('⚠️  Email service (Resend) is not configured. Activation emails will not be sent.');
    }

    // Start the server after successful database connection
    const PORT = config.port;
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🎉 Server successfully started!`);
      console.log(`📍 Port: ${PORT}`);
      console.log(`🌐 Environment: ${config.nodeEnv}`);
      console.log(`🔗 Local: http://localhost:${PORT}`);
      console.log(`🔗 Network: http://0.0.0.0:${PORT}`);
      console.log(`🔗 Backend URL: ${config.urls.backend}`);
      console.log(`🔗 Frontend URL: ${config.urls.frontend}`);
      console.log(`📧 Email Service: ${config.isEmailConfigured() ? 'Resend ✅' : 'Not Configured ⚠️'}`);
      console.log(`🔒 Security: Helmet ✅ CORS ✅ Rate Limiting ✅ Trust Proxy ✅`);
      console.log(`\n🚀 Application is ready to accept requests!\n`);
    });

    // Enhanced graceful shutdown handling
    // Enhanced graceful shutdown handling - FIXED VERSION
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  console.log('⏳ Closing HTTP server...');
  
  server.close(() => {
    console.log('✅ HTTP server closed.');
    console.log('⏳ Closing database connections...');
    
    // Close MongoDB connection - FIXED: Use promises instead of callback
    const mongoose = require('mongoose');
    mongoose.connection.close(false).then(() => {
      console.log('✅ Database connections closed.');
      console.log('👋 Process terminated gracefully.');
      process.exit(0);
    }).catch(err => {
      console.log('✅ Database connections closed (with warning).');
      console.log('👋 Process terminated gracefully.');
      process.exit(0);
    });
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Enhanced global error handlers
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  console.log('🔄 Restarting server...');
  process.exit(1);
});

process.on('unhandledRejection', (err, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', err);
  console.log('🔄 Restarting server...');
  process.exit(1);
});

// Start the application
startServer();

module.exports = app;