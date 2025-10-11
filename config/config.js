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
    secret: process.env.JWT_SECRET || 'your-super-secure-jwt-secret-change-in-production',
    activationSecret: process.env.JWT_ACTIVATION_SECRET || 'your-activation-secret-key-change-this-too',
    resetSecret: process.env.JWT_RESET_SECRET || 'your-reset-secret-key-and-this-one-too',
    expiresIn: process.env.JWT_EXPIRE || '7d',
    resetExpiresIn: process.env.JWT_RESET_EXPIRE || '1h',
    activationExpiresIn: '24h'
  },
  
  // Email Configuration - UPDATED FOR NODEMAILER
  email: {
    service: 'gmail',
    user: process.env.GMAIL_USER || 'your.email@gmail.com',
    appPassword: process.env.GMAIL_APP_PASSWORD,
    from: process.env.GMAIL_USER || 'Uzhavan Rentals <your.email@gmail.com>'
  },
  
  // Nodemailer Configuration - NEW
  nodemailer: {
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  },
  
  // URL Configuration
  urls: {
    frontend: process.env.FRONTEND_URL || 'http://localhost:3000',
    userFrontend: process.env.USER_FRONTEND_URL || 'http://localhost:3000',
    providerFrontend: process.env.PROVIDER_FRONTEND_URL || 'http://localhost:3001',
    backend: process.env.BACKEND_URL || 'http://localhost:5000',
    activationPath: '/activate',
    resetPath: '/reset-password',
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

  // Security Configuration
  security: {
    password: {
      minLength: 6
    },
    rateLimiting: {
      enabled: true
    },
    cors: {
      enabled: true,
      credentials: true
    }
  },
  
  // Validation - UPDATED FOR NODEMAILER
  validate() {
    const required = [
      'GMAIL_USER',
      'GMAIL_APP_PASSWORD',
      'JWT_SECRET',
      'JWT_ACTIVATION_SECRET', 
      'JWT_RESET_SECRET'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    // Validate Gmail configuration
    if (!this.email.user || !this.email.appPassword) {
      throw new Error('Gmail configuration is required. Check GMAIL_USER and GMAIL_APP_PASSWORD in environment variables.');
    }

    // Validate JWT secrets in production
    if (this.nodeEnv === 'production') {
      const weakSecrets = [];
      if (this.jwt.secret.includes('abcd') || this.jwt.secret.length < 32) {
        weakSecrets.push('JWT_SECRET');
      }
      if (this.jwt.activationSecret.includes('abcdefgh') || this.jwt.activationSecret.length < 32) {
        weakSecrets.push('JWT_ACTIVATION_SECRET');
      }
      if (this.jwt.resetSecret.includes('rstsecret') || this.jwt.resetSecret.length < 32) {
        weakSecrets.push('JWT_RESET_SECRET');
      }
      
      if (weakSecrets.length > 0) {
        throw new Error(`Weak JWT secrets detected in production: ${weakSecrets.join(', ')}. Use strong, random secrets.`);
      }
    }
    
    console.log('✅ Configuration validated successfully');
    console.log('✅ Email service (Nodemailer/Gmail) ready for activation and password reset emails');
    return true;
  },
  
  // Display current configuration - UPDATED FOR NODEMAILER
  display() {
    console.log('\n📋 ===== APPLICATION CONFIGURATION =====');
    console.log(`   🌐 Environment: ${this.nodeEnv}`);
    console.log(`   🚀 Port: ${this.port}`);
    console.log(`   📊 Database: ${this.mongodb.uri.replace(/\/\/.*@/, '//***:***@')}`);
    console.log(`   📧 Email Service: Nodemailer (Gmail)`);
    console.log(`   📧 Email From: ${this.email.from}`);
    console.log(`   📧 Gmail User: ${this.email.user}`);
    console.log(`   🔑 Gmail App Password: ${this.email.appPassword ? '✅ Configured' : '❌ Missing'}`);
    console.log(`   🔑 JWT Expires: ${this.jwt.expiresIn}`);
    console.log(`   🔑 JWT Reset Expires: ${this.jwt.resetExpiresIn}`);
    console.log(`   🔗 Primary Frontend URL: ${this.urls.frontend}`);
    console.log(`   🔗 Backend URL: ${this.urls.backend}`);
    
    // Security status
    console.log('\n🔒 ===== SECURITY STATUS =====');
    const jwtSecretsSecure = !(
      this.jwt.secret === 'abcd' || 
      this.jwt.activationSecret === 'abcdefgh' || 
      this.jwt.resetSecret === 'rstsecret'
    );
    console.log(`   JWT Secrets: ${jwtSecretsSecure ? '✅ Secure' : '⚠️  Using defaults'}`);
    
    const emailConfigured = this.isEmailConfigured();
    console.log(`   Email Service: ${emailConfigured ? '✅ Ready' : '❌ Not configured'}`);
    
    const usingProductionDB = !this.mongodb.uri.includes('localhost');
    console.log(`   Database: ${usingProductionDB ? '✅ Production' : '⚠️  Development'}`);
    
    // Warnings and recommendations
    console.log('\n💡 ===== RECOMMENDATIONS =====');
    if (!jwtSecretsSecure && this.nodeEnv === 'production') {
      console.log('   ❌ CRITICAL: Change default JWT secrets in production!');
    }
    
    if (this.email.user.includes('your.email@gmail.com')) {
      console.log('   💡 Tip: Update GMAIL_USER to use your actual Gmail address');
    }
    
    if (!usingProductionDB && this.nodeEnv === 'production') {
      console.log('   💡 Tip: Use MongoDB Atlas for production database');
    }
    
    if (this.urls.frontend.includes('localhost') && this.nodeEnv === 'production') {
      console.log('   💡 Tip: Update FRONTEND_URL to your production domain');
    }

    console.log('==========================================\n');
  },
  
  // Helper method to check if email is configured properly - UPDATED
  isEmailConfigured() {
    return !!(this.email.user && this.email.appPassword);
  },
  
  // Get email configuration safely - UPDATED
  getEmailConfig() {
    return {
      service: this.email.service,
      user: this.email.user,
      from: this.email.from,
      isConfigured: this.isEmailConfigured()
    };
  },

  // Get Nodemailer configuration - NEW
  getNodemailerConfig() {
    return {
      service: this.nodemailer.service,
      auth: {
        user: this.nodemailer.auth.user,
        pass: this.nodemailer.auth.pass
      }
    };
  },

  // Get activation URL
  getActivationUrl(token) {
    const baseUrl = this.urls.frontend.replace(/\/+$/, '');
    const path = this.urls.activationPath.replace(/^\/+/, '');
    return `${baseUrl}/${path}/${token}`;
  },

  // Get reset password URL
  getResetPasswordUrl(token) {
    const baseUrl = this.urls.frontend.replace(/\/+$/, '');
    const path = this.urls.resetPath.replace(/^\/+/, '');
    return `${baseUrl}/${path}/${token}`;
  },

  // Check if running in development mode
  isDevelopment() {
    return this.nodeEnv === 'development';
  },

  // Check if running in production mode
  isProduction() {
    return this.nodeEnv === 'production';
  }
};

// Enhanced validation for production
if (config.nodeEnv === 'production') {
  try {
    console.log('🔍 Validating production configuration...');
    config.validate();
    console.log('✅ Production configuration validation passed');
  } catch (error) {
    console.error('❌ Production configuration validation failed:', error.message);
    console.error('💡 Please check your environment variables and try again');
    process.exit(1);
  }
} else {
  // Development mode - validate but don't exit
  try {
    config.validate();
  } catch (error) {
    console.warn('⚠️  Configuration validation warnings (development mode):', error.message);
    console.log('🔄 Continuing in development mode despite warnings...');
  }
}

module.exports = config;