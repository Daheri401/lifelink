# LifeLink Authentication System - Test Checklist & API Response Format

## Testing Checklist

### Backend Setup ✓
- [ ] All API endpoints implemented (list below)
- [ ] CORS configured to allow frontend requests
- [ ] Database schema created
- [ ] Session management configured
- [ ] File upload handling for KYC documents
- [ ] OTP generation and verification logic
- [ ] Password hashing (bcrypt or similar)

### API Response Format

Each API must return JSON in this format:

#### POST /api/auth/register
```json
{
  "success": true,
  "message": "OTP sent to +237612345678",
  "user": {
    "user_id": 1,
    "phone": "+237612345678",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "donor"
  }
}
```

#### POST /api/auth/login
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "user_id": 1,
    "phone": "+237612345678",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "donor"
  }
}
```

#### POST /api/auth/verify-otp
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "user": {
    "user_id": 1,
    "phone": "+237612345678",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "donor"
  }
}
```

#### POST /api/kyc/submit
```json
{
  "success": true,
  "message": "KYC documents submitted successfully"
}
```

#### GET /api/kyc/status/:phone
```json
{
  "verified": false,
  "pending": true,
  "bloodGroup": "O+",
  "rejectionReason": null
}
```

### Frontend Testing

#### Test 1: Donor Registration Flow
```
1. Open pages/donor-signup.html
2. Fill form:
   - Full Name: John Doe
   - Email: john@example.com
   - Phone: +237612345678
   - Password: password123
   - Location: Yaoundé
3. Click "Create Account"
4. Check console for: "Attempting donor signup..."
5. Form should hide, OTP inputs should appear
6. Enter OTP: 123456
7. Check console for: "User saved to localStorage"
8. Should redirect to pages/kyc-form.html
✓ PASS / ✗ FAIL
```

#### Test 2: KYC Form Submission
```
1. Should be on pages/kyc-form.html
2. Phone should pre-populate: +237612345678
3. Select Blood Group: O+
4. Upload ID Card: (any image file)
5. Click "Submit Verification"
6. Check console for: "Submitting KYC to /api/kyc/submit"
7. Check localStorage: localStorage.user should have phone
8. Should redirect to pages/kyc-pending.html
✓ PASS / ✗ FAIL
```

#### Test 3: Donor Login - Verified
```
1. Open pages/donor-login.html
2. Ensure KYC was approved (verify in DB or admin panel)
3. Enter phone: +237612345678
4. Enter password: password123
5. Click "Login"
6. Check console: "🔐 Attempting donor login"
7. Check localStorage: user object should be saved
8. Check console: "📋 KYC status: {verified: true}"
9. Should redirect to pages/donor-dashboard.html
✓ PASS / ✗ FAIL
```

#### Test 4: Donor Login - KYC Pending
```
1. Open pages/donor-login.html
2. Ensure KYC is pending (in DB)
3. Enter phone and password
4. Check console: "KYC status: {pending: true}"
5. Should redirect to pages/kyc-pending.html
✓ PASS / ✗ FAIL
```

#### Test 5: Donor Login - KYC Not Started
```
1. Open pages/donor-login.html
2. Ensure KYC was never submitted
3. Enter phone and password (non-donor account)
4. Check console: "KYC status: {verified: false, pending: false}"
5. Should redirect to pages/kyc-form.html
✓ PASS / ✗ FAIL
```

#### Test 6: Hospital Registration & Login
```
1. Open pages/hospital-signup.html
2. Fill form with hospital details
3. Click "Register Hospital"
4. Enter OTP when prompted
5. Check console: "User saved to localStorage"
6. Should redirect to pages/hospital-dashboard.html
✓ PASS / ✗ FAIL
```

#### Test 7: Dashboard Protection - Donor
```
1. Open pages/donor-dashboard.html (NOT logged in)
2. Check console for: "🛡️ Protecting dashboard"
3. Should redirect to pages/donor-login.html
✓ PASS / ✗ FAIL
```

#### Test 8: Dashboard Protection - Hospital
```
1. Open pages/hospital-dashboard.html (NOT logged in)
2. Check console for: "🛡️ Protecting dashboard"
3. Should redirect to pages/donor-login.html
✓ PASS / ✗ FAIL
```

#### Test 9: Logout
```
1. While logged in on dashboard
2. Click Logout button (or call logout() in console)
3. Check console: "🚪 Logging out user"
4. Check localStorage: user key should be deleted
5. Should redirect to pages/donor-login.html
✓ PASS / ✗ FAIL
```

#### Test 10: localStorage Persistence
```
1. Login successfully
2. Check localStorage.user is populated
3. Refresh page
4. Should remain logged in
5. Should load dashboard successfully
✓ PASS / ✗ FAIL
```

#### Test 11: Invalid Credentials
```
1. Open pages/donor-login.html
2. Enter wrong phone or password
3. Watch console for error
4. Should show "❌ Login failed" notification
5. Should NOT redirect
✓ PASS / ✗ FAIL
```

#### Test 12: OTP Error Handling
```
1. During registration, intentionally enter wrong OTP
2. Check console for error message
3. Should show "Invalid OTP" error
4. Should show remaining attempts
5. Should NOT redirect
✓ PASS / ✗ FAIL
```

### Console Debug Verification

All functions should log to console. Check for these patterns:

**Failed Login Test:**
```
🔐 Attempting donor login with identifier: +237612345678
✅ Login response: {success: false, message: "Invalid credentials"}
❌ Error: Invalid credentials
```

**Successful Login Test:**
```
🔐 Attempting donor login with identifier: +237612345678
✅ Login response: {user: {...}, success: true}
💾 User saved to localStorage: {phone: "+237612345678", ...}
📋 KYC status: {verified: true}
✓ User is verified, redirecting to dashboard
→ Redirecting to dashboard
```

**Dashboard Protection Test:**
```
🛡️ Protecting dashboard...
⚠️ No authenticated user, redirecting to login
```

## Edge Cases to Test

- [ ] User with very long password
- [ ] User with special characters in name
- [ ] Multiple users logged in from different tabs
- [ ] localStorage cleared while logged in
- [ ] API timeout (no response for 30 seconds)
- [ ] Network error during login
- [ ] Rapid clicks on login button
- [ ] Going Back button after login
- [ ] Opening new tab during KYC submission
- [ ] Expired OTP (if backend implements)
- [ ] Wrong role in login request

## Performance Checks

- [ ] Login completes within 3 seconds
- [ ] KYC submission completes within 5 seconds
- [ ] Page protections check within 1 second
- [ ] No console errors on page load
- [ ] No duplicate API calls

## Browser Compatibility

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome
- [ ] Mobile Safari

## Security Checks

- [ ] localStorage only stores non-sensitive data
- [ ] No passwords in localStorage
- [ ] No API keys exposed in frontend code
- [ ] HTTPS required for production
- [ ] CORS properly configured
- [ ] Session cookies marked as HttpOnly
- [ ] Session cookies marked as Secure
- [ ] CSRF tokens implemented (if applicable)

---

## Quick Debug Commands

Run in browser console on any page:

```javascript
// Check current user
getAuthenticatedUser()

// Check if dashboard is protected
protectDashboard(true)

// View all localStorage
console.log(localStorage)

// Check if user is saved
console.log(JSON.parse(localStorage.getItem('user')))

// Check if OTP inputs are setup
document.querySelectorAll('.otp-input')

// Manually trigger logout
logout()

// Check if forms are wired
console.log(document.getElementById('donor-login-form')?.onsubmit)
```

---

## Success Criteria

✅ All 12 test cases pass
✅ No console errors
✅ All redirects work correctly
✅ localStorage properly stores/clears user data
✅ KYC status correctly prevents unauthorized dashboard access
✅ Login works with both phone and email
✅ OTP verification works
✅ KYC submission works
✅ Dashboard is protected
✅ Logout clears session
✅ Debug console logs appear
✅ All response formats match specification
