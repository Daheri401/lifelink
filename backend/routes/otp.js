const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

// In-memory OTP storage (for development - no database needed yet)
const otpStore = {}; // Format: { "phone": { code: "123456", expiry: timestamp, attempts: 0, verified: false } }
const pendingUsers = {}; // Format: { "phone": { name, email, phone, password, role, location } }

// Generate random 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/auth/register - Initial registration & OTP generation
router.post('/auth/register', (req, res) => {
  try {
    const { name, email, phone, password, role, location } = req.body;

    // Validation
    if (!name || !phone || !password || !role) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Check if phone already registered
    if (otpStore[phone]) {
      return res.status(409).json({ success: false, message: 'Phone already in use' });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiryTime = Date.now() + (5 * 60 * 1000); // 5 minutes

    // Store OTP
    otpStore[phone] = {
      code: otp,
      expiry: expiryTime,
      attempts: 0,
      maxAttempts: 3,
      verified: false
    };

    // Store user data temporarily
    pendingUsers[phone] = {
      name,
      email,
      phone,
      password: password, // Will hash after verification
      role,
      location: location || ''
    };

    // Log OTP to console for testing/debugging
    console.log(`\n🔐 OTP GENERATED`);
    console.log(`📱 Phone: ${phone}`);
    console.log(`✅ OTP: ${otp}`);
    console.log(`🧑 Name: ${name}`);
    console.log(`📧 Role: ${role}`);
    console.log(`⏰ Expires in: 5 minutes\n`);

    res.json({
      success: true,
      message: 'OTP sent successfully! Check console for testing.',
      phone: phone.slice(-4) // Return only last 4 digits
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

// POST /api/auth/verify-otp - Verify OTP and complete registration
router.post('/auth/verify-otp', (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Phone and OTP required' });
    }

    // Check if OTP exists
    if (!otpStore[phone]) {
      return res.status(400).json({ success: false, message: 'No registration found for this phone' });
    }

    const otpData = otpStore[phone];

    // Check if expired
    if (Date.now() > otpData.expiry) {
      delete otpStore[phone];
      delete pendingUsers[phone];
      return res.status(400).json({ success: false, message: 'OTP expired. Please register again.' });
    }

    // Check attempts
    if (otpData.attempts >= otpData.maxAttempts) {
      delete otpStore[phone];
      delete pendingUsers[phone];
      return res.status(400).json({ success: false, message: 'Too many attempts. Please register again.' });
    }

    // Verify OTP
    if (otpData.code !== otp) {
      otpData.attempts += 1;
      const remaining = otpData.maxAttempts - otpData.attempts;
      console.log(`❌ Wrong OTP attempt for ${phone}. Attempts: ${otpData.attempts}/${otpData.maxAttempts}`);
      
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
        attemptsLeft: remaining
      });
    }

    // OTP verified!
    const userData = pendingUsers[phone];
    
    // Mark as verified (in production, save to database here)
    otpData.verified = true;

    console.log(`\n✅ OTP VERIFIED`);
    console.log(`📱 Phone: ${phone}`);
    console.log(`🧑 User: ${userData.name}`);
    console.log(`📧 Role: ${userData.role}`);
    console.log(`✓ Account registered successfully!\n`);

    // Clean up OTP (keep user for session)
    delete otpStore[phone];
    // Keep pendingUsers[phone] for session/dashboard redirect
    
    // In production: Save to database here
    // For now, we just mark as verified and return success

    res.json({
      success: true,
      message: 'Account verified successfully!',
      phone: phone,
      role: userData.role,
      name: userData.name
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

// POST /api/auth/resend-otp - Resend OTP
router.post('/auth/resend-otp', (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number required' });
    }

    if (!pendingUsers[phone]) {
      return res.status(400).json({ success: false, message: 'No pending registration for this phone' });
    }

    // Generate new OTP
    const otp = generateOTP();
    const expiryTime = Date.now() + (5 * 60 * 1000);

    otpStore[phone] = {
      code: otp,
      expiry: expiryTime,
      attempts: 0,
      maxAttempts: 3,
      verified: false
    };

    console.log(`\n🔄 OTP RESENT`);
    console.log(`📱 Phone: ${phone}`);
    console.log(`✅ New OTP: ${otp}`);
    console.log(`⏰ Expires in: 5 minutes\n`);

    res.json({
      success: true,
      message: 'OTP resent successfully!',
      phone: phone.slice(-4)
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to resend OTP' });
  }
});

module.exports = router;
