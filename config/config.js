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
    expiresIn: process.env.JWT_EXPIRE || '7d'
  },
  
  // Google OAuth Configuration - NEW
  googleOAuth: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET
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

  // Security Configuration
  security: {
    rateLimiting: {
      enabled: true
    },
    cors: {
      enabled: true,
      credentials: true
    }
  },
  
  // Validation - UPDATED FOR GOOGLE OAUTH
  validate() {
    const required = [
      'GOOGLE_CLIENT_ID',
      'JWT_SECRET'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate JWT secrets in production
    if (this.nodeEnv === 'production') {
      const weakSecrets = [];
      if (this.jwt.secret.includes('abcd') || this.jwt.secret.length < 32) {
        weakSecrets.push('JWT_SECRET');
      }
      
      if (weakSecrets.length > 0) {
        throw new Error(`Weak JWT secrets detected in production: ${weakSecrets.join(', ')}. Use strong, random secrets.`);
      }
    }
    
    console.log('✅ Configuration validated successfully');
    console.log('✅ Google OAuth ready for authentication');
    return true;
  },
  
  // Display current configuration - UPDATED FOR GOOGLE OAUTH
  display() {
    console.log('\n📋 ===== APPLICATION CONFIGURATION =====');
    console.log(`   🌐 Environment: ${this.nodeEnv}`);
    console.log(`   🚀 Port: ${this.port}`);
    console.log(`   📊 Database: ${this.mongodb.uri.replace(/\/\/.*@/, '//***:***@')}`);
    console.log(`   🔐 Authentication: Google OAuth`);
    console.log(`   🔑 Google Client ID: ${this.googleOAuth.clientId ? '✅ Configured' : '❌ Missing'}`);
    console.log(`   🔑 JWT Expires: ${this.jwt.expiresIn}`);
    console.log(`   🔗 Primary Frontend URL: ${this.urls.frontend}`);
    console.log(`   🔗 Backend URL: ${this.urls.backend}`);
    
    // Security status
    console.log('\n🔒 ===== SECURITY STATUS =====');
    const jwtSecretsSecure = !(
      this.jwt.secret === 'abcd' || 
      this.jwt.secret.length < 32
    );
    console.log(`   JWT Secrets: ${jwtSecretsSecure ? '✅ Secure' : '⚠️  Using defaults'}`);
    
    const oauthConfigured = this.isOAuthConfigured();
    console.log(`   Google OAuth: ${oauthConfigured ? '✅ Ready' : '❌ Not configured'}`);
    
    const usingProductionDB = !this.mongodb.uri.includes('localhost');
    console.log(`   Database: ${usingProductionDB ? '✅ Production' : '⚠️  Development'}`);
    
    // Warnings and recommendations
    console.log('\n💡 ===== RECOMMENDATIONS =====');
    if (!jwtSecretsSecure && this.nodeEnv === 'production') {
      console.log('   ❌ CRITICAL: Change default JWT secrets in production!');
    }
    
    if (!oauthConfigured) {
      console.log('   ❌ CRITICAL: Google OAuth Client ID is required!');
    }
    
    if (!usingProductionDB && this.nodeEnv === 'production') {
      console.log('   💡 Tip: Use MongoDB Atlas for production database');
    }
    
    if (this.urls.frontend.includes('localhost') && this.nodeEnv === 'production') {
      console.log('   💡 Tip: Update FRONTEND_URL to your production domain');
    }

    console.log('==========================================\n');
  },
  
  // Helper method to check if Google OAuth is configured properly
  isOAuthConfigured() {
    return !!(this.googleOAuth.clientId);
  },
  
  // Get Google OAuth configuration
  getOAuthConfig() {
    return {
      clientId: this.googleOAuth.clientId,
      clientSecret: this.googleOAuth.clientSecret,
      isConfigured: this.isOAuthConfigured()
    };
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