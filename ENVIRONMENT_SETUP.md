# Environment Configuration Guide

## Overview
This guide explains how to configure the environment variables required for the Agricultural Equipment Rental Platform backend.

## Required Environment Variables

### 1. Server Configuration
```bash
# Server port (default: 5000)
PORT=5000

# Node environment (development/production)
NODE_ENV=production
```

### 2. Database Configuration
```bash
# MongoDB connection string
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rental_app_db
```

**MongoDB Atlas Setup:**
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Create database user with read/write permissions
4. Whitelist your IP address (use 0.0.0.0/0 for all IPs in production)
5. Get connection string and replace `<password>` with your password

### 3. JWT Configuration
```bash
# JWT secret key (use a strong, random string)
JWT_SECRET=your-super-secure-jwt-secret-change-in-production-please-use-a-very-long-random-string-here

# JWT expiration time
JWT_EXPIRE=7d
```

**Security Requirements:**
- JWT_SECRET must be at least 32 characters long
- Use a cryptographically secure random string
- Never use default or weak secrets in production
- Generate using: `openssl rand -base64 64`

### 4. Google OAuth Configuration
```bash
# Google OAuth Client ID
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Google OAuth Client Secret (optional for ID token verification)
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**Google OAuth Setup:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API and Google Identity API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Configure OAuth consent screen:
   - Add your application name
   - Add authorized domains
   - Add scopes: `email`, `profile`, `openid`
6. Add authorized origins:
   - Development: `http://localhost:3000`, `http://localhost:3001`
   - Production: `https://yourdomain.com`
7. Copy Client ID and Client Secret

### 5. URL Configuration (Optional)
```bash
# Frontend URLs
FRONTEND_URL=https://yourdomain.com
USER_FRONTEND_URL=https://yourdomain.com
PROVIDER_FRONTEND_URL=https://provider.yourdomain.com
BACKEND_URL=https://api.yourdomain.com

# Multiple frontend URLs (comma-separated)
FRONTEND_URLS=https://yourdomain.com,https://www.yourdomain.com,https://provider.yourdomain.com

# Frontend ports (comma-separated)
FRONTEND_PORTS=3000,3001,3002
```

### 6. API Configuration (Optional)
```bash
# API version
API_VERSION=v1
```

## Environment Files

### Development (.env.development)
```bash
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/rental_app_db_dev
JWT_SECRET=development-jwt-secret-change-in-production
JWT_EXPIRE=7d
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
FRONTEND_URL=http://localhost:3000
USER_FRONTEND_URL=http://localhost:3000
PROVIDER_FRONTEND_URL=http://localhost:3001
BACKEND_URL=http://localhost:5000
```

### Production (.env.production)
```bash
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rental_app_db
JWT_SECRET=your-super-secure-production-jwt-secret-very-long-random-string
JWT_EXPIRE=7d
GOOGLE_CLIENT_ID=your-production-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-production-google-client-secret
FRONTEND_URL=https://yourdomain.com
USER_FRONTEND_URL=https://yourdomain.com
PROVIDER_FRONTEND_URL=https://provider.yourdomain.com
BACKEND_URL=https://api.yourdomain.com
API_VERSION=v1
```

## Platform-Specific Configuration

### 1. Heroku
```bash
# Set environment variables via Heroku CLI
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your_mongodb_uri
heroku config:set JWT_SECRET=your_jwt_secret
heroku config:set GOOGLE_CLIENT_ID=your_google_client_id
heroku config:set GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 2. Railway
```bash
# Set environment variables via Railway CLI
railway variables set NODE_ENV=production
railway variables set MONGODB_URI=your_mongodb_uri
railway variables set JWT_SECRET=your_jwt_secret
railway variables set GOOGLE_CLIENT_ID=your_google_client_id
```

### 3. Render
```bash
# Set environment variables in Render dashboard
# Go to your service → Environment tab → Add environment variables
```

### 4. Vercel
```bash
# Set environment variables via Vercel CLI
vercel env add NODE_ENV
vercel env add MONGODB_URI
vercel env add JWT_SECRET
vercel env add GOOGLE_CLIENT_ID
```

### 5. DigitalOcean App Platform
```bash
# Set environment variables in DigitalOcean dashboard
# Go to your app → Settings → App-Level Environment Variables
```

## Security Checklist

### ✅ Required Security Measures
- [ ] Use HTTPS in production
- [ ] Set strong JWT_SECRET (32+ characters)
- [ ] Use MongoDB Atlas with proper access controls
- [ ] Configure Google OAuth with correct redirect URIs
- [ ] Set proper CORS origins
- [ ] Enable rate limiting
- [ ] Use environment-specific configurations
- [ ] Never commit .env files to version control

### ✅ Production Deployment Checklist
- [ ] Set NODE_ENV=production
- [ ] Use production MongoDB database
- [ ] Configure production Google OAuth credentials
- [ ] Set production frontend URLs
- [ ] Enable SSL/TLS certificates
- [ ] Configure proper CORS settings
- [ ] Set up monitoring and logging
- [ ] Configure backup strategies

## Validation

The application automatically validates environment variables on startup:

```bash
# Successful validation
✅ Configuration validated successfully
✅ Google OAuth ready for authentication
✅ Production configuration validation passed

# Failed validation
❌ Configuration validation failed: Missing required environment variables: GOOGLE_CLIENT_ID, JWT_SECRET
```

## Troubleshooting

### Common Issues

1. **"Missing required environment variables"**
   - Check that all required variables are set
   - Verify variable names are correct (case-sensitive)
   - Ensure .env file is in the correct location

2. **"Google OAuth not configured"**
   - Verify GOOGLE_CLIENT_ID is set correctly
   - Check Google OAuth consent screen is configured
   - Ensure authorized origins include your domain

3. **"MongoDB connection failed"**
   - Verify MONGODB_URI is correct
   - Check MongoDB Atlas IP whitelist
   - Ensure database user has proper permissions

4. **"JWT secret is weak"**
   - Generate a new JWT_SECRET with at least 32 characters
   - Use cryptographically secure random string

### Environment Variable Testing

Test your environment configuration:

```bash
# Check if variables are loaded
node -e "require('dotenv').config(); console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Missing');"

# Test configuration validation
node -e "require('dotenv').config(); const config = require('./config/config'); config.validate();"
```

## Support

For configuration issues:
1. Check the application logs for specific error messages
2. Verify all environment variables are properly set
3. Test the configuration validation endpoint: `GET /health`
4. Ensure your hosting platform supports environment variables
5. Check platform-specific documentation for environment variable setup

## Security Notes

- Never commit .env files to version control
- Use different credentials for development and production
- Regularly rotate JWT secrets and database passwords
- Monitor access logs for suspicious activity
- Keep dependencies updated for security patches
- Use strong, unique passwords for all services
