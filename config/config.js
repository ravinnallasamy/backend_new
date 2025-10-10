require('dotenv').config();

const config = {
  // Server Configuration
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/rental_app_db'
  },
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'abcd',
    activationSecret: process.env.JWT_ACTIVATION_SECRET || 'abcdefgh',
    resetSecret: process.env.JWT_RESET_SECRET || 'rstsecret',
    expiresIn: process.env.JWT_EXPIRE || '1d',
    resetExpiresIn: process.env.JWT_RESET_EXPIRE || '1d'
  },
  
  // Email Configuration - UPDATED FOR RESEND
  email: {
    from: process.env.EMAIL_FROM || 'onboarding@resend.dev' // CHANGED: Only need from address
  },
  
  // Resend Configuration - ADDED NEW SECTION
  resend: {
    apiKey: process.env.RESEND_API_KEY // ADDED: Resend API key
  },
  
  // URL Configuration
  urls: {
    frontend: process.env.FRONTEND_URL || 'http://localhost:3000',
    userFrontend: process.env.USER_FRONTEND_URL || 'http://localhost:3000',
    providerFrontend: process.env.PROVIDER_FRONTEND_URL || 'http://localhost:3001',
    backend: process.env.BACKEND_URL || 'http://localhost:5000',
    frontendUrls: process.env.FRONTEND_URLS ?
      process.env.FRONTEND_URLS.split(',').map(url => url.trim()) :
      [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        process.env.USER_FRONTEND_URL,
        process.env.PROVIDER_FRONTEND_URL
      ].filter(Boolean),
    frontendPorts: process.env.FRONTEND_PORTS ?
      process.env.FRONTEND_PORTS.split(',').map(port => port.trim()) :
      ['3000', '3001', '3002']
  },
  
  // API Configuration
  api: {
    version: process.env.API_VERSION || 'v1'
  },
  
  // Validation - UPDATED FOR RESEND
  validate() {
    const required = [
      'RESEND_API_KEY', // CHANGED: Now requires Resend API key
      'EMAIL_FROM'      // CHANGED: Now requires email from address
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    // Validate Resend configuration - CHANGED
    if (!this.resend.apiKey) {
      throw new Error('Resend configuration is incomplete. Please check RESEND_API_KEY in .env file');
    }
    
    console.log('✅ Configuration validated successfully');
    return true;
  },
  
  // Display current configuration (without sensitive data) - UPDATED
  display() {
    console.log('📋 Current Configuration:');
    console.log(`   🌐 Environment: ${this.nodeEnv}`);
    console.log(`   🚀 Port: ${this.port}`);
    console.log(`   📊 Database: ${this.mongodb.uri.replace(/\/\/.*@/, '//***:***@')}`);
    console.log(`   📧 Email From: ${this.email.from}`); // CHANGED
    console.log(`   🔑 Resend API Key: ${this.resend.apiKey ? '✅ Set' : '❌ Missing'}`); // ADDED
    console.log(`   🔗 Primary Frontend URL: ${this.urls.frontend}`);
    console.log(`   🔗 All Frontend URLs: ${this.urls.frontendUrls.join(', ')}`);
    console.log(`   🔗 Backend URL: ${this.urls.backend}`);
    console.log(`   🔑 JWT Expires: ${this.jwt.expiresIn}`);
  }
};

module.exports = config;