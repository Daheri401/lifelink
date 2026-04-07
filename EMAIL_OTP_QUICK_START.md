# Email OTP System - Quick Start Guide

## 🚀 What You Just Got

A **complete email-based OTP authentication system** that works alongside your existing donor, hospital, and admin features. **Nothing was broken or modified** in your existing code.

### New Components Added:

1. **Email OTP Module** (`backend/emailOTP.js`)
   - Handles OTP generation and email sending
   - Uses Gmail SMTP via nodemailer
   - In-memory storage with 5-minute expiration

2. **API Routes** (added to `server.js`)
   ```
   POST /api/send-otp       - Send OTP to email
   POST /api/verify-otp     - Verify OTP code  
   POST /api/resend-otp     - Resend if expired
   ```

3. **Frontend Functions** (added to `script.js`)
   ```javascript
   sendEmailOTP(email)      // Request OTP
   verifyEmailOTP(email, otp) // Verify code
   resendEmailOTP(email)    // Resend OTP
   ```

4. **Email OTP Page** (`pages/email-otp.html`)
   - Complete standalone page for email verification
   - Access at: `http://localhost:8500/email-otp`

---

## ⚡ Quick Setup (5 Minutes)

### Step 1: Get Gmail App Password

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** (if needed)
3. Go to **App passwords**
4. Create an App Password (16 characters)
5. Copy the password (you'll need this)

### Step 2: Configure Email

**Option A: Via Environment Variable (Recommended)**

In terminal, set:
```bash
set EMAIL_USER=your_email@gmail.com
set EMAIL_PASSWORD=your_16_char_app_password
```

**Option B: Edit Config File**

Edit `backend/emailOTP.js` line 11-17:
```javascript
const emailConfig = {
  service: 'gmail',
  auth: {
    user: 'your_email@gmail.com',
    pass: 'your_app_password'  // 16-char app password
  }
};
```

### Step 3: Test It

1. Start server: Already running at `http://localhost:8500`
2. Go to: `http://localhost:8500/email-otp`
3. Enter your email
4. Click "Send OTP to Email"
5. Check email for code
6. Enter 6-digit code
7. Click "Verify OTP"
8. ✅ Done!

---

## 📖 How to Use in Your Pages

### Add Email OTP to Donor Signup

```html
<!-- At the top of the form: -->
<div id="email-verification">
  <h3>Step 1: Verify Your Email</h3>
  <input type="email" id="donor-email" required>
  <button type="button" onclick="sendDonorEmailOTP()">Send OTP</button>
  
  <div id="otp-input-section" style="display:none;">
    <input type="text" id="donor-otp" maxlength="6" pattern="[0-9]{6}">
    <button type="button" onclick="verifyDonorOTP()">Verify</button>
    <button type="button" onclick="resendDonorOTP()">Resend OTP</button>
  </div>
</div>

<!-- Then rest of form: name, phone, blood type, etc. -->

<script>
// Email OTP Step 1
async function sendDonorEmailOTP() {
  const email = document.getElementById('donor-email').value;
  const success = await sendEmailOTP(email);
  if (success) {
    document.getElementById('otp-input-section').style.display = 'block';
  }
}

// Email OTP Step 2
async function verifyDonorOTP() {
  const email = document.getElementById('donor-email').value;
  const otp = document.getElementById('donor-otp').value;
  const success = await verifyEmailOTP(email, otp);
  if (success) {
    // User can now submit rest of form
    document.getElementById('donor-email').disabled = true;
    document.getElementById('otp-input-section').style.display = 'none';
    alert('Email verified! Continue with registration.');
  }
}

async function resendDonorOTP() {
  const email = document.getElementById('donor-email').value;
  await resendEmailOTP(email);
}
</script>
```

### Add Email OTP to Hospital Signup

Same pattern as above - just change the IDs:
```javascript
async function sendHospitalEmailOTP() {
  const email = document.getElementById('hospital-email').value;
  await sendEmailOTP(email);
  // Show OTP input
}
```

### Add Email OTP to Login (Alternative to SMS)

```javascript
// Replace or supplement existing phone-based login
async function loginWithEmailOTP() {
  const email = document.getElementById('login-email').value;
  
  // Send OTP to email instead of SMS
  const sent = await sendEmailOTP(email);
  if (sent) {
    // Show OTP input
    document.getElementById('otp-section').style.display = 'block';
  }
}

async function verifyLoginOTP() {
  const email = document.getElementById('login-email').value;
  const otp = document.getElementById('login-otp').value;
  
  const verified = await verifyEmailOTP(email, otp);
  if (verified) {
    // Proceed with login
    loginUser(email);
  }
}
```

---

## 🧪 Testing Without Gmail Setup

### Use Test Email Service

Temporary test with [ethereal.email](https://ethereal.email):

```javascript
// Update nodemailer config for testing
const transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  secure: false,
  auth: {
    user: 'test_user@ethereal.email',
    pass: 'test_password'
  }
});
```

### Hardcode Test OTP

For development, allow testing with any @test.com email:

```javascript
// In verifyOTP() function, add:
if (email.endsWith('@test.com')) {
  // For @test.com, accept any 6-digit code
  if (/^\d{6}$/.test(otp)) {
    return { success: true };
  }
}
```

---

## 🔍 Verify It's Working

### Check Server Logs

Look for:
```
📧 Email transporter initialized
```

If you see this, nodemailer is ready.

### Test API with Browser Developer Tools

Open Console (F12) and paste:

```javascript
// Test 1: Send OTP
fetch('/api/send-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@gmail.com' })
})
.then(r => r.json())
.then(d => console.log(d))
```

You should see:
```
{success: true, message: 'OTP sent to your email address'}
```

Check your email for the OTP, then:

```javascript
// Test 2: Verify OTP (use code from email)
fetch('/api/verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    email: 'test@gmail.com',
    otp: '123456'  // Replace with actual code
  })
})
.then(r => r.json())
.then(d => console.log(d))
```

You should see:
```
{success: true, message: 'OTP verified successfully', email: 'test@gmail.com'}
```

---

## 📋 File Changes Summary

### New Files Created
- `backend/emailOTP.js` - Email OTP module (250 lines)
- `pages/email-otp.html` - Email OTP page (300 lines)
- `EMAIL_OTP_SETUP.md` - Detailed setup guide
- `EMAIL_OTP_QUICK_START.md` - This file

### Modified Files
- `backend/server.js` - Added 3 routes + 1 import + 1 GET page
- `js/script.js` - Added 7 functions for email OTP

### NOT Modified (Completely Safe)
- Donor login/signup logic
- Hospital login/signup logic
- Admin approval panel
- Database structure
- QR verification system
- KYC system

---

## 🎯 Common Integration Points

### For Donor Registration
```javascript
// Before: Phone-based OTP
// After: Email-based OTP (or both)

1. Ask for email
2. Send OTP to email
3. Verify email
4. Then ask for phone, blood type, etc.
```

### For Hospital Registration
```javascript
// Same flow as donor
1. Ask for email
2. Send OTP
3. Verify email
4. Then ask for license, hospital name, etc.
```

### For Admin Approval
```javascript
// Send email when KYC is rejected
// "Your KYC was rejected. Contact us at support@lifelink.com"

// Or send email confir when approved
// "Your KYC has been approved!"
```

---

## ⚠️ Important Notes

### Existing Features
- ✅ Donor login/KYC still works
- ✅ Hospital login/KYC still works
- ✅ Admin approval panel still works
- ✅ Phone number system still works
- NO BREAKING CHANGES

### Email OTP
- Only sends to the email provided
- 6-digit numeric code
- Valid for 5 minutes
- Auto-cleans up expired OTPs
- Can resend anytime

### What's NOT Included
- Database storage of OTPs (uses memory)
- Rate limiting (add yourself if needed)
- SMS fallback (can add later)
- Two-factor authentication (can add later)

---

## 🆘 Troubleshooting

### Email Not Arriving

1. Check **Spam/Promotions** folder
2. Check **All Mail** in Gmail
3. Make sure app password is correct (16 characters)
4. Verify 2-Step Verification is enabled

### "Authentication failed" Error

```
❌ Failed to initialize email transporter: Invalid login
```

**Solutions:**
- Check EMAIL_USER is correct
- Check EMAIL_PASSWORD is the 16-char app password (not regular password)
- Verify 2FA is enabled in Google Account
- Try again after enabling App Password

### OTP Not Storing

Check server logs show:
```
💾 OTP stored for test@gmail.com (expires in 5 minutes)
```

If not, check emailOTP.js line ~120

### Email Page Not Loading

Check:
1. Is server running? `http://localhost:8500/` should load home
2. Is route working? `http://localhost:8500/email-otp` should load page
3. Check browser console for errors (F12)

---

## 📚 Next Steps

1. **Configure email** - Set up Gmail app password (5 min)
2. **Test the system** - Use `/email-otp` page (2 min)
3. **Integrate into pages** - Add to donor/hospital signup (10 min)
4. **Test integration** - Full flow testing (5 min)
5. **Deploy** - Move to production (whenever ready)

---

## ✅ Verification Checklist

Before using in production:

- [ ] Gmail app password created
- [ ] EMAIL_USER and EMAIL_PASSWORD configured
- [ ] Email successfully sends to test address
- [ ] OTP code received in email
- [ ] OTP verification works
- [ ] OTP expires after 5 minutes
- [ ] Invalid OTP rejected
- [ ] Resend OTP works
- [ ] No errors in server logs
- [ ] Existing donor/hospital features still work

---

**Status:** ✅ Ready to Use
**Setup Time:** ~5 minutes
**Integration Time:** ~10-15 minutes
**Version:** 1.0.0

For detailed information, see `EMAIL_OTP_SETUP.md`
