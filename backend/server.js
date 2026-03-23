const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const multer = require('multer');

// Route imports
const otpRoutes = require('./routes/otp');
const kycRoutes = require('./routes/kyc');
const qrVerificationRoutes = require('./routes/qr-verification');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root', // Update with your MySQL username
  password: '', // Update with your MySQL password
  database: 'lifelink'
};

const app = express();
const PORT = 8500;

// Middleware
app.use(express.static(path.join(__dirname, '../lifelink-ui')));
app.use(express.static(path.join(__dirname, '../css')));
app.use(express.static(path.join(__dirname, '../uploads'))); // Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads'))); // KYC uploads
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "lifelink_secret_key_for_session",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
  })
);

// Database connection function
async function getConnection() {
  return await mysql.createConnection(dbConfig);
}

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/login');
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.session.role === role) {
      return next();
    }
    res.status(403).send('Access denied');
  };
}

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname,"../pages", "splash.html"));
});

app.get("/home", (req, res) => {
  res.sendFile(path.join(__dirname,"../pages", "index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname,"../pages", "login.html"));
});

app.get("/register-otp", (req, res) => {
  res.sendFile(path.join(__dirname,"../pages", "register-otp.html"));
});

app.get("/verify-otp.html", (req, res) => {
  res.sendFile(path.join(__dirname,"../pages", "verify-otp.html"));
});

app.get("/css", (req, res) => {
  res.sendFile(path.join(__dirname,"../css", "styles.css"));
});

app.get("/css/styles.css", (req, res) => {
  res.sendFile(path.join(__dirname,"../css", "styles.css"));
});

app.get("/script", (req, res) => {
  res.sendFile(path.join(__dirname,"../js", "script.js"));
});

app.get("/js/script.js", (req, res) => {
  res.sendFile(path.join(__dirname,"../js", "script.js"));
});

app.get("/donor-signup", (req, res) => {
  res.sendFile(path.join(__dirname, "../pages", "donor-signup.html"));
});

app.get("/hospital-signup", (req, res) => {
  res.sendFile(path.join(__dirname, "../pages", "hospital-signup.html"));
});

app.get("/donor-login", (req, res) => {
  res.sendFile(path.join(__dirname, "../pages", "donor-login.html"));
});

app.get("/hospital-login", (req, res) => {
  res.sendFile(path.join(__dirname, "../pages", "hospital-login.html"));
});

app.get("/privacy", (req, res) => {
  res.sendFile(path.join(__dirname, "../pages", "privacy.html"));
});

app.get("/verification", (req, res) => {
  res.sendFile(path.join(__dirname, "../pages", "verification.html"));
});

app.get("/kyc-form", (req, res) => {
  res.sendFile(path.join(__dirname, "../pages", "kyc-form.html"));
});

app.get("/donor-dashboard", requireAuth, requireRole('donor'), (req, res) => {
  res.sendFile(path.join(__dirname, "../pages", "donor-dashboard.html"));
});

app.get("/hospital-dashboard", requireRole('hospital'), (req, res) => {
  res.sendFile(path.join(__dirname, "../pages", "hospital-dashboard.html"));
});

app.get("/admin-dashboard", requireRole('admin'), (req, res) => {
  res.sendFile(path.join(__dirname, "../pages", "admin-dashboard.html"));
});

app.get("/hospital-kyc", requireAuth, requireRole('hospital'), (req, res) => {
  res.sendFile(path.join(__dirname, "../pages", "hospital-kyc.html"));
});

app.get("/kyc-verification", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "../pages", "kyc-verification.html"));
});

app.get("/donation-history", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "../pages", "donation-history.html"));
});

app.get("/request-details", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "../pages", "request-details.html"));
});

app.get("/wallet", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "../pages", "wallet.html"));
});



// API Routes

// Register donor
app.post('/api/register/donor', async (req, res) => {
  let connection;
  try {
    const { full_name, user_name, email, phone, password, location} = req.body;
    
    // Validate required fields
    if (!full_name || !user_name || !email || !phone || !password || !location) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required',
        received: { full_name, user_name,email, phone, password, location }
      });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);

    connection = await getConnection();
    
    // Insert into users table
    const [userResult] = await connection.execute(
      'INSERT INTO users (full_name, user_name, email, phone, password, location, role) VALUES (?, ?, ?, ?, ?, ?)',
      [full_name, user_name, email, phone, location, hashedPassword, 'donor']
    );

    // Insert into donors table
    await connection.execute(
      'INSERT INTO donors (donor_id, blood_group, city) VALUES (?, ?, ?)',
      [userResult.insertId, bloodGroup, city]
    );

    await connection.end();
    res.json({ success: true, message: 'Donor registered successfully' });
  } catch (error) {
    console.error('Donor registration error:', error.message);
    if (connection) await connection.end().catch(() => {});
    res.status(500).json({ success: false, message: error.message });
  }
});

// Register hospital
app.post('/api/register/hospital', async (req, res) => {
  let connection;
  try {
    const {
      hospitalName,
      location,
      email,
      phone,
      password,
      registrationNumber,
      licenseNumber,
      licenseYear,
      hospitalAddress,
      bloodBankManager,
      managerPhone,
      hospitalType
    } = req.body;

    // Validate required fields
    if (!hospitalName || !email || !phone || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Hospital name, email, phone, and password are required'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    connection = await getConnection();
    const [userResult] = await connection.execute(
      'INSERT INTO users (full_name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
      [hospitalName, email, phone, hashedPassword, 'hospital']
    );

    await connection.execute(
      'INSERT INTO hospitals (hospital_id, hospital_name, location, license_number, registration_number, registration_date, hospital_address, contact_person) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userResult.insertId, hospitalName, location || null, licenseNumber || null, registrationNumber || null, `${licenseYear || 2026}-01-01`, hospitalAddress || null, bloodBankManager || null]
    );

    await connection.end();
    res.json({ success: true, message: 'Hospital registered successfully. Please complete KYC verification.' });
  } catch (error) {
    console.error('Hospital registration error:', error.message);
    if (connection) await connection.end().catch(() => {});
    res.status(500).json({ success: false, message: error.message });
  }
});

// Donor Login
app.post('/api/login/donor', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const connection = await getConnection();
    
    // Check if identifier is phone or email
    const [users] = await connection.execute(
      'SELECT * FROM users WHERE (email = ? OR phone = ?) AND role = "donor"',
      [identifier, identifier]
    );

    if (users.length === 0) {
      await connection.end();
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      await connection.end();
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    req.session.userId = user.user_id;
    req.session.role = user.role;
    req.session.name = user.name;

    await connection.end();
    res.json({ success: true, role: user.role, redirect: '/donor-dashboard' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Hospital Login
app.post('/api/login/hospital', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const connection = await getConnection();
    
    // Check if identifier is email or registration_number
    const [users] = await connection.execute(`
      SELECT u.* FROM users u 
      JOIN hospitals h ON u.user_id = h.hospital_id 
      WHERE (u.email = ? OR h.registration_number = ?) AND u.role = "hospital"
    `, [identifier, identifier]);

    if (users.length === 0) {
      await connection.end();
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      await connection.end();
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    req.session.userId = user.user_id;
    req.session.role = user.role;
    req.session.name = user.name;

    await connection.end();
    res.json({ success: true, role: user.role, redirect: '/hospital-dashboard' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Get blood requests for donors
app.get('/api/requests', requireAuth, async (req, res) => {
  try {
    const connection = await getConnection();
    const [requests] = await connection.execute(`
      SELECT br.*, h.hospital_name, h.location, u.phone
      FROM blood_requests br
      JOIN hospitals h ON br.hospital_id = h.hospital_id
      JOIN users u ON h.hospital_id = u.user_id
      WHERE br.status = 'active'
      ORDER BY 
        CASE br.urgency_level 
          WHEN 'critical' THEN 1 
          WHEN 'urgent' THEN 2 
          WHEN 'routine' THEN 3 
        END, br.request_date DESC
    `);
    await connection.end();
    res.json(requests);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Post blood request (hospitals only)
app.post('/api/requests', requireAuth, requireRole('hospital'), async (req, res) => {
  try {
    const { bloodType, unitsNeeded, urgencyLevel, notes } = req.body;
    const hospitalId = req.session.userId;

    const connection = await getConnection();
    await connection.execute(
      'INSERT INTO blood_requests (hospital_id, blood_type, units_needed, urgency_level, notes) VALUES (?, ?, ?, ?, ?)',
      [hospitalId, bloodType, unitsNeeded, urgencyLevel, notes]
    );
    await connection.end();
    res.json({ success: true, message: 'Request posted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Respond to request
app.post('/api/requests/:id/respond', requireAuth, requireRole('donor'), async (req, res) => {
  try {
    const requestId = req.params.id;
    const donorId = req.session.userId;

    const connection = await getConnection();
    await connection.execute(
      'INSERT INTO donations (donor_id, hospital_id, request_id) SELECT ?, br.hospital_id, ? FROM blood_requests br WHERE br.request_id = ?',
      [donorId, requestId, requestId]
    );
    await connection.end();
    res.json({ success: true, message: 'Response sent successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user profile
app.get('/api/profile', requireAuth, async (req, res) => {
  try {
    const connection = await getConnection();
    const [users] = await connection.execute('SELECT * FROM users WHERE user_id = ?', [req.session.userId]);
    const user = users[0];

    let profile = { ...user };
    delete profile.password;

    if (user.role === 'donor') {
      const [donors] = await connection.execute('SELECT * FROM donors WHERE donor_id = ?', [user.user_id]);
      profile = { ...profile, ...donors[0] };
    } else if (user.role === 'hospital') {
      const [hospitals] = await connection.execute('SELECT * FROM hospitals WHERE hospital_id = ?', [user.user_id]);
      profile = { ...profile, ...hospitals[0] };
    }

    await connection.end();
    res.json(profile);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Hospital KYC Verification endpoints
app.post('/api/hospital/kyc/submit', requireAuth, requireRole('hospital'), async (req, res) => {
  try {
    const connection = await getConnection();
    const hospitalId = req.session.userId;

    const {
      licenseNumber,
      registrationNumber,
      registrationDate,
      issuingAuthority,
      hospitalAddress,
      contactPerson
    } = req.body;

    // Update hospital with KYC information
    await connection.execute(
      `UPDATE hospitals SET
        license_number = ?,
        registration_number = ?,
        registration_date = ?,
        issuing_authority = ?,
        hospital_address = ?,
        contact_person = ?,
        verification_status = 'pending',
        kyc_submitted_at = CURRENT_TIMESTAMP
       WHERE hospital_id = ?`,
      [licenseNumber, registrationNumber, registrationDate, issuingAuthority, hospitalAddress, contactPerson, hospitalId]
    );

    await connection.end();
    res.json({ success: true, message: 'KYC documents submitted for review' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Get hospitals for KYC verification
app.get('/api/admin/hospitals/kyc', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const connection = await getConnection();
    const [hospitals] = await connection.execute(`
      SELECT h.*, u.name, u.email, u.phone
      FROM hospitals h
      JOIN users u ON h.hospital_id = u.user_id
      WHERE h.verification_status = 'pending' AND h.kyc_submitted_at IS NOT NULL
      ORDER BY h.kyc_submitted_at DESC
    `);
    await connection.end();
    res.json(hospitals);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Review hospital KYC
app.post('/api/admin/hospitals/:id/kyc-review', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const hospitalId = req.params.id;
    const { status, notes } = req.body;
    const adminId = req.session.userId;

    const connection = await getConnection();
    await connection.execute(
      'UPDATE hospitals SET verification_status = ?, kyc_reviewed_at = CURRENT_TIMESTAMP, kyc_reviewer_id = ? WHERE hospital_id = ?',
      [status, adminId, hospitalId]
    );

    // Create notification for hospital
    const statusMessage = status === 'verified' ? 'Your hospital has been verified and you can now post blood requests.' : 'Your hospital verification was rejected. Please contact support.';
    await connection.execute(
      'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
      [hospitalId, statusMessage, 'system']
    );

    await connection.end();
    res.json({ success: true, message: `Hospital ${status} successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get hospital statistics
app.get('/api/hospital/stats', requireAuth, requireRole('hospital'), async (req, res) => {
  try {
    const hospitalId = req.session.userId;
    const connection = await getConnection();
    
    // Get active requests count
    const [activeRequests] = await connection.execute(
      'SELECT COUNT(*) as count FROM blood_requests WHERE hospital_id = ? AND status = "active"',
      [hospitalId]
    );
    
    // Get fulfilled requests this week
    const [fulfilledThisWeek] = await connection.execute(
      'SELECT COUNT(*) as count FROM blood_requests WHERE hospital_id = ? AND status = "fulfilled" AND request_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)',
      [hospitalId]
    );
    
    // Get verified donors count (mock for now)
    const verifiedDonors = 247; // Would be calculated from donors table
    
    // Get average response time (mock for now)
    const avgResponseTime = '2.4 hrs'; // Would be calculated from donations table
    
    await connection.end();
    
    res.json({
      activeRequests: activeRequests[0].count,
      fulfilledThisWeek: fulfilledThisWeek[0].count,
      verifiedDonors: verifiedDonors,
      avgResponseTime: avgResponseTime
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// KYC Verification endpoints
app.post('/api/kyc/submit', requireAuth, requireRole('donor'), async (req, res) => {
  try {
    const connection = await getConnection();
    const userId = req.session.userId;

    // Update donor with KYC pending status
    await connection.execute(
      'UPDATE donors SET kyc_pending = TRUE WHERE donor_id = ?',
      [userId]
    );

    await connection.end();
    res.json({ success: true, message: 'KYC documents submitted for review' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Wallet endpoints
app.get('/api/wallet', requireAuth, requireRole('donor'), async (req, res) => {
  try {
    const connection = await getConnection();
    const userId = req.session.userId;

    // Mock wallet data - in real implementation, this would come from database
    const walletData = {
      transport_balance: 15000, // XAF
      pharmacy_vouchers: 2,
      lab_vouchers: 1,
      total_rewards: 8,
      vouchers: [
        {
          id: 'voucher_1',
          title: 'Pharmacy Discount',
          value: '20% OFF',
          description: 'Valid at participating pharmacies',
          expiry_date: '2025-12-31'
        },
        {
          id: 'voucher_2',
          title: 'Lab Test Voucher',
          value: 'Free CBC Test',
          description: 'Complete blood count test',
          expiry_date: '2025-11-30'
        }
      ],
      transport_history: [
        {
          hospital_name: 'Central Hospital',
          date: '2025-01-15',
          donation_type: 'Emergency Surgery',
          amount: 5000
        },
        {
          hospital_name: 'Clinic Espoir',
          date: '2024-12-20',
          donation_type: 'Blood Bank',
          amount: 5000
        }
      ],
      rewards_history: [
        {
          reward_type: 'Transport Incentive',
          date: '2025-01-15',
          description: 'Emergency donation',
          value: '+5000 XAF'
        },
        {
          reward_type: 'Pharmacy Voucher',
          date: '2025-01-15',
          description: 'Donation reward',
          value: '20% OFF'
        }
      ]
    };

    await connection.end();
    res.json(walletData);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Donation check-in endpoint
app.post('/api/donations/checkin', requireAuth, requireRole('donor'), async (req, res) => {
  try {
    const connection = await getConnection();
    const userId = req.session.userId;
    const { hospital_id, donation_id } = req.body;

    // Record the check-in and add incentives
    // In real implementation, this would update donation status and add wallet credits

    await connection.end();
    res.json({ success: true, message: 'Check-in recorded and incentives added' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update profile endpoint to include KYC status
app.get('/api/profile', requireAuth, async (req, res) => {
  try {
    const connection = await getConnection();
    const userId = req.session.userId;

    const [userRows] = await connection.execute(
      'SELECT u.name, u.email, u.phone, u.role, d.blood_group, d.kyc_verified, d.kyc_pending FROM users u LEFT JOIN donors d ON u.user_id = d.donor_id WHERE u.user_id = ?',
      [userId]
    );

    if (userRows.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRows[0];
    await connection.end();

    res.json({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      blood_type: user.blood_group,
      kyc_verified: user.kyc_verified || false,
      kyc_pending: user.kyc_pending || false
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify account
app.post('/api/verify', async (req, res) => {
  try {
    const { code } = req.body;
    // In a real app, verify the code against stored code
    // For demo, accept any 6-digit code
    if (code && code.length === 6 && /^\d{6}$/.test(code)) {
      res.json({ success: true, message: 'Account verified successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid verification code' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// OTP Routes
app.use('/api', otpRoutes);

// KYC Routes
app.use('/api', kycRoutes);

// QR Verification Routes
app.use('/api/qr', qrVerificationRoutes);

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║         LifeLink Server running : http://localhost:${PORT}
          Environment: ${process.env.NODE_ENV || 'development'}         ║
╚════════════════════════════════════════════════════════════╝

🔐 OTP Routes:
  POST /api/auth/register       - Start registration, get OTP
  POST /api/auth/verify-otp     - Verify OTP code
  POST /api/auth/resend-otp     - Resend OTP code

✅ KYC Routes:
  GET  /api/profile             - Get user KYC status
  POST /api/kyc/submit          - Submit KYC for verification (file upload)
  GET  /api/kyc/requests        - Get pending KYC requests (admin)
  POST /api/kyc/approve         - Approve KYC (admin)
  POST /api/kyc/reject          - Reject KYC (admin)
  GET  /api/kyc/status/:phone   - Check KYC status

🔐 QR Verification Routes (Donation Confirmation):
  POST /api/qr/generate-qr      - Hospital generates QR code for donation
  POST /api/qr/scan-qr          - Donor scans QR code
  POST /api/qr/verify-donation  - Confirm donation completion
  POST /api/qr/issue-reward     - Hospital issues reward to donor
  GET  /api/qr/qr-status/:id    - Check QR code status

`);
});
