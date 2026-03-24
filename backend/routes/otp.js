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

// In-memory OTP storage (for development - no database needed yet)
const otpStore = {}; // Format: { "phone": { code: "123456", expiry: timestamp, attempts: 0, verified: false } }
const pendingUsers = {}; // Format: { "phone": { name, email, phone, password, role, location } }

// Generate random 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/auth/register - Initial registration & OTP generation
router.post('/auth/register', async (req, res) => {
  let connection;
  try {
    const { name, email, phone, password, role, location } = req.body;

    // Validation
    if (!name || !phone || !password || !role) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Check if phone has a pending OTP already
    if (otpStore[phone]) {
      return res.status(409).json({ success: false, message: 'Phone already in use' });
    }

    connection = await getConnection();
    const [existingUsers] = await connection.execute(
      'SELECT user_id FROM users WHERE phone = ? OR email = ? LIMIT 1',
      [phone, email || '']
    );
    if (existingUsers.length > 0) {
      return res.status(409).json({ success: false, message: 'User already registered. Please log in.' });
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
  } finally {
    if (connection) {
      await connection.end().catch(() => {});
    }
  }
});

// POST /api/auth/verify-otp - Verify OTP and complete registration
router.post('/auth/verify-otp', async (req, res) => {
  let connection;
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

    // OTP verified: persist user in database, create role-specific profile, then log user in.
    const userData = pendingUsers[phone];
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    connection = await getConnection();
    await connection.beginTransaction();

    const [existingUsers] = await connection.execute(
      'SELECT user_id FROM users WHERE phone = ? OR email = ? LIMIT 1',
      [userData.phone, userData.email || '']
    );

    if (existingUsers.length > 0) {
      await connection.rollback();
      delete otpStore[phone];
      delete pendingUsers[phone];
      return res.status(409).json({ success: false, message: 'User already registered. Please log in.' });
    }

    const safeUserName = (userData.name || '').toLowerCase().replace(/\s+/g, '_').slice(0, 200);
    const [userResult] = await connection.execute(
      'INSERT INTO users (full_name, email, phone, user_name, password, role) VALUES (?, ?, ?, ?, ?, ?)',
      [userData.name, userData.email || '', userData.phone, safeUserName, hashedPassword, userData.role]
    );

    const userId = userResult.insertId;

    if (userData.role === 'donor') {
      await connection.execute(
        'INSERT INTO donors (donor_id, blood_group, city) VALUES (?, ?, ?)',
        [userId, 'O+', userData.location || 'Unknown']
      );
    } else if (userData.role === 'hospital') {
      await connection.execute(
        'INSERT INTO hospitals (hospital_id, hospital_name, location) VALUES (?, ?, ?)',
        [userId, userData.name, userData.location || 'Unknown']
      );
    } else {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Invalid role provided' });
    }

    await connection.commit();

    console.log(`\n✅ OTP VERIFIED`);
    console.log(`📱 Phone: ${phone}`);
    console.log(`🧑 User: ${userData.name}`);
    console.log(`📧 Role: ${userData.role}`);
    console.log(`✓ Account registered successfully!\n`);

    // Establish authenticated session for immediate dashboard access
    req.session.userId = userId;
    req.session.role = userData.role;
    req.session.name = userData.name;

    // Clean up temporary OTP data
    delete otpStore[phone];
    delete pendingUsers[phone];

    res.json({
      success: true,
      message: 'Account verified successfully!',
      phone: phone,
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
    res.status(500).json({ success: false, message: 'Verification failed' });
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
