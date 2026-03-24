# LifeLink Authentication & KYC System - Implementation Guide

## System Architecture

The authentication system has been completely refactored to work with a real backend API and localStorage for session persistence.

### Key Components

```
Frontend (script.js)
    ↓
localStorage (user session)
    ↓
API Endpoints
    ↓
Backend (Node.js/Express)
    ↓
Database (MySQL)
```

## API Endpoints Required

Your backend must implement these endpoints:

### 1. Register User
```
POST /api/auth/register
Body: {
  name: string,
  email: string,
  phone: string,
  password: string,
  role: "donor" | "hospital",
  location: string
}
Response: {
  success: boolean,
  message: string,
  user?: { phone, name, email, role }
}
```

### 2. Login User
```
POST /api/auth/login
Body: {
  identifier: string (phone or email),
  password: string,
  role: "donor" | "hospital"
}
Response: {
  success: boolean,
  message: string,
  user?: { user_id, phone, name, email, role }
}
```

### 3. Verify OTP
```
POST /api/auth/verify-otp
Body: {
  phone: string,
  otp: string (6 digits)
}
Response: {
  success: boolean,
  message: string,
  user?: { phone, name, email, role },
  attemptsLeft?: number
}
```

### 4. Submit KYC
```
POST /api/kyc/submit
Headers: { "Content-Type": "multipart/form-data" }
Body: FormData {
  phone: string,
  bloodGroup: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-",
  idCard: File
}
Response: {
  success: boolean,
  message: string
}
```

### 5. Check KYC Status
```
GET /api/kyc/status/:phone
Response: {
  verified: boolean,
  pending: boolean,
  bloodGroup?: string,
  rejectionReason?: string
}
```

### 6. Get User Profile (Optional)
```
GET /api/profile
Headers: { "Authorization": "Bearer {sessionToken}" }
Response: {
  success: boolean,
  user: { user_id, phone, name, email, role, kyc_verified, blood_type }
}
```

## Frontend Usage

### In HTML Pages

Add data attributes to body tag:
```html
<!-- For donor dashboard -->
<body class="donor-dashboard" data-user-role="donor">

<!-- For hospital dashboard -->
<body class="hospital-dashboard" data-user-role="hospital">

<!-- For KYC form -->
<body data-page="kyc-form">
```

### Login Page (donor-login.html)
```html
<!DOCTYPE html>
<html>
<head>
  <title>Donor Login - LifeLink</title>
  <link rel="stylesheet" href="../css/styles.css">
</head>
<body class="auth-page">
  <div class="container container-sm py-5">
    <div class="card">
      <div class="card-header text-center">
        <h2>Donor Login</h2>
      </div>
      <div class="card-body">
        <form id="donor-login-form">
          <div class="form-group">
            <label class="form-label" for="login-identifier">
              Phone Number or Email
            </label>
            <input 
              type="text" 
              id="login-identifier" 
              class="form-input" 
              placeholder="+237 6XX XXX XXX or email" 
              required
            >
          </div>
          <div class="form-group">
            <label class="form-label" for="password">Password</label>
            <input 
              type="password" 
              id="password" 
              class="form-input" 
              required
            >
          </div>
          <button type="submit" class="btn btn-primary btn-large mb-3">
            Login
          </button>
        </form>
      </div>
    </div>
  </div>
  
  <script src="/js/script.js"></script>
</body>
</html>
```

### Donor Dashboard (donor-dashboard.html)
```html
<!DOCTYPE html>
<html>
<head>
  <title>Donor Dashboard - LifeLink</title>
  <link rel="stylesheet" href="../css/styles.css">
</head>
<body class="donor-dashboard">
  <!-- Dashboard content -->
  <script src="/js/script.js"></script>
  <script>
    // Dashboard is automatically protected by protectDashboard()
    // which is called in DOMContentLoaded
  </script>
</body>
</html>
```

### KYC Form (kyc-form.html)
```html
<!DOCTYPE html>
<html>
<head>
  <title>KYC Verification - LifeLink</title>
  <link rel="stylesheet" href="../css/styles.css">
</head>
<body class="auth-page">
  <div class="container container-sm py-5">
    <div class="card">
      <div class="card-header text-center">
        <h2>Identity Verification (KYC)</h2>
        <p>Phone: <span id="phone-display">-</span></p>
      </div>
      <div class="card-body">
        <form id="kyc-form">
          <div class="form-group">
            <label class="form-label" for="blood-group">
              Blood Group
            </label>
            <select id="blood-group" class="form-input" required>
              <option value="">Select blood group</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label" for="id-card">
              Upload ID Card
            </label>
            <input 
              type="file" 
              id="id-card" 
              class="form-input" 
              accept="image/*,.pdf" 
              required
            >
          </div>
          
          <button type="submit" class="btn btn-primary btn-large">
            Submit Verification
          </button>
        </form>
      </div>
    </div>
  </div>
  
  <script src="/js/script.js"></script>
</body>
</html>
```

## localStorage Structure

After successful authentication:
```javascript
// User object stored in localStorage
localStorage.user = {
  user_id: 1,
  phone: "+237612345678",
  name: "John Doe",
  email: "john@example.com",
  role: "donor"  // or "hospital"
}
```

## Function Reference

### Core Authentication Functions

#### `getAuthenticatedUser()`
Returns the current user from localStorage or null if not authenticated.
```javascript
const user = getAuthenticatedUser();
if (user) {
  console.log('User:', user.name);
} else {
  console.log('Not authenticated');
}
```

#### `protectDashboard(isDonorDashboard = true)`
Protects a dashboard page - checks authentication and KYC status.
```javascript
// Donor dashboard - checks both auth and KYC
protectDashboard(true).then(isValid => {
  if (isValid) {
    // Initialize dashboard
  }
});

// Hospital dashboard - checks only auth
protectDashboard(false).then(isValid => {
  if (isValid) {
    // Initialize dashboard
  }
});
```

#### `logout()`
Logs out the current user and clears localStorage.
```javascript
// Add logout button handler
document.getElementById('logout-btn').addEventListener('click', logout);
```

#### `handleDonorLogin(e)`
Handles donor login form submission. Automatically called by setupFormHandlers().

#### `handleOtpVerification(e)`
Handles OTP verification form submission. Automatically called by setupFormHandlers().

#### `handleKycSubmit(e)`
Handles KYC form submission. Automatically called by initializeKycForm().

#### `initializeKycForm()`
Initializes the KYC form on page load. Automatically called by DOMContentLoaded.

## Complete User Flow

### Donor Registration → Login → Verification → Dashboard

```
1. User visits /pages/donor-signup.html
   ↓
2. Fills form and clicks "Create Account"
   ↓ handleDonorSignup()
3. POST /api/auth/register
   ↓ (on success)
4. Form hides, OTP input shown
   ↓
5. User enters OTP and clicks "Verify"
   ↓ handleOtpVerification()
6. POST /api/auth/verify-otp
   ↓ (on success)
7. User saved to localStorage
   ↓
8. Redirected to ../pages/kyc-form.html
   ↓
9. Fills KYC form (blood type + ID card)
   ↓ handleKycSubmit()
10. POST /api/kyc/submit
    ↓ (on success)
11. Redirected to ../pages/kyc-pending.html
    ↓
12. User waits for admin approval OR comes back later to login
    ↓
13. User visits /pages/donor-login.html
    ↓
14. Fills login form (phone + password)
    ↓ handleDonorLogin()
15. POST /api/auth/login
    ↓ (on success)
16. User saved to localStorage
    ↓
17. GET /api/kyc/status/{phone}
    ↓
18. If verified: redirect to ../pages/donor-dashboard.html
    If pending: redirect to ../pages/kyc-pending.html
    If not started: redirect to ../pages/kyc-form.html
    ↓
19. Dashboard page loads
    ↓ protectDashboard()
20. Checks localStorage for user
    ↓
21. Checks KYC status
    ↓
22. If all valid: Dashboard initializes
    else: Redirect to login or KYC form
```

### Hospital Registration → Login → Dashboard

```
1. User visits /pages/hospital-signup.html
   ↓
2. Fills form and clicks "Register Hospital"
   ↓ handleHospitalSignup()
3. POST /api/auth/register
   ↓ (on success)
4. Form hides, OTP input shown
   ↓
5. User enters OTP and clicks "Verify"
   ↓ handleOtpVerification()
6. POST /api/auth/verify-otp
   ↓ (on success)
7. User saved to localStorage
   ↓
8. Redirected to ../pages/hospital-dashboard.html
   ↓
9. Hospital dashboard page loads
    ↓ protectDashboard(false)
10. Checks localStorage for user
    ↓
11. If valid: Dashboard initializes
    else: Redirect to login

OR

1. User visits /pages/hospital-login.html
   ↓
2. Fills login form (email/registration number + password)
   ↓ handleHospitalLogin()
3. POST /api/auth/login
   ↓ (on success)
4. User saved to localStorage
   ↓
5. Redirected to ../pages/hospital-dashboard.html
```

## Debug Logging

All functions include debug logs. Open browser console (F12) to see:

```
🔐 Attempting donor login with identifier: +237612345678
✅ Login response: {user: {...}, success: true}
💾 User saved to localStorage: {...}
📋 KYC status: {verified: true}
✓ User is verified, redirecting to dashboard
→ Redirecting to dashboard
```

## Troubleshooting

### User Redirected to Login After Registration
- **Cause**: OTP verification failed or API returned error
- **Fix**: Check browser console for error messages, verify OTP API implementation

### KYC Form Not Loading
- **Cause**: User not authenticated in localStorage
- **Fix**: Ensure signup → OTP verification → login flow is complete

### Dashboard Shows Blank/Loads Then Redirects
- **Cause**: Dashboard protection check failing
- **Fix**: Check localStorage has 'user' key, check KYC status API response

### localStorage Data Not Persisting
- **Cause**: localStorage disabled or page in private/incognito mode
- **Fix**: Test in normal browser mode, check browser storage settings

### API Calls Failing with CORS Errors
- **Cause**: Backend not configured for cross-origin requests
- **Fix**: Ensure backend has proper CORS headers configured
  ```javascript
  // In backend
  app.use(cors());
  // or
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });
  ```

## Security Notes

1. **Never store sensitive data in localStorage** (already following this)
2. **Always validate user input** on frontend (implemented)
3. **Use HTTPS in production** (must be enforced at deployment)
4. **Set secure cookies** on backend:
   ```javascript
   app.use(session({
     secret: 'your-secret-key',
     cookie: { 
       secure: true,  // HTTPS only
       httpOnly: true, // No JS access
       sameSite: 'strict'
     }
   }));
   ```
5. **Implement CSRF protection** (use tokens for POST requests)
6. **Rate limit authentication endpoints** to prevent brute force attacks

## Testing Checklist

- [ ] Donor Registration → OTP → KYC → Login → Dashboard
- [ ] Hospital Registration → OTP → Login → Dashboard  
- [ ] Login with phone number
- [ ] Login with email address
- [ ] Incorrect password shows error
- [ ] User without verified KYC redirected to KYC form
- [ ] Logout clears localStorage and redirects to login
- [ ] Dashboard inaccessible without authentication
- [ ] KYC form shows pre-populated phone number
- [ ] KYC submission saves to database
- [ ] Admin can approve/reject KYC
- [ ] All redirect paths work correctly
- [ ] Console logs appear for debugging
