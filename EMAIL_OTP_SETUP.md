# Email OTP System - Setup & Configuration Guide

## ✅ What Was Implemented

### Backend Components

1. **Email OTP Module** (`backend/emailOTP.js`)
   - OTP generation (6-digit random codes)
   - Email sending via Gmail SMTP using nodemailer
   - In-memory OTP storage with expiration (5 minutes)
   - Automatic cleanup of expired OTPs every 5 minutes
   - Comprehensive logging

2. **API Routes** (added to `backend/server.js`)
   - `POST /api/send-otp` - Send OTP to email
   - `POST /api/verify-otp` - Verify OTP code
   - `POST /api/resend-otp` - Resend OTP if expired

3. **Frontend Functions** (added to `js/script.js`)
   - `sendEmailOTP(email)` - Request OTP
   - `verifyEmailOTP(email, otp)` - Verify OTP
   - `resendEmailOTP(email)` - Resend OTP
   - `startResendTimer()` - Countdown timer
   - `isEmailVerified()` - Check verification status
   - `getVerifiedEmail()` - Get stored email
   - `clearEmailVerification()` - Clear session

4. **Frontend Page** (`pages/email-otp.html`)
   - Complete email OTP UI
   - Step 1: Enter email → Send OTP
   - Step 2: Enter 6-digit code → Verify
   - Resend button with 60-second cooldown
   - Auto-submit when 6 digits entered
   - Responsive design with theme support

---

## 🔧 Configuration Steps

### Step 1: Enable Gmail App Password

Gmail requires an App Password for third-party apps (not your regular password).

**For Gmail Account:**

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** (if not already enabled)
3. Go to **App passwords** (appears after 2FA is enabled)
4. Select:
   - Device type: **Select a device (Other - custom name)**
   - Type: **Mail**
5. Google generates a 16-character password
6. Copy this password (you'll need it in Step 2)

**Alternative (Less Secure):**
If you don't want 2FA, you can:
1. Go to [Less secure app access](https://myaccount.google.com/lesssecureapps)
2. Turn ON "Allow less secure apps"
3. Use your regular Gmail password

---

### Step 2: Configure Email Credentials

**Option A: Environment Variables (Recommended)**

Create or edit `.env` file in the `backend/` folder:
```
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_16_char_app_password
```

Then in `backend/emailOTP.js`, the code reads from `process.env`:
```javascript
const emailConfig = {
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your_email@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'your_app_password'
  }
};
```

**Option B: Direct Configuration**

Edit `backend/emailOTP.js` (line 11-17):
```javascript
const emailConfig = {
  service: 'gmail',
  auth: {
    user: 'your_email@gmail.com',          // ← Replace with your email
    pass: 'your_app_password'              // ← Replace with app password
  }
};
```

**Example:**
```javascript
const emailConfig = {
  service: 'gmail',
  auth: {
    user: 'lifelink.support@gmail.com',
    pass: 'abcd efgh ijkl mnop'  // 16-char app password with spaces
  }
};
```

---

### Step 3: Test the System

**Via Browser:**

1. Navigate to: `http://localhost:8500/email-otp`
2. Enter your email address
3. Click "Send OTP to Email"
4. Check your email for the OTP
5. Enter the 6-digit code
6. Click "Verify OTP"
7. You should see ✓ Email verified!

**Via Terminal (cURL):**

```bash
# Step 1: Send OTP
curl -X POST http://localhost:8500/api/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"your_email@gmail.com"}'

# Expected response:
# {"success":true,"message":"OTP sent to your email address"}

# Step 2: Verify OTP (use code from email)
curl -X POST http://localhost:8500/api/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"your_email@gmail.com","otp":"123456"}'

# Expected response:
# {"success":true,"message":"OTP verified successfully","email":"your_email@gmail.com"}
```

---

## 📱 Integration with Existing Pages

### Add Email OTP to Donor Registration

In `pages/donor-signup.html`, add before final form submission:

```html
<div id="email-verification">
  <h3>Step 1: Verify Email</h3>
  <label>Email Address</label>
  <input type="email" id="reg-email" required>
  <button type="button" onclick="handleDonorEmailOTP()">Send OTP</button>
  
  <div id="otp-part" style="display:none;">
    <label>Enter OTP</label>
    <input type="text" id="reg-otp" maxlength="6" pattern="[0-9]{6}">
    <button type="button" onclick="verifyDonorOTP()">Verify</button>
  </div>
</div>
```

Then in JavaScript:
```javascript
async function handleDonorEmailOTP() {
  const email = document.getElementById('reg-email').value;
  const success = await sendEmailOTP(email);
  if (success) {
    document.getElementById('otp-part').style.display = 'block';
  }
}

async function verifyDonorOTP() {
  const email = document.getElementById('reg-email').value;
  const otp = document.getElementById('reg-otp').value;
  const success = await verifyEmailOTP(email, otp);
  if (success) {
    // Allow form submission or next step
    document.getElementById('email-verification').style.display = 'none';
  }
}
```

### Add Email OTP to Hospital Registration

Similar approach for `pages/hospital-signup.html`:

```javascript
async function handleHospitalEmailOTP() {
  const email = document.getElementById('hospital-email').value;
  const success = await sendEmailOTP(email);
  if (success) {
    // Show OTP input
  }
}
```

---

## 🔍 Debugging & Troubleshooting

### Server Console Logs

Watch the terminal running `node server.js` for these logs:

**Success Example:**
```
📧 Email transporter initialized
📧 Sending OTP to: user@gmail.com
🔐 OTP generated: 123456
✅ OTP email sent successfully to user@gmail.com
💾 OTP stored for user@gmail.com (expires in 5 minutes)
🔍 OTP verification attempt for: user@gmail.com
✅ OTP verified successfully for user@gmail.com
```

**Errors:**
```
❌ Failed to initialize email transporter: Invalid login
  → Check EMAIL_USER and EMAIL_PASSWORD are correct

❌ Failed to send OTP email to user@gmail.com: Cannot read properties
  → Check Gmail credentials and 2FA/App Password setup

⚠️ No OTP found for user@gmail.com
  → OTP not requested yet or already verified

⏰ OTP expired for user@gmail.com
  → OTP was valid for 5 minutes, now expired
```

### Browser Console (F12)

Open DevTools and check console for JavaScript logs:

```
📧 Requesting OTP for email: user@gmail.com
✅ OTP sent successfully to: user@gmail.com
🔍 Verifying OTP for: user@gmail.com
✅ OTP verified successfully
```

### Testing Email Delivery

**Gmail Not Showing Email?**

1. Check **Spam/Promotions** folders
2. Check **[Gmail]/All Mail** folder
3. Whitelist sender: Mark email as "Not spam"

**Common Issues:**

| Issue | Solution |
|-------|----------|
| "Authentication failed" | Check app password is correct (16 chars) |
| "Invalid login" | Verify EMAIL_USER exists and 2FA is enabled |
| Email not arriving | Check spam folder, whitelist sender |
| Blank email content | Check HTML template in emailOTP.js |
| OTP not storing | Check in-memory storage logging |

---

## 🔐 Security Notes

### Current Implementation
- ✅ 6-digit OTP (1 in 1 million chance)
- ✅ 5-minute expiration
- ✅ One-time use (deleted after verification)
- ✅ In-memory storage (OTP not in database)
- ✅ Auto-cleanup of expired OTPs

### Future Improvements
- Rate limiting: Max 3 OTP requests per email per hour
- Database logging: Store OTP attempts for audit
- Secure storage: Encrypt OTPs if storing in database
- Bypass for testing: Special test email that returns fixed OTP
- SMS fallback: SMS as alternative to email

---

## 📋 API Reference

### POST /api/send-otp
**Send OTP to email address**

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "OTP sent to your email address"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Please provide a valid email address"
}
```

---

### POST /api/verify-otp
**Verify OTP code**

**Request:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "email": "user@example.com"
}
```

**Error Responses:**
```json
{
  "success": false,
  "message": "OTP has expired. Please request a new one."
}
```

```json
{
  "success": false,
  "message": "Invalid OTP. Please try again."
}
```

---

### POST /api/resend-otp
**Resend OTP if previous one expired**

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "OTP resent to your email address"
}
```

---

## 📝 Usage Examples

### Complete Registration Flow

```javascript
// Step 1: User clicks "Register"
async function startDonorRegistration() {
  const email = document.getElementById('email').value;
  
  // Send OTP
  const otpSent = await sendEmailOTP(email);
  if (!otpSent) return;
  
  // Show OTP input
  document.getElementById('otp-section').style.display = 'block';
}

// Step 2: User enters OTP
async function completeDonorRegistration() {
  const email = document.getElementById('email').value;
  const otp = document.getElementById('otp').value;
  
  // Verify OTP
  const otpVerified = await verifyEmailOTP(email, otp);
  if (!otpVerified) return;
  
  // Now allow form submission with other fields:
  // name, phone, blood_type, etc.
  document.getElementById('registration-form').submit();
}
```

### Login with Email Verification

```javascript
// Alternative to SMS OTP for login
async function loginWithEmailOTP() {
  const email = document.getElementById('email').value;
  
  // Send OTP
  await sendEmailOTP(email);
  
  // Show OTP input
  document.getElementById('otp-input').style.display = 'block';
  
  // After OTP is verified
  // Fetch user credentials and establish session
}
```

---

## ✅ Verification Checklist

Before deploying to production:

- [ ] Gmail App Password created and tested
- [ ] EMAIL_USER and EMAIL_PASSWORD configured
- [ ] Email successfully sends to test address
- [ ] OTP code correctly received in email
- [ ] OTP verification works (correct code)
- [ ] OTP expires after 5 minutes
- [ ] Invalid OTP rejected
- [ ] Resend OTP works
- [ ] Timer shows correct countdown
- [ ] Responsive design works on mobile
- [ ] Theme toggle works
- [ ] No server crashes on errors
- [ ] Console logs show all expected messages
- [ ] Existing donor/hospital/admin features NOT broken

---

## 🚀 Production Deployment

### Environment Setup

1. **Use environment variables:**
   ```bash
   export EMAIL_USER=lifelink@gmail.com
   export EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
   ```

2. **Use secure email service:**
   - SendGrid
   - AWS SES
   - Mailgun
   - (Gmail is OK for testing, not ideal for production volume)

3. **Add rate limiting:**
   ```javascript
   // Max 5 requests per hour per email
   const requestCounts = {};
   if ((requestCounts[email]?.count || 0) > 5) {
     return res.json({ success: false, message: 'Too many requests' });
   }
   ```

4. **Log to database:**
   ```sql
   CREATE TABLE otp_logs (
     id INT PRIMARY KEY AUTO_INCREMENT,
     email VARCHAR(255),
     action ENUM('sent', 'verified', 'failed'),
     timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   ```

---

## 📞 Support

**Common Questions:**

Q: Can I use a different email service?
> Yes. Create a new transporter config in emailOTP.js for SendGrid, Mailgun, etc.

Q: Can I change OTP length to 4 or 8 digits?
> Yes. Edit `OTP_CONFIG.LENGTH` in emailOTP.js (line 34)

Q: Can I change expiration time?
> Yes. Edit `OTP_CONFIG.EXPIRY_MINUTES` in emailOTP.js (line 35)

Q: How do I test without real emails?
> Use ethereal.email (free testing service) or hardcode test OTP for @test.com emails

Q: Can I store OTPs in database instead of memory?
> Yes, but you'll need a database migration and encryption for security

---

**Status:** ✅ Ready to Deploy
**Version:** 1.0.0
**Last Updated:** April 7, 2026
