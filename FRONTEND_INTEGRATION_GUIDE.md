# Frontend Integration Guide - Agricultural Equipment Rental Platform

## Overview
This guide provides comprehensive instructions for integrating the agricultural equipment rental backend with your frontend application using Google OAuth authentication.

## Table of Contents
1. [Authentication Flow](#authentication-flow)
2. [Google OAuth Setup](#google-oauth-setup)
3. [Frontend Implementation](#frontend-implementation)
4. [API Integration](#api-integration)
5. [Error Handling](#error-handling)
6. [Security Best Practices](#security-best-practices)

## Authentication Flow

### 1. Google OAuth Flow
```
User clicks "Sign in with Google" 
→ Google OAuth popup/redirect
→ User authorizes app
→ Google returns ID token
→ Frontend sends token to backend
→ Backend verifies token and returns JWT
→ Frontend stores JWT for API calls
```

### 2. User Types
- **Users/Customers**: Rent equipment from providers
- **Providers**: Own and rent out equipment

## Google OAuth Setup

### 1. Create Google OAuth Application
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Configure OAuth consent screen
6. Add authorized origins:
   - `http://localhost:3000` (development)
   - `https://yourdomain.com` (production)
7. Add authorized redirect URIs:
   - `http://localhost:3000` (development)
   - `https://yourdomain.com` (production)

### 2. Environment Variables
Set these environment variables in your backend:
```bash
GOOGLE_CLIENT_ID=your_google_client_id_here
JWT_SECRET=your_super_secure_jwt_secret_here
MONGODB_URI=your_mongodb_connection_string
```

## Frontend Implementation

### 1. Install Required Dependencies

#### React/Next.js
```bash
npm install @google-cloud/local-auth google-auth-library
# or for browser
npm install google-auth-library
```

#### Vue.js
```bash
npm install vue-google-oauth2
```

#### Vanilla JavaScript
```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

### 2. Google OAuth Integration

#### React Implementation
```jsx
import { useEffect } from 'react';

const GoogleAuth = () => {
  useEffect(() => {
    // Load Google OAuth script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      window.google.accounts.id.initialize({
        client_id: 'YOUR_GOOGLE_CLIENT_ID',
        callback: handleCredentialResponse
      });
    };
  }, []);

  const handleCredentialResponse = async (response) => {
    try {
      const result = await fetch('/api/auth/user/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: response.credential })
      });

      const data = await result.json();
      
      if (data.success) {
        // Store JWT token
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));
        
        // Redirect or update UI
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Authentication failed:', error);
    }
  };

  return (
    <div>
      <div id="g_id_onload"
           data-client_id="YOUR_GOOGLE_CLIENT_ID"
           data-callback="handleCredentialResponse">
      </div>
      <div className="g_id_signin"
           data-type="standard"
           data-size="large"
           data-theme="outline"
           data-text="sign_in_with"
           data-shape="rectangular"
           data-logo_alignment="left">
      </div>
    </div>
  );
};
```

#### Vue.js Implementation
```vue
<template>
  <div>
    <GoogleLogin
      :params="params"
      :onSuccess="onSuccess"
      :onFailure="onFailure">
      Sign in with Google
    </GoogleLogin>
  </div>
</template>

<script>
import GoogleLogin from 'vue-google-oauth2';

export default {
  components: {
    GoogleLogin
  },
  data() {
    return {
      params: {
        client_id: 'YOUR_GOOGLE_CLIENT_ID'
      }
    }
  },
  methods: {
    async onSuccess(googleUser) {
      try {
        const idToken = googleUser.getAuthResponse().id_token;
        
        const response = await fetch('/api/auth/user/google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: idToken })
        });

        const data = await response.json();
        
        if (data.success) {
          localStorage.setItem('authToken', data.token);
          localStorage.setItem('userData', JSON.stringify(data.user));
          this.$router.push('/dashboard');
        }
      } catch (error) {
        console.error('Authentication failed:', error);
      }
    },
    onFailure(error) {
      console.error('Google OAuth failed:', error);
    }
  }
}
</script>
```

### 3. Authentication Service

Create an authentication service to manage tokens and API calls:

```javascript
// authService.js
class AuthService {
  constructor() {
    this.baseURL = 'http://localhost:5000/api';
    this.token = localStorage.getItem('authToken');
  }

  // Set authorization header
  getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`
    };
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.token;
  }

  // Get current user data
  getCurrentUser() {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  }

  // Make authenticated API call
  async apiCall(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, config);
      
      // Handle token expiration
      if (response.status === 401) {
        this.logout();
        throw new Error('Session expired');
      }

      return await response.json();
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  }

  // Login with Google token
  async loginWithGoogle(token, userType = 'user') {
    try {
      const endpoint = userType === 'provider' ? '/auth/provider/google' : '/auth/user/google';
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token })
      });

      const data = await response.json();
      
      if (data.success) {
        this.token = data.token;
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));
        return data;
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  // Logout
  logout() {
    this.token = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    // Redirect to login page
    window.location.href = '/login';
  }

  // Refresh token
  async refreshToken() {
    try {
      const data = await this.apiCall('/auth/refresh', {
        method: 'POST'
      });
      
      if (data.success) {
        this.token = data.token;
        localStorage.setItem('authToken', data.token);
        return data;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.logout();
    }
  }
}

export default new AuthService();
```

## API Integration

### 1. Protected Routes
Use the authentication service for protected API calls:

```javascript
// Example: Get user profile
const getUserProfile = async () => {
  try {
    const data = await authService.apiCall('/auth/me');
    return data.user;
  } catch (error) {
    console.error('Failed to get user profile:', error);
  }
};

// Example: Get equipment list
const getEquipment = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams(filters);
    const data = await authService.apiCall(`/equipments?${queryParams}`);
    return data.data;
  } catch (error) {
    console.error('Failed to get equipment:', error);
  }
};

// Example: Create rental request
const createRequest = async (requestData) => {
  try {
    const data = await authService.apiCall('/requests', {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
    return data;
  } catch (error) {
    console.error('Failed to create request:', error);
  }
};
```

### 2. Route Protection
Implement route guards to protect authenticated pages:

```javascript
// React Router example
import { Navigate } from 'react-router-dom';
import authService from './authService';

const ProtectedRoute = ({ children }) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Usage
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

```javascript
// Vue Router example
router.beforeEach((to, from, next) => {
  const isAuthenticated = authService.isAuthenticated();
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login');
  } else {
    next();
  }
});
```

## Error Handling

### 1. Authentication Errors
Handle common authentication errors:

```javascript
const handleAuthError = (error) => {
  switch (error.status) {
    case 401:
      // Token expired or invalid
      authService.logout();
      break;
    case 403:
      // Access denied
      alert('You do not have permission to access this resource');
      break;
    case 429:
      // Rate limited
      alert('Too many requests. Please try again later.');
      break;
    default:
      console.error('Authentication error:', error);
  }
};
```

### 2. Network Error Handling
Implement retry logic and offline handling:

```javascript
const apiCallWithRetry = async (endpoint, options = {}, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await authService.apiCall(endpoint, options);
    } catch (error) {
      if (i === retries - 1) throw error;
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

## Security Best Practices

### 1. Token Storage
- **DO**: Store JWT in localStorage for persistence
- **DO**: Implement token refresh mechanism
- **DON'T**: Store sensitive data in localStorage
- **DON'T**: Expose tokens in URLs or logs

### 2. HTTPS
- **ALWAYS** use HTTPS in production
- **ALWAYS** validate SSL certificates
- **NEVER** send tokens over HTTP

### 3. CORS Configuration
The backend is configured to allow requests from:
- `http://localhost:3000` (development)
- `http://localhost:3001` (provider frontend)
- Your production domains

### 4. Input Validation
- Validate all user inputs on the frontend
- Sanitize data before sending to backend
- Implement proper error handling

## API Endpoints Reference

### Authentication Endpoints
- `POST /api/auth/user/google` - User login with Google
- `POST /api/auth/provider/google` - Provider login with Google
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - Logout (client-side)
- `POST /api/auth/check-email` - Check if email exists

### User Endpoints
- `GET /api/users` - Get all users (public)
- `GET /api/users/:id` - Get user by ID (protected)
- `PUT /api/users/:id` - Update user (protected, owner only)
- `GET /api/users/:id/requests` - Get user's requests (protected, owner only)

### Provider Endpoints
- `GET /api/providers` - Get all providers (public)
- `GET /api/providers/:id` - Get provider by ID (protected)
- `PUT /api/providers/:id` - Update provider (protected, owner only)
- `GET /api/providers/:id/equipment` - Get provider's equipment (protected, owner only)

### Equipment Endpoints
- `GET /api/equipments` - Get all equipment (public)
- `GET /api/equipments/:id` - Get equipment by ID (public)
- `POST /api/equipments` - Create equipment (protected, providers only)
- `PUT /api/equipments/:id` - Update equipment (protected, owner only)

### Request Endpoints
- `GET /api/requests` - Get all requests (protected)
- `POST /api/requests` - Create request (protected, users only)
- `PUT /api/requests/:id` - Update request (protected)
- `PATCH /api/requests/:id/status` - Update request status (protected)

## Testing

### 1. Local Testing
1. Start the backend server: `npm start`
2. Set up your frontend with the Google OAuth client ID
3. Test authentication flow
4. Test protected API endpoints

### 2. Production Deployment
1. Update Google OAuth settings with production URLs
2. Set environment variables on your hosting platform
3. Deploy backend with proper CORS configuration
4. Deploy frontend with production Google OAuth client ID

## Support

For technical support or questions:
1. Check the API health endpoint: `GET /api/auth/health`
2. Review server logs for detailed error messages
3. Ensure all environment variables are properly set
4. Verify Google OAuth configuration

## Changelog

- **v1.0.0**: Initial implementation with Google OAuth
- **v1.1.0**: Added JWT middleware and route protection
- **v1.2.0**: Enhanced error handling and security features
