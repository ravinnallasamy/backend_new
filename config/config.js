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
    resetExpiresIn: process.env.JWT_RESET_EXPIRE || '1h'
  },
  
  // Email Configuration - UPDATED FOR RESEND
  email: {
    from: process.env.RESEND_FROM_EMAIL || 'Acme <onboarding@resend.dev>'
  },
  
  // Resend Configuration - ADDED NEW SECTION
  resend: {
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL || 'Acme <onboarding@resend.dev>'
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
      'RESEND_API_KEY'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    // Validate Resend configuration with better error messages
    if (!this.resend.apiKey) {
      throw new Error('Resend API Key is required. Check RESEND_API_KEY in environment variables.');
    }
    
    // Validate email format for from email
    const fromEmail = this.resend.fromEmail;
    if (!fromEmail || !fromEmail.includes('@')) {
      console.warn('⚠️  Resend from email may not be properly formatted. Use format: "Your Name <email@domain.com>"');
    }
    
    console.log('✅ Resend configuration validated successfully');
    console.log('✅ Email service ready for activation and password reset emails');
    return true;
  },
  
  // Display current configuration (without sensitive data) - UPDATED
  display() {
    console.log('📋 Current Configuration:');
    console.log(`   🌐 Environment: ${this.nodeEnv}`);
    console.log(`   🚀 Port: ${this.port}`);
    console.log(`   📊 Database: ${this.mongodb.uri.replace(/\/\/.*@/, '//***:***@')}`);
    console.log(`   📧 Email Service: Resend`);
    console.log(`   📧 Email From: ${this.email.from}`);
    console.log(`   🔑 Resend API Key: ${this.resend.apiKey ? '✅ Set' : '❌ Missing'}`);
    console.log(`   🔑 JWT Expires: ${this.jwt.expiresIn}`);
    console.log(`   🔑 JWT Reset Expires: ${this.jwt.resetExpiresIn}`);
    console.log(`   🔗 Primary Frontend URL: ${this.urls.frontend}`);
    console.log(`   🔗 All Frontend URLs: ${this.urls.frontendUrls.join(', ')}`);
    console.log(`   🔗 Backend URL: ${this.urls.backend}`);
    
    // Security recommendations
    if (this.jwt.secret === 'abcd' || this.jwt.activationSecret === 'abcdefgh') {
      console.log('⚠️  Warning: Using default JWT secrets. Change them in production!');
    }
    
    if (this.resend.fromEmail.includes('onboarding@resend.dev')) {
      console.log('💡 Tip: Update RESEND_FROM_EMAIL to use your verified domain');
    }
  },
  
  // Helper method to check if email is configured properly
  isEmailConfigured() {
    return !!(this.resend.apiKey && this.resend.fromEmail);
  },
  
  // Get email configuration safely
  getEmailConfig() {
    return {
      apiKey: this.resend.apiKey,
      fromEmail: this.resend.fromEmail,
      isConfigured: this.isEmailConfigured()
    };
  }
};

// Validate on require if in production
if (config.nodeEnv === 'production') {
  try {
    config.validate();
  } catch (error) {
    console.error('❌ Configuration validation failed in production:', error.message);
    process.exit(1);
  }
}

module.exports = config;