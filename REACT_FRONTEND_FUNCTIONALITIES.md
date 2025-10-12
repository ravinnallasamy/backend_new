# React Frontend Functionalities - Agricultural Equipment Rental Platform

## 🚜 Complete Backend Functionalities for React Integration

Based on the backend implementation, here are all the functionalities your React frontend needs to implement:

## 📋 **1. AUTHENTICATION SYSTEM**

### **Google OAuth Login**
```javascript
// Two separate login flows
const loginAsUser = async (googleToken) => {
  const response = await fetch('/api/auth/user/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: googleToken })
  });
  return response.json();
};

const loginAsProvider = async (googleToken) => {
  const response = await fetch('/api/auth/provider/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: googleToken })
  });
  return response.json();
};
```

**Response Structure:**
```javascript
{
  success: true,
  token: "jwt_token_here",
  user: {
    id: "user_id",
    name: "User Name",
    email: "user@email.com",
    avatar: "profile_picture_url",
    phone: "phone_number",
    address: "user_address",
    userType: "user" | "provider",
    isActivated: true,
    authMethod: "google"
  },
  isNewUser: true/false,
  message: "Account created successfully!" | "Login successful!"
}
```

### **Authentication Management**
```javascript
// Get current user profile
const getCurrentUser = async () => {
  const response = await fetch('/api/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// Refresh JWT token
const refreshToken = async () => {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// Check if email exists
const checkEmail = async (email, userType) => {
  const response = await fetch('/api/auth/check-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, userType })
  });
  return response.json();
};
```

## 📋 **2. USER MANAGEMENT**

### **User Profile Operations**
```javascript
// Get user by ID (protected)
const getUser = async (userId) => {
  const response = await fetch(`/api/users/${userId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// Update user profile (owner only)
const updateUser = async (userId, userData) => {
  const response = await fetch(`/api/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(userData)
  });
  return response.json();
};

// Partial update user (owner only)
const patchUser = async (userId, updates) => {
  const response = await fetch(`/api/users/${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(updates)
  });
  return response.json();
};

// Get user statistics
const getUserStats = async (userId) => {
  const response = await fetch(`/api/users/${userId}/stats`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

**User Statistics Response:**
```javascript
{
  success: true,
  data: {
    user: { /* user profile */ },
    statistics: {
      totalRequests: 5,
      pendingRequests: 2,
      completedRentals: 3,
      activeRentals: 1,
      isProfileComplete: true
    }
  }
}
```

## 📋 **3. PROVIDER MANAGEMENT**

### **Provider Profile Operations**
```javascript
// Get all providers (public)
const getAllProviders = async () => {
  const response = await fetch('/api/providers');
  return response.json();
};

// Get provider by ID (protected)
const getProvider = async (providerId) => {
  const response = await fetch(`/api/providers/${providerId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// Update provider profile (owner only)
const updateProvider = async (providerId, providerData) => {
  const response = await fetch(`/api/providers/${providerId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(providerData)
  });
  return response.json();
};

// Get provider's equipment (owner only)
const getProviderEquipment = async (providerId) => {
  const response = await fetch(`/api/providers/${providerId}/equipment`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// Get provider statistics
const getProviderStats = async (providerId) => {
  const response = await fetch(`/api/providers/${providerId}/stats`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

**Provider Statistics Response:**
```javascript
{
  success: true,
  data: {
    provider: { /* provider profile */ },
    statistics: {
      totalEquipment: 10,
      activeRequests: 5,
      completedRentals: 25,
      totalRentals: 25,
      averageRating: 4.5,
      reviewCount: 20,
      isProfileComplete: true
    }
  }
}
```

## 📋 **4. EQUIPMENT MANAGEMENT**

### **Equipment CRUD Operations**
```javascript
// Get all equipment with filters and pagination (public)
const getEquipment = async (filters = {}) => {
  const queryParams = new URLSearchParams(filters);
  const response = await fetch(`/api/equipments?${queryParams}`);
  return response.json();
};

// Get equipment by ID (public)
const getEquipmentById = async (equipmentId) => {
  const response = await fetch(`/api/equipments/${equipmentId}`);
  return response.json();
};

// Create new equipment (providers only)
const createEquipment = async (equipmentData) => {
  const response = await fetch('/api/equipments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(equipmentData)
  });
  return response.json();
};

// Update equipment (owner only)
const updateEquipment = async (equipmentId, equipmentData) => {
  const response = await fetch(`/api/equipments/${equipmentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(equipmentData)
  });
  return response.json();
};

// Partial update equipment (owner only)
const patchEquipment = async (equipmentId, updates) => {
  const response = await fetch(`/api/equipments/${equipmentId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(updates)
  });
  return response.json();
};

// Delete equipment (owner only)
const deleteEquipment = async (equipmentId) => {
  const response = await fetch(`/api/equipments/${equipmentId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

### **Equipment Search & Filtering**
```javascript
// Search equipment by query
const searchEquipment = async (query, filters = {}) => {
  const queryParams = new URLSearchParams({ ...filters });
  const response = await fetch(`/api/equipments/search/${encodeURIComponent(query)}?${queryParams}`);
  return response.json();
};

// Get equipment by category
const getEquipmentByCategory = async (category, filters = {}) => {
  const queryParams = new URLSearchParams(filters);
  const response = await fetch(`/api/equipments/category/${encodeURIComponent(category)}?${queryParams}`);
  return response.json();
};

// Get equipment statistics
const getEquipmentStats = async (providerId = null) => {
  const queryParams = providerId ? `?providerId=${providerId}` : '';
  const response = await fetch(`/api/equipments/stats/overview${queryParams}`);
  return response.json();
};
```

**Equipment Data Structure:**
```javascript
{
  success: true,
  data: [{
    _id: "equipment_id",
    name: "Tractor Model X",
    category: "Tractors",
    type: "Utility Tractor",
    description: "High-quality tractor for farming",
    price: 150,
    priceUnit: "hour",
    address: "Farm Location",
    coordinates: { latitude: 40.7128, longitude: -74.0060 },
    available: true,
    providerId: {
      _id: "provider_id",
      name: "Provider Name",
      businessName: "Provider Business",
      rating: 4.5,
      avatar: "provider_avatar_url"
    },
    providerEmail: "provider@email.com",
    providerName: "Provider Name",
    specifications: {
      brand: "John Deere",
      model: "X500",
      year: 2020,
      enginePower: "25 HP",
      fuelType: "Diesel"
    },
    images: [
      {
        url: "image_url",
        caption: "Main view",
        isPrimary: true
      }
    ],
    condition: "Excellent",
    averageRating: 4.8,
    reviewCount: 15,
    totalRentals: 45,
    isFeatured: true,
    createdAt: "2024-01-01T00:00:00.000Z"
  }],
  pagination: {
    page: 1,
    limit: 12,
    total: 100,
    pages: 9
  }
}
```

## 📋 **5. RENTAL REQUEST SYSTEM**

### **Request Management**
```javascript
// Get all requests (protected)
const getAllRequests = async (filters = {}) => {
  const queryParams = new URLSearchParams(filters);
  const response = await fetch(`/api/requests?${queryParams}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// Get request by ID (protected)
const getRequest = async (requestId) => {
  const response = await fetch(`/api/requests/${requestId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// Create new rental request (users only)
const createRequest = async (requestData) => {
  const response = await fetch('/api/requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(requestData)
  });
  return response.json();
};

// Update request (protected)
const updateRequest = async (requestId, requestData) => {
  const response = await fetch(`/api/requests/${requestId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(requestData)
  });
  return response.json();
};

// Update request status (protected)
const updateRequestStatus = async (requestId, status, responseMessage, rejectionReason) => {
  const response = await fetch(`/api/requests/${requestId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ status, responseMessage, rejectionReason })
  });
  return response.json();
};

// Add feedback to request (protected)
const addFeedback = async (requestId, feedbackData) => {
  const response = await fetch(`/api/requests/${requestId}/feedback`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(feedbackData)
  });
  return response.json();
};

// Delete request (protected)
const deleteRequest = async (requestId) => {
  const response = await fetch(`/api/requests/${requestId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// Get request statistics
const getRequestStats = async (customerId = null, providerId = null) => {
  const params = new URLSearchParams();
  if (customerId) params.append('customerId', customerId);
  if (providerId) params.append('providerId', providerId);
  const response = await fetch(`/api/requests/stats/overview?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

**Request Data Structure:**
```javascript
{
  success: true,
  data: {
    _id: "request_id",
    customerId: {
      _id: "customer_id",
      name: "Customer Name",
      email: "customer@email.com",
      phone: "1234567890",
      address: "Customer Address",
      avatar: "customer_avatar_url"
    },
    equipmentId: {
      _id: "equipment_id",
      name: "Tractor Model X",
      category: "Tractors",
      type: "Utility Tractor",
      price: 150,
      specifications: { /* equipment specs */ },
      images: [/* equipment images */]
    },
    providerId: {
      _id: "provider_id",
      name: "Provider Name",
      businessName: "Provider Business",
      email: "provider@email.com",
      phone: "0987654321",
      address: "Provider Address",
      avatar: "provider_avatar_url",
      businessType: "Equipment Rental"
    },
    startDate: "2024-01-15T00:00:00.000Z",
    endDate: "2024-01-20T00:00:00.000Z",
    totalDays: 5,
    totalHours: 120,
    pricePerDay: 150,
    pricePerHour: 25,
    totalAmount: 750,
    message: "Need tractor for plowing",
    urgency: "Medium",
    status: "pending", // pending, approved, rejected, cancelled, completed, in-progress
    deliveryAddress: "Farm Address",
    deliveryRequired: true,
    specialRequirements: "Need operator",
    operatorRequired: true,
    requestDate: "2024-01-10T00:00:00.000Z",
    responseDate: "2024-01-11T00:00:00.000Z",
    approvedDate: "2024-01-11T00:00:00.000Z",
    completedDate: null,
    cancelledDate: null,
    inProgressDate: null,
    customerRating: 5,
    customerFeedback: "Excellent service",
    providerRating: 4,
    providerFeedback: "Good customer",
    feedbackDate: "2024-01-21T00:00:00.000Z"
  }
}
```

## 📋 **6. USER-SPECIFIC FUNCTIONS**

### **User Dashboard Functions**
```javascript
// Get user's rental requests
const getUserRequests = async (userId) => {
  const response = await fetch(`/api/users/${userId}/requests`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

### **Provider Dashboard Functions**
```javascript
// Get provider's requests
const getProviderRequests = async (providerId) => {
  const response = await fetch(`/api/providers/${providerId}/requests`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

## 📋 **7. FILTERING & PAGINATION**

### **Equipment Filters**
```javascript
const equipmentFilters = {
  category: "Tractors", // Tractors, Harvesters, Planters, etc.
  type: "Utility Tractor", // Specific equipment type
  available: true, // true/false
  providerId: "provider_id",
  minPrice: 100,
  maxPrice: 500,
  limit: 12, // items per page
  page: 1 // page number
};
```

### **Request Filters**
```javascript
const requestFilters = {
  status: "pending", // pending, approved, rejected, cancelled, completed, in-progress
  customerId: "customer_id",
  providerId: "provider_id",
  equipmentId: "equipment_id"
};
```

## 📋 **8. ERROR HANDLING**

### **Standard Error Response**
```javascript
{
  success: false,
  error: "Error message",
  message: "Detailed error description",
  code: "ERROR_CODE" // for rate limiting, validation, etc.
}
```

### **Common Error Codes**
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `UNAUTHORIZED` - Invalid or missing token
- `FORBIDDEN` - Insufficient permissions
- `VALIDATION_ERROR` - Invalid input data
- `NOT_FOUND` - Resource not found

## 📋 **9. REACT COMPONENTS YOU NEED**

### **Authentication Components**
1. **LoginPage** - Google OAuth login for users/providers
2. **AuthGuard** - Route protection component
3. **UserProfile** - User profile management
4. **ProviderProfile** - Provider profile management

### **Equipment Components**
1. **EquipmentList** - Browse all equipment with filters
2. **EquipmentCard** - Individual equipment display
3. **EquipmentDetails** - Detailed equipment view
4. **EquipmentForm** - Create/Edit equipment (providers only)
5. **EquipmentSearch** - Search functionality
6. **EquipmentFilters** - Filter sidebar/component

### **Request Components**
1. **RequestForm** - Create rental request (users only)
2. **RequestList** - List of requests
3. **RequestCard** - Individual request display
4. **RequestDetails** - Detailed request view
5. **RequestStatusUpdate** - Update request status (providers)
6. **FeedbackForm** - Add feedback to completed requests

### **Dashboard Components**
1. **UserDashboard** - User's dashboard with stats
2. **ProviderDashboard** - Provider's dashboard with stats
3. **StatsWidget** - Statistics display component

### **Navigation Components**
1. **Header** - Navigation with auth status
2. **Sidebar** - Navigation menu
3. **Footer** - Site footer

## 📋 **10. STATE MANAGEMENT**

### **Required State Variables**
```javascript
// Authentication state
const [user, setUser] = useState(null);
const [token, setToken] = useState(null);
const [isAuthenticated, setIsAuthenticated] = useState(false);
const [userType, setUserType] = useState(null); // 'user' or 'provider'

// Equipment state
const [equipment, setEquipment] = useState([]);
const [equipmentFilters, setEquipmentFilters] = useState({});
const [equipmentPagination, setEquipmentPagination] = useState({});

// Request state
const [requests, setRequests] = useState([]);
const [requestFilters, setRequestFilters] = useState({});

// UI state
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
```

## 📋 **11. UTILITY FUNCTIONS**

### **API Helper Functions**
```javascript
// Generic API call function
const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('authToken');
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (response.status === 401) {
      // Token expired, redirect to login
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      window.location.href = '/login';
      return;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

// Token management
const setAuthToken = (token) => {
  localStorage.setItem('authToken', token);
};

const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

const removeAuthToken = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userData');
};

// User data management
const setUserData = (userData) => {
  localStorage.setItem('userData', JSON.stringify(userData));
};

const getUserData = () => {
  const userData = localStorage.getItem('userData');
  return userData ? JSON.parse(userData) : null;
};
```

This comprehensive guide covers all the functionalities implemented in your backend. Your React frontend should implement these API calls and components to create a complete agricultural equipment rental platform.
