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
  
  // Email Configuration - UPDATED FOR EMAILJS
  email: {
    from: process.env.EMAIL_FROM || 'uzhavanrentals@gmail.com'
  },
  
  // EmailJS Configuration - ADDED NEW SECTION
  emailjs: {
    serviceId: process.env.EMAILJS_SERVICE_ID,
    activationTemplateId: process.env.EMAILJS_ACTIVATION_TEMPLATE_ID,
    resetTemplateId: process.env.EMAILJS_RESET_TEMPLATE_ID,
    publicKey: process.env.EMAILJS_PUBLIC_KEY,
    privateKey: process.env.EMAILJS_PRIVATE_KEY
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
  
  // Validation - UPDATED FOR EMAILJS
  validate() {
    const required = [
      'EMAILJS_SERVICE_ID',
      'EMAILJS_ACTIVATION_TEMPLATE_ID',
      'EMAILJS_RESET_TEMPLATE_ID',
      'EMAILJS_PUBLIC_KEY',
      'EMAILJS_PRIVATE_KEY'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    // Validate EmailJS configuration with better error messages
    if (!this.emailjs.serviceId) {
      throw new Error('EmailJS Service ID is required. Check EMAILJS_SERVICE_ID in environment variables.');
    }
    if (!this.emailjs.activationTemplateId) {
      throw new Error('EmailJS Activation Template ID is required. Check EMAILJS_ACTIVATION_TEMPLATE_ID in environment variables.');
    }
    if (!this.emailjs.resetTemplateId) {
      throw new Error('EmailJS Reset Template ID is required. Check EMAILJS_RESET_TEMPLATE_ID in environment variables.');
    }
    if (!this.emailjs.publicKey) {
      throw new Error('EmailJS Public Key is required. Check EMAILJS_PUBLIC_KEY in environment variables.');
    }
    if (!this.emailjs.privateKey) {
      throw new Error('EmailJS Private Key is required. Check EMAILJS_PRIVATE_KEY in environment variables.');
    }
    
    console.log('✅ EmailJS configuration validated successfully');
    return true;
  },
  
  // Display current configuration (without sensitive data) - UPDATED
  display() {
    console.log('📋 Current Configuration:');
    console.log(`   🌐 Environment: ${this.nodeEnv}`);
    console.log(`   🚀 Port: ${this.port}`);
    console.log(`   📊 Database: ${this.mongodb.uri.replace(/\/\/.*@/, '//***:***@')}`);
    console.log(`   📧 Email Service: EmailJS`);
    console.log(`   📧 Email From: ${this.email.from}`);
    console.log(`   🔑 EmailJS Service: ${this.emailjs.serviceId ? '✅ Configured' : '❌ Missing'}`);
    console.log(`   🔑 Activation Template: ${this.emailjs.activationTemplateId ? '✅ Configured' : '❌ Missing'}`);
    console.log(`   🔑 Reset Template: ${this.emailjs.resetTemplateId ? '✅ Configured' : '❌ Missing'}`);
    console.log(`   🔑 EmailJS API Keys: ${this.emailjs.publicKey && this.emailjs.privateKey ? '✅ Set' : '❌ Missing'}`);
    console.log(`   🔗 Primary Frontend URL: ${this.urls.frontend}`);
    console.log(`   🔗 All Frontend URLs: ${this.urls.frontendUrls.join(', ')}`);
    console.log(`   🔗 Backend URL: ${this.urls.backend}`);
    console.log(`   🔑 JWT Expires: ${this.jwt.expiresIn}`);
  }
};

module.exports = config;