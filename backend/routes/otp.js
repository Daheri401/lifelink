const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'lifelink'
};

async function getConnection() {
  return mysql.createConnection(dbConfig);
}

// Import email OTP functions
const { generateOTP, sendOTP, storeOTP, verifyOTP } = require('../emailOTP');

// In-memory OTP storage (keyed by EMAIL, not phone)
const otpStore = {}; // Format: { "email": { code: "123456", expiry: timestamp, attempts: 0, verified: false } }
const pendingUsers = {}; // Format: { "email": { name, email, phone, password, role, location } }

// POST /api/auth/register - Initial registration & OTP generation (sends to EMAIL)
router.post('/auth/register', async (req, res) => {
  let connection;
  try {
    const { name, email, phone, password, role, location } = req.body;

    // Validation
    if (!name || !email || !phone || !password || !role) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    if (!email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Invalid email address' });
    }

    // Check if email has a pending OTP already
    if (otpStore[email]) {
      return res.status(409).json({ success: false, message: 'An OTP has already been sent to this email. Please check your inbox.' });
    }

    connection = await getConnection();
    const [existingUsers] = await connection.execute(
      'SELECT user_id FROM users WHERE phone = ? OR email = ? LIMIT 1',
      [phone, email]
    );
    if (existingUsers.length > 0) {
      return res.status(409).json({ success: false, message: 'User already registered. Please log in.' });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiryTime = Date.now() + (5 * 60 * 1000); // 5 minutes

    // Send OTP to EMAIL
    console.log(`\n📧 SENDING OTP TO EMAIL`);
    console.log(`📧 Email: ${email}`);
    const emailSent = await sendOTP(email, otp);

    if (!emailSent) {
      console.error(`❌ Failed to send OTP email to ${email}`);
      await connection.end().catch(() => {});
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please check your email address and try again.'
      });
    }

    // Store OTP (keyed by EMAIL)
    otpStore[email] = {
      code: otp,
      expiry: expiryTime,
      attempts: 0,
      maxAttempts: 5,
      verified: false
    };

    // Store user data temporarily
    pendingUsers[email] = {
      name,
      email,
      phone,
      password: password,
      role,
      location: location || ''
    };

    console.log(`✅ OTP sent to email: ${email}`);
    console.log(`🧑 Name: ${name}`);
    console.log(`📱 Phone: ${phone}`);
    console.log(`📋 Role: ${role}`);
    console.log(`⏰ Expires in: 5 minutes\n`);

    await connection.end().catch(() => {});

    res.json({
      success: true,
      message: 'OTP sent to your email! Check your inbox and spam folder.',
      email: email
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Registration failed: ' + error.message });
  }
});

// POST /api/auth/verify-otp - Verify OTP and complete registration (uses EMAIL as key)
router.post('/auth/verify-otp', async (req, res) => {
  let connection;
  try {
    const { email, otp } = req.body;

    console.log(`\n📧 VERIFYING OTP FOR EMAIL: ${email}`);

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP required' });
    }

    // Check if OTP exists
    if (!otpStore[email]) {
      console.error(`❌ No OTP found for email: ${email}`);
      return res.status(400).json({ success: false, message: 'No registration found for this email. Please register again.' });
    }

    const otpData = otpStore[email];

    // Check if expired
    if (Date.now() > otpData.expiry) {
      console.warn(`⏰ OTP expired for ${email}`);
      delete otpStore[email];
      delete pendingUsers[email];
      return res.status(400).json({ success: false, message: 'OTP expired. Please register again.' });
    }

    // Check attempts
    if (otpData.attempts >= otpData.maxAttempts) {
      console.warn(`🚫 Max attempts reached for ${email}`);
      delete otpStore[email];
      delete pendingUsers[email];
      return res.status(400).json({ success: false, message: 'Too many attempts. Please register again.' });
    }

    // Verify OTP
    if (otpData.code !== otp) {
      otpData.attempts += 1;
      const remaining = otpData.maxAttempts - otpData.attempts;
      console.log(`❌ Wrong OTP attempt for ${email}. Attempts: ${otpData.attempts}/${otpData.maxAttempts}`);
      
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
        attemptsLeft: remaining
      });
    }

    console.log(`✅ OTP verified for ${email}`);

    // OTP verified: persist user in database, create role-specific profile, then log user in.
    const userData = pendingUsers[email];
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    connection = await getConnection();
    await connection.beginTransaction();

    const [existingUsers] = await connection.execute(
      'SELECT user_id FROM users WHERE phone = ? OR email = ? LIMIT 1',
      [userData.phone, userData.email]
    );

    if (existingUsers.length > 0) {
      await connection.rollback();
      delete otpStore[email];
      delete pendingUsers[email];
      console.warn(`⚠️ User already exists: ${email}`);
      return res.status(409).json({ success: false, message: 'User already registered. Please log in.' });
    }

    const safeUserName = (userData.name || '').toLowerCase().replace(/\s+/g, '_').slice(0, 200);
    const [userResult] = await connection.execute(
      'INSERT INTO users (full_name, email, phone, user_name, password, role) VALUES (?, ?, ?, ?, ?, ?)',
      [userData.name, userData.email, userData.phone, safeUserName, hashedPassword, userData.role]
    );

    const userId = userResult.insertId;
    console.log(`👤 User created: ID ${userId}, Email: ${userData.email}, Role: ${userData.role}`);

    if (userData.role === 'donor') {
      await connection.execute(
        'INSERT INTO donors (donor_id, blood_group, city) VALUES (?, ?, ?)',
        [userId, 'O+', userData.location || 'Unknown']
      );
      console.log(`🩸 Donor profile created for user ${userId}`);
    } else if (userData.role === 'hospital') {
      await connection.execute(
        'INSERT INTO hospitals (hospital_id, hospital_name, location) VALUES (?, ?, ?)',
        [userId, userData.name, userData.location || 'Unknown']
      );
      console.log(`🏥 Hospital profile created for user ${userId}`);
    } else {
      await connection.rollback();
      console.error(`❌ Invalid role: ${userData.role}`);
      return res.status(400).json({ success: false, message: 'Invalid role provided' });
    }

    await connection.commit();

    console.log(`\n✅ OTP VERIFIED AND ACCOUNT CREATED`);
    console.log(`📧 Email: ${userData.email}`);
    console.log(`📱 Phone: ${userData.phone}`);
    console.log(`🧑 User: ${userData.name}`);
    console.log(`📋 Role: ${userData.role}`);
    console.log(`✓ Account registered successfully!\n`);

    // Establish authenticated session for immediate dashboard access
    req.session.userId = userId;
    req.session.role = userData.role;
    req.session.name = userData.name;

    // Clean up temporary OTP data (keyed by EMAIL)
    delete otpStore[email];
    delete pendingUsers[email];

    res.json({
      success: true,
      message: 'Account verified successfully!',
      email: userData.email,
      phone: userData.phone,
      role: userData.role,
      name: userData.name,
      redirect: userData.role === 'hospital' ? '/hospital-dashboard' : '/donor-dashboard'
    });

  } catch (error) {
    if (connection) {
      await connection.rollback().catch(() => {});
      await connection.end().catch(() => {});
    }
    console.error('OTP verification error:', error);
    res.status(500).json({ success: false, message: 'Verification failed: ' + error.message });
    return;
  } finally {
    if (connection) {
      await connection.end().catch(() => {});
    }
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
