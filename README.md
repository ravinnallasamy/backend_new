# Agricultural Equipment Rental Platform - Backend API

## 🚜 Overview
A robust Node.js/Express backend API for an agricultural equipment rental platform that connects farmers with equipment providers. Features Google OAuth authentication, JWT-based authorization, and comprehensive equipment management.

## ✨ Features
- **Google OAuth Authentication** - Secure login for users and providers
- **JWT Authorization** - Token-based authentication with middleware
- **User Management** - Separate user types (customers and providers)
- **Equipment Management** - CRUD operations for agricultural equipment
- **Rental Requests** - Complete rental request workflow
- **Rate Limiting** - Protection against abuse
- **CORS Configuration** - Multi-origin support
- **Security Headers** - Helmet.js integration
- **MongoDB Integration** - Mongoose ODM with proper schemas

## 🏗️ Architecture

### Authentication Flow
```
User → Google OAuth → ID Token → Backend Verification → JWT Token → Protected Routes
```

### User Types
- **Users/Customers**: Rent equipment from providers
- **Providers**: Own and rent out equipment

### API Structure
```
/api/auth/*     - Authentication endpoints
/api/users/*    - User management
/api/providers/* - Provider management  
/api/equipments/* - Equipment management
/api/requests/*  - Rental requests
```

## 🚀 Quick Start

### Prerequisites
- Node.js 14+
- MongoDB (local or Atlas)
- Google Cloud Console account

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd agricultural_rental_backend

# Install dependencies
npm install

# Copy environment template
cp env.example .env

# Update .env with your configuration
# See ENVIRONMENT_SETUP.md for details

# Start development server
npm run dev
```

### Environment Setup
1. **MongoDB**: Set up MongoDB Atlas or local MongoDB
2. **Google OAuth**: Create OAuth 2.0 credentials in Google Cloud Console
3. **JWT Secret**: Generate a secure secret key
4. **Frontend URLs**: Configure CORS origins

See [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) for detailed configuration.

## 📚 Documentation

### Core Documentation
- [Frontend Integration Guide](./FRONTEND_INTEGRATION_GUIDE.md) - Complete frontend integration
- [Environment Setup](./ENVIRONMENT_SETUP.md) - Configuration guide
- [env.example](./env.example) - Environment template

### API Documentation

#### Authentication Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/user/google` | User login with Google | No |
| POST | `/api/auth/provider/google` | Provider login with Google | No |
| GET | `/api/auth/me` | Get current user profile | Yes |
| POST | `/api/auth/refresh` | Refresh JWT token | Yes |
| POST | `/api/auth/logout` | Logout (client-side) | No |
| POST | `/api/auth/check-email` | Check if email exists | No |

#### User Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/users` | Get all users | No |
| GET | `/api/users/:id` | Get user by ID | Yes |
| PUT | `/api/users/:id` | Update user | Yes (Owner) |
| GET | `/api/users/:id/requests` | Get user's requests | Yes (Owner) |

#### Provider Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/providers` | Get all providers | No |
| GET | `/api/providers/:id` | Get provider by ID | Yes |
| PUT | `/api/providers/:id` | Update provider | Yes (Owner) |
| GET | `/api/providers/:id/equipment` | Get provider's equipment | Yes (Owner) |

#### Equipment Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/equipments` | Get all equipment | No |
| GET | `/api/equipments/:id` | Get equipment by ID | No |
| POST | `/api/equipments` | Create equipment | Yes (Provider) |
| PUT | `/api/equipments/:id` | Update equipment | Yes (Owner) |

#### Request Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/requests` | Get all requests | Yes |
| POST | `/api/requests` | Create request | Yes (User) |
| PUT | `/api/requests/:id` | Update request | Yes |
| PATCH | `/api/requests/:id/status` | Update request status | Yes |

## 🔧 Development

### Project Structure
```
agricultural_rental_backend/
├── config/
│   ├── config.js          # Configuration management
│   └── database.js        # MongoDB connection
├── middleware/
│   └── auth.js            # Authentication middleware
├── model/
│   ├── user.js            # User schema
│   ├── provider.js        # Provider schema
│   ├── equipment.js       # Equipment schema
│   └── request.js         # Request schema
├── routes/
│   ├── auth.js            # Authentication routes
│   ├── users.js           # User routes
│   ├── providers.js       # Provider routes
│   ├── equipments.js      # Equipment routes
│   ├── requests.js        # Request routes
│   └── index.js           # Index routes
├── views/                 # Jade templates
├── public/               # Static files
├── app.js                # Main application file
├── bin/www               # Server startup
└── package.json          # Dependencies
```

### Scripts
```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm test           # Run tests (not implemented yet)
npm run lint       # Run linting (placeholder)
npm run build      # Build for production (placeholder)
```

## 🔒 Security Features

### Authentication & Authorization
- Google OAuth 2.0 integration
- JWT token-based authentication
- Role-based access control (Users/Providers)
- Token refresh mechanism
- Secure token storage recommendations

### Security Middleware
- Helmet.js for security headers
- CORS configuration for multiple origins
- Rate limiting on authentication endpoints
- Input sanitization and validation
- SQL injection prevention (NoSQL)

### Best Practices
- Environment variable validation
- Secure JWT secret requirements
- HTTPS enforcement in production
- MongoDB Atlas with proper access controls
- Regular dependency updates

## 🚀 Deployment

### Supported Platforms
- **Heroku** - Easy deployment with environment variables
- **Railway** - Modern deployment platform
- **Render** - Simple deployment with automatic SSL
- **Vercel** - Serverless deployment
- **DigitalOcean App Platform** - Scalable deployment

### Deployment Checklist
- [ ] Set production environment variables
- [ ] Configure MongoDB Atlas
- [ ] Set up Google OAuth for production domain
- [ ] Enable HTTPS
- [ ] Configure CORS for production domains
- [ ] Set up monitoring and logging
- [ ] Configure backup strategies

## 🧪 Testing

### Health Check
```bash
GET /health
```

### Authentication Test
```bash
GET /api/auth/health
```

### Local Testing
```bash
# Test with environment variables
GOOGLE_CLIENT_ID=test JWT_SECRET=test node app.js
```

## 📊 Monitoring

### Health Endpoints
- `GET /health` - General application health
- `GET /api/auth/health` - Authentication service health

### Logging
- Request logging with Morgan
- Error logging with detailed context
- Authentication event logging
- Database connection status

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Set up local environment
4. Make changes with tests
5. Submit a pull request

### Code Standards
- Use async/await for asynchronous operations
- Implement proper error handling
- Add JSDoc comments for functions
- Follow RESTful API conventions
- Maintain security best practices

## 📝 License
MIT License - see LICENSE file for details

## 🆘 Support

### Common Issues
1. **Google OAuth not working**: Check client ID and redirect URIs
2. **MongoDB connection failed**: Verify connection string and IP whitelist
3. **JWT errors**: Ensure JWT_SECRET is properly set
4. **CORS issues**: Verify frontend URLs in configuration

### Getting Help
1. Check the health endpoints
2. Review server logs
3. Verify environment configuration
4. Consult the integration guides
5. Check platform-specific documentation

## 🔄 Changelog

### v1.2.0 (Current)
- ✅ Enhanced Google OAuth architecture
- ✅ JWT middleware implementation
- ✅ Route protection with authentication
- ✅ Comprehensive error handling
- ✅ Frontend integration guide
- ✅ Environment configuration guide
- ✅ Security improvements

### v1.1.0
- ✅ Google OAuth implementation
- ✅ User and Provider models
- ✅ Basic CRUD operations
- ✅ MongoDB integration

### v1.0.0
- ✅ Initial project setup
- ✅ Basic Express server
- ✅ Database schemas
- ✅ API structure

---

**Built with ❤️ for the agricultural community**
