# LifeLink Auth System - Quick Reference

## What Changed

### ✅ New Functions Added to script.js

1. **`getAuthenticatedUser()`**
   - Gets current user from localStorage
   - Returns user object or null

2. **`protectDashboard(isDonorDashboard = true)`**
   - Protects dashboard pages
   - Checks authentication + KYC (for donors)
   - Returns promise that resolves to boolean

3. **`logout()`**
   - Clears localStorage
   - Shows notification
   - Redirects to login

4. **`initializeKycForm()`**
   - Sets up KYC form on page load
   - Pre-populates phone
   - Attaches submit handler

5. **`handleKycSubmit(e)`**
   - Submits KYC to `/api/kyc/submit`
   - Uses FormData for file uploads
   - Saves phone from localStorage

### ✅ Updated Functions

1. **`handleDonorLogin(e)`**
   - Now uses `/api/auth/login` (not `/api/login/donor`)
   - Saves user to localStorage
   - Checks KYC status
   - Redirects based on KYC state

2. **`handleHospitalLogin(e)`**
   - Now uses `/api/auth/login` (unified endpoint)
   - Saves user to localStorage
   - Redirects to hospital dashboard

3. **`handleOtpVerification(e)`**
   - Saves user to localStorage after verification
   - Redirects based on role (donor → KYC form, hospital → dashboard)

4. **`handleDonorSignup(e)`**
   - Uses `/api/auth/register` endpoint
   - Proper error handling

5. **`handleHospitalSignup(e)`**
   - Uses `/api/auth/register` endpoint
   - Proper error handling

### ✅ Fixed All Redirect Paths

Before (Broken):
```
/pages/donor-dashboard.html
/pages/hospital-dashboard.html
/pages/kyc-form.html
/login
/donor-signup
```

After (Fixed):
```
../pages/donor-dashboard.html
../pages/hospital-dashboard.html
../pages/kyc-form.html
../pages/donor-login.html
../pages/kyc-pending.html
```

## Required HTML Changes

### For Donor Dashboard
```html
<body class="donor-dashboard">
  <!-- Your dashboard HTML -->
  <script src="/js/script.js"></script>
</body>
```

### For Hospital Dashboard
```html
<body class="hospital-dashboard">
  <!-- Your dashboard HTML -->
  <script src="/js/script.js"></script>
</body>
```

### For KYC Form
```html
<body class="auth-page">
  <div class="container container-sm py-5">
    <div class="card">
      <div class="card-header text-center">
        <h2>Identity Verification</h2>
        <p>Phone: <span id="phone-display">-</span></p>
      </div>
      <div class="card-body">
        <form id="kyc-form" enctype="multipart/form-data">
          <div class="form-group">
            <label for="blood-group">Blood Group</label>
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
            <label for="id-card">Upload ID Card</label>
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
```

### For Logout Button
```html
<!-- In any dashboard -->
<button onclick="logout()" class="btn btn-secondary">
  Logout
</button>
```

## API Endpoints Your Backend Must Provide

```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/verify-otp
POST /api/kyc/submit
GET /api/kyc/status/:phone
```

Details in AUTHENTICATION_GUIDE.md

## Flow Diagrams

### Donor Flow
```
Register → OTP Verify → localStorage → KYC Form → 
Pending Page ← Login → Check KYC → Dashboard (Protected)
```

### Hospital Flow
```
Register → OTP Verify → localStorage → Hospital Dashboard (Protected)
OR
Login → localStorage → Hospital Dashboard (Protected)
```

## Key Features

✅ Session stored in localStorage  
✅ KYC status checked before dashboard access  
✅ Proper error handling  
✅ Logout functionality  
✅ Debug logging with emojis  
✅ Unified API endpoints  
✅ Relative path routing  
✅ FormData support for file uploads  
✅ User phone pre-populated in KYC form  
✅ Automatic form submission handling  

## Testing Quick Commands

In browser console:

```javascript
// Check current user
getAuthenticatedUser()

// Logout
logout()

// Check if page is protected
protectDashboard(true)

// Manually check KYC status
fetch('/api/kyc/status/+237612345678').then(r => r.json()).then(console.log)
```

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| User redirected after login | KYC not verified | complete KYC form |
| KYC form not loading | localStorage.user missing | ensure OTP verification worked |
| Dashboard blank then redirects | protectDashboard() failing | check logged in status |
| localStorage empty | API error during login | check browser console for errors |
| CORS errors on API calls | Backend not configured | add CORS headers to backend |

## Migration Notes

If upgrading from old system:
1. All users will need to login again (clears old cookies)
2. Old `/pages/` URLs still work (but use `../pages/` in new code)
3. All API endpoints changed - ensure backend is updated
4. localStorage key is 'user' (not 'userPhone' or other variants)

---

For complete details, see: **AUTHENTICATION_GUIDE.md**
