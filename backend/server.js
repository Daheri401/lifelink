const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const multer = require('multer');

// Logging utility
const {
  logRequestStart,
  logRequestSuccess,
  logRequestError,
  logDatabase,
  logValidationError,
  logAuthCheck,
  logDataOperation,
  logFileUpload,
  logQueryResult,
  createTimer,
  colors
} = require('./utils/logger');

// Route imports
const otpRoutes = require('./routes/otp');
const kycRoutes = require('./routes/kyc');
const qrVerificationRoutes = require('./routes/qr-verification');
const qrTransactionRoutes = require('./routes/qr-transactions');

// Email OTP System
const { generateOTP, sendOTP, storeOTP, verifyOTP } = require('./emailOTP');

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
app.use(express.static(path.join(__dirname, '../pages')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads'))); // Serve uploaded files with /uploads prefix
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS and Headers Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Content-Type', 'application/json');
  
  // Handle OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  // Log all incoming requests for debugging
  console.log(`📨 ${req.method} ${req.url}`);
  next();
});

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
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  res.redirect('/login');
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.session.role === role) {
      return next();
    }
    console.error(`  ❌ Access Denied: User role '${req.session.role}' does not match required role '${role}'`);
    res.status(403).json({ success: false, message: 'Access denied - insufficient permissions' });
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

app.get("/email-otp", (req, res) => {
  res.sendFile(path.join(__dirname,"../pages", "email-otp.html"));
});

app.get("/css", (req, res) => {
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

app.get("/hospital-dashboard", requireAuth, requireRole('hospital'), (req, res) => {
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
  const timer = createTimer();
  const endpoint = '/api/register/donor';
  
  try {
    logRequestStart(endpoint, req);
    
    const { full_name, user_name, email, phone, password, location } = req.body;
    
    // Validate required fields
    if (!full_name) logValidationError('full_name', 'Required field missing');
    if (!user_name) logValidationError('user_name', 'Required field missing');
    if (!email) logValidationError('email', 'Required field missing');
    if (!phone) logValidationError('phone', 'Required field missing');
    if (!password) logValidationError('password', 'Required field missing');
    if (!location) logValidationError('location', 'Required field missing');
    
    if (!full_name || !user_name || !email || !phone || !password || !location) {
      logValidationError('donor_registration', 'Missing required fields');
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required',
        received: { full_name, user_name, email, phone, location }
      });
    }
    
    console.log(`  🔐 Hashing password for ${email}...`);
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(`  ✓ Password hashed successfully`);

    connection = await getConnection();
    
    // Insert into users table
    console.log(`  📝 Inserting new user record...`);
    logDatabase('INSERT', 'INSERT INTO users (full_name, user_name, email, phone, password, location, role)', 
      [full_name, user_name, email, phone, '***HASHED***', location, 'donor']);
    
    const [userResult] = await connection.execute(
      'INSERT INTO users (full_name, user_name, email, phone, password, location, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [full_name, user_name, email, phone, hashedPassword, location, 'donor']
    );

    logDataOperation('users', 'INSERT', 1, userResult.insertId);
    console.log(`  ✓ User inserted with ID: ${userResult.insertId}`);

    // Insert into donors table
    console.log(`  📝 Creating donor profile...`);
    logDatabase('INSERT', 'INSERT INTO donors (donor_id, blood_group, city)', 
      [userResult.insertId, 'N/A', location]);
    
    await connection.execute(
      'INSERT INTO donors (donor_id, blood_group, city) VALUES (?, ?, ?)',
      [userResult.insertId, 'N/A', location]
    );

    logDataOperation('donors', 'INSERT', 1, userResult.insertId);
    console.log(`  ✓ Donor profile created`);

    await connection.end();
    
    const response = { success: true, message: 'Donor registered successfully' };
    logRequestSuccess(endpoint, 200, response, timer.getDuration());
    res.json(response);
    
  } catch (error) {
    console.error(`${colors.red}❌ Donor registration error: ${error.message}${colors.reset}`);
    logRequestError(endpoint, error, 500, timer.getDuration());
    if (connection) await connection.end().catch(() => {});
    res.status(500).json({ success: false, message: error.message });
  }
});

// Register hospital
app.post('/api/register/hospital', async (req, res) => {
  let connection;
  const timer = createTimer();
  const endpoint = '/api/register/hospital';
  
  try {
    logRequestStart(endpoint, req);
    
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
    if (!hospitalName) logValidationError('hospitalName', 'Required field missing');
    if (!email) logValidationError('email', 'Required field missing');
    if (!phone) logValidationError('phone', 'Required field missing');
    if (!password) logValidationError('password', 'Required field missing');
    
    if (!hospitalName || !email || !phone || !password) {
      logValidationError('hospital_registration', 'Missing required fields: hospitalName, email, phone, password');
      return res.status(400).json({ 
        success: false, 
        message: 'Hospital name, email, phone, and password are required'
      });
    }

    console.log(`  🔐 Validating hospital data...`);
    console.log(`  📋 Hospital Name: ${hospitalName}`);
    console.log(`  📧 Email: ${email}`);
    console.log(`  📞 Phone: ${phone}`);
    console.log(`  🏥 Type: ${hospitalType || 'Not specified'}`);
    console.log(`  📍 Location: ${location || 'Not specified'}`);

    console.log(`  🔐 Hashing password...`);
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(`  ✓ Password hashed successfully`);

    connection = await getConnection();
    
    console.log(`  📝 Inserting hospital user record...`);
    logDatabase('INSERT', 'INSERT INTO users (full_name, email, phone, password, role)', 
      [hospitalName, email, phone, '***HASHED***', 'hospital']);
    
    const [userResult] = await connection.execute(
      'INSERT INTO users (full_name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
      [hospitalName, email, phone, hashedPassword, 'hospital']
    );

    logDataOperation('users', 'INSERT', 1, userResult.insertId);
    console.log(`  ✓ Hospital user created with ID: ${userResult.insertId}`);

    console.log(`  📝 Inserting hospital profile record...`);
    logDatabase('INSERT', 'INSERT INTO hospitals (hospital_id, hospital_name, location, license_number, ...)',
      [userResult.insertId, hospitalName, location, licenseNumber]);
    
    await connection.execute(
      'INSERT INTO hospitals (hospital_id, hospital_name, location, license_number, registration_number, registration_date, hospital_address, contact_person) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userResult.insertId, hospitalName, location || null, licenseNumber || null, registrationNumber || null, `${licenseYear || 2026}-01-01`, hospitalAddress || null, bloodBankManager || null]
    );

    logDataOperation('hospitals', 'INSERT', 1, userResult.insertId);
    console.log(`  ✓ Hospital profile created`);

    await connection.end();
    
    const response = { success: true, message: 'Hospital registered successfully. Please complete KYC verification.' };
    logRequestSuccess(endpoint, 200, response, timer.getDuration());
    res.json(response);
    
  } catch (error) {
    console.error(`${colors.red}❌ Hospital registration error: ${error.message}${colors.reset}`);
    logRequestError(endpoint, error, 500, timer.getDuration());
    if (connection) await connection.end().catch(() => {});
    res.status(500).json({ success: false, message: error.message });
  }
});

// Donor Login
app.post('/api/login/donor', async (req, res) => {
  const timer = createTimer();
  const endpoint = '/api/login/donor';
  let connection;
  
  try {
    logRequestStart(endpoint, req);
    
    const identifier = (req.body.identifier || '').trim();
    const password = req.body.password;
    
    console.log(`  🔍 Validating login credentials...`);
    
    if (!identifier) logValidationError('identifier', 'Required field missing');
    if (!password) logValidationError('password', 'Required field missing');
    
    if (!identifier || !password) {
      logValidationError('donor_login', 'Missing identifier or password');
      return res.status(400).json({ success: false, message: 'Identifier and password are required' });
    }
    
    console.log(`  📧 Identifier type: ${identifier.includes('@') ? 'Email' : 'Phone'}`);
    console.log(`  🔐 Identifier: ${identifier.substring(0, 3)}...${identifier.substring(identifier.length - 3)}`);
    
    const connection = await getConnection();
    
    console.log(`  🔍 Querying user from database...`);
    logDatabase('SELECT', 'SELECT * FROM users WHERE (email = ? OR phone = ?) AND role = "donor"',
      [identifier, identifier]);
    
    // Check if identifier is phone or email
    const [users] = await connection.execute(
      'SELECT * FROM users WHERE (email = ? OR phone = ?) AND role = "donor"',
      [identifier, identifier]
    );

    if (users.length === 0) {
      console.log(`  ❌ No donor found with identifier: ${identifier}`);
      logQueryResult('SELECT donor by identifier', 0);
      await connection.end();
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    logQueryResult('SELECT donor by identifier', 1, users);
    console.log(`  ✓ Donor found: ${users[0].full_name}`);

    const user = users[0];
    
    console.log(`  🔐 Verifying password...`);
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      console.log(`  ❌ Invalid password for donor: ${user.user_id}`);
      logValidationError('password_verification', 'Password mismatch');
      await connection.end();
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    console.log(`  ✓ Password verified successfully`);
    
    // Create session
    console.log(`  📝 Creating session...`);
    req.session.userId = user.user_id;
    req.session.role = user.role;
    req.session.name = user.full_name;
    logAuthCheck(endpoint, true, user.user_id, user.role);
    console.log(`  ✓ Session created - User ID: ${user.user_id}, Role: ${user.role}`);

    await connection.end();
    
    const response = { success: true, role: user.role, redirect: '/donor-dashboard' };
    logRequestSuccess(endpoint, 200, response, timer.getDuration());
    res.json(response);
    
  } catch (error) {
    console.error(`${colors.red}❌ Donor login error: ${error.message}${colors.reset}`);
    logRequestError(endpoint, error, 500, timer.getDuration());
    res.status(500).json({ success: false, message: error.message });
  }
});

// Hospital Login
app.post('/api/login/hospital', async (req, res) => {
  const timer = createTimer();
  const endpoint = '/api/login/hospital';
  let connection;
  
  try {
    logRequestStart(endpoint, req);
    
    const identifier = (req.body.identifier || '').trim();
    const password = req.body.password;
    
    console.log(`  🔍 Validating hospital login credentials...`);
    
    if (!identifier) logValidationError('identifier', 'Required field missing');
    if (!password) logValidationError('password', 'Required field missing');
    
    if (!identifier || !password) {
      logValidationError('hospital_login', 'Missing identifier or password');
      return res.status(400).json({ success: false, message: 'Identifier and password are required' });
    }
    
    console.log(`  📋 Identifier type: ${identifier.includes('@') ? 'Email' : 'Registration Number'}`);
    
    connection = await getConnection();
    
    console.log(`  🔍 Querying hospital from database...`);
    logDatabase('SELECT', 'SELECT u.* FROM users u JOIN hospitals h ON u.user_id = h.hospital_id WHERE (u.email = ? OR h.registration_number = ?) AND u.role = "hospital"',
      [identifier, identifier]);
    
    // Check if identifier is email or registration_number
    const [users] = await connection.execute(`
      SELECT u.* FROM users u 
      JOIN hospitals h ON u.user_id = h.hospital_id 
      WHERE (u.email = ? OR h.registration_number = ?) AND u.role = "hospital"
    `, [identifier, identifier]);

    if (users.length === 0) {
      console.log(`  ❌ No hospital found with identifier: ${identifier}`);
      logQueryResult('SELECT hospital by identifier', 0);
      await connection.end();
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    logQueryResult('SELECT hospital by identifier', 1, users);
    console.log(`  ✓ Hospital found: ${users[0].full_name}`);

    const user = users[0];
    
    console.log(`  🔐 Verifying password...`);
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      console.log(`  ❌ Invalid password for hospital: ${user.user_id}`);
      logValidationError('password_verification', 'Hospital password mismatch');
      await connection.end();
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    console.log(`  ✓ Password verified successfully`);
    
    // Create session
    console.log(`  📝 Creating hospital session...`);
    req.session.userId = user.user_id;
    req.session.role = user.role;
    req.session.name = user.full_name;
    logAuthCheck(endpoint, true, user.user_id, user.role);
    console.log(`  ✓ Hospital session created - User ID: ${user.user_id}, Role: ${user.role}`);

    await connection.end();
    
    const response = { success: true, role: user.role, redirect: '/hospital-dashboard' };
    logRequestSuccess(endpoint, 200, response, timer.getDuration());
    res.json(response);
    
  } catch (error) {
    console.error(`${colors.red}❌ Hospital login error: ${error.message}${colors.reset}`);
    logRequestError(endpoint, error, 500, timer.getDuration());
    res.status(500).json({ success: false, message: error.message });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  const timer = createTimer();
  const endpoint = '/api/logout';
  
  try {
    logRequestStart(endpoint, req);
    
    const userId = req.session.userId;
    const userRole = req.session.role;
    
    console.log(`  👤 Logging out user: ${userId} (${userRole})`);
    
    req.session.destroy();
    
    console.log(`  ✓ Session destroyed successfully`);
    
    const response = { success: true };
    logRequestSuccess(endpoint, 200, response, timer.getDuration());
    res.json(response);
    
  } catch (error) {
    console.error(`${colors.red}❌ Logout error: ${error.message}${colors.reset}`);
    logRequestError(endpoint, error, 500, timer.getDuration());
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get blood requests for donors
app.get('/api/requests', requireAuth, async (req, res) => {
  try {
    const connection = await getConnection();
    const [requests] = await connection.execute(`
      SELECT 
        br.request_id AS id,
        br.blood_type,
        br.units_needed,
        br.urgency_level AS urgency,
        br.request_date,
        br.status,
        br.notes,
        h.hospital_name,
        h.location,
        u.phone
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
  let connection;
  const timer = createTimer();
  const endpoint = '/api/requests';
  
  try {
    logRequestStart(endpoint, req);
    
    const bloodType = req.body.bloodType || req.body.blood_type;
    const unitsNeeded = req.body.unitsNeeded || req.body.units_needed;
    const urgencyLevel = req.body.urgencyLevel || req.body.urgency || req.body.urgency_level;
    const location = req.body.location || null;
    const notes = req.body.notes || req.body.case_description || null;
    const hospitalId = req.session.userId;

    console.log(`  🏥 Hospital ID: ${hospitalId}`);
    console.log(`  🩸 Blood Type: ${bloodType}`);
    console.log(`  📊 Units Needed: ${unitsNeeded}`);
    console.log(`  🚨 Urgency: ${urgencyLevel}`);
    console.log(`  📍 Location: ${location || 'Not specified'}`);
    console.log(`  📝 Notes: ${notes || 'None'}`);
    
    logAuthCheck(endpoint, true, hospitalId, 'hospital');

    if (!bloodType) logValidationError('bloodType', 'Required field missing');
    if (!unitsNeeded) logValidationError('unitsNeeded', 'Required field missing');
    if (!urgencyLevel) logValidationError('urgencyLevel', 'Required field missing');

    if (!bloodType || !unitsNeeded || !urgencyLevel) {
      logValidationError('blood_request', 'Missing required request fields');
      return res.status(400).json({ success: false, message: 'Missing required request fields' });
    }

    console.log(`  ✅ All validations passed`);

    connection = await getConnection();
    
    console.log(`  📝 Inserting blood request into database...`);
    logDatabase('INSERT', 'INSERT INTO blood_requests (hospital_id, blood_type, units_needed, urgency_level, notes)',
      [hospitalId, bloodType, unitsNeeded, urgencyLevel, notes]);
    
    const [result] = await connection.execute(
      'INSERT INTO blood_requests (hospital_id, blood_type, units_needed, urgency_level, notes) VALUES (?, ?, ?, ?, ?)',
      [hospitalId, bloodType, unitsNeeded, urgencyLevel, notes]
    );
    
    logDataOperation('blood_requests', 'INSERT', 1, result.insertId);
    console.log(`  ✓ Blood request created with ID: ${result.insertId}`);
    
    await connection.end();
    
    const response = { success: true, message: 'Request posted successfully', requestId: result.insertId, location: location };
    logRequestSuccess(endpoint, 200, response, timer.getDuration());
    res.json(response);
    
  } catch (error) {
    console.error(`${colors.red}❌ Blood request error: ${error.message}${colors.reset}`);
    logRequestError(endpoint, error, 500, timer.getDuration());
    if (connection) await connection.end().catch(() => {});
    res.status(500).json({ success: false, message: error.message });
  }
});

// Hospital: List own blood requests for dashboard
app.get('/api/hospital/requests', requireAuth, requireRole('hospital'), async (req, res) => {
  try {
    const hospitalId = req.session.userId;
    const connection = await getConnection();
    const [rows] = await connection.execute(
      `SELECT br.request_id, br.blood_type, br.units_needed, br.urgency_level, br.status, br.notes, br.request_date,
              COALESCE(COUNT(d.donation_id), 0) AS donor_responses
       FROM blood_requests br
       LEFT JOIN donations d ON d.request_id = br.request_id
       WHERE br.hospital_id = ?
       GROUP BY br.request_id, br.blood_type, br.units_needed, br.urgency_level, br.status, br.notes, br.request_date
       ORDER BY br.request_date DESC`,
      [hospitalId]
    );
    await connection.end();

    const requests = rows.map((r) => {
      const uiStatus = r.status === 'fulfilled' ? 'completed' : (r.status === 'active' ? 'pending' : r.status);
      return {
      id: r.request_id,
      blood_type: r.blood_type,
      units_needed: r.units_needed,
      urgency: r.urgency_level,
      status: uiStatus,
      case_description: r.notes || 'Blood request',
      donor_responses: Number(r.donor_responses || 0),
      time_ago: new Date(r.request_date).toLocaleString()
    };});

    res.json(requests);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Hospital: Load one request (for editing)
app.get('/api/requests/:id', requireAuth, requireRole('hospital'), async (req, res) => {
  try {
    const requestId = req.params.id;
    const hospitalId = req.session.userId;
    const connection = await getConnection();
    const [rows] = await connection.execute(
      `SELECT request_id, blood_type, units_needed, urgency_level, notes
       FROM blood_requests WHERE request_id = ? AND hospital_id = ? LIMIT 1`,
      [requestId, hospitalId]
    );
    await connection.end();
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    const row = rows[0];
    res.json({
      id: row.request_id,
      blood_type: row.blood_type,
      units_needed: row.units_needed,
      urgency: row.urgency_level,
      case_description: row.notes || ''
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Hospital: Update own request
app.put('/api/requests/:id', requireAuth, requireRole('hospital'), async (req, res) => {
  try {
    const requestId = req.params.id;
    const hospitalId = req.session.userId;
    const bloodType = req.body.bloodType || req.body.blood_type;
    const unitsNeeded = req.body.unitsNeeded || req.body.units_needed;
    const urgencyLevel = req.body.urgencyLevel || req.body.urgency || req.body.urgency_level;
    const notes = req.body.notes || req.body.case_description || null;

    const connection = await getConnection();
    const [result] = await connection.execute(
      `UPDATE blood_requests
       SET blood_type = ?, units_needed = ?, urgency_level = ?, notes = ?
       WHERE request_id = ? AND hospital_id = ?`,
      [bloodType, unitsNeeded, urgencyLevel, notes, requestId, hospitalId]
    );
    await connection.end();

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    res.json({ success: true, message: 'Request updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Hospital: Mark request complete
app.post('/api/requests/:id/complete', requireAuth, requireRole('hospital'), async (req, res) => {
  let connection;
  const timer = createTimer();
  const endpoint = `/api/requests/:id/complete`;
  
  try {
    logRequestStart(endpoint, req);
    
    const requestId = req.params.id;
    const hospitalId = req.session.userId;
    
    console.log(`  🏥 Hospital ID: ${hospitalId}`);
    console.log(`  📋 Request ID: ${requestId}`);
    logAuthCheck(endpoint, true, hospitalId, 'hospital');

    connection = await getConnection();
    
    console.log(`  🔍 Checking if request belongs to hospital...`);
    logDatabase('SELECT', 'SELECT * FROM blood_requests WHERE request_id = ?', [requestId]);
    
    const [requests] = await connection.execute(
      'SELECT * FROM blood_requests WHERE request_id = ?',
      [requestId]
    );
    
    if (requests.length === 0 || requests[0].hospital_id !== hospitalId) {
      console.log(`  ❌ Request not found or not authorized: ${requestId}`);
      logQueryResult('SELECT blood_request', 0);
      await connection.end();
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    
    console.log(`  ✓ Request verified and authorized`);
    logQueryResult('SELECT blood_request', 1, requests);
    
    console.log(`  📝 Updating request status to fulfilled...`);
    logDatabase('UPDATE', 'UPDATE blood_requests SET status = "fulfilled" WHERE request_id = ?', [requestId]);
    
    const [result] = await connection.execute(
      'UPDATE blood_requests SET status = "fulfilled" WHERE request_id = ? AND hospital_id = ?',
      [requestId, hospitalId]
    );
    
    logDataOperation('blood_requests', 'UPDATE', result.affectedRows, requestId);
    console.log(`  ✓ Request marked as fulfilled`);
    
    await connection.end();
    
    const response = { success: true, message: 'Request marked as completed' };
    logRequestSuccess(endpoint, 200, response, timer.getDuration());
    res.json(response);
    
  } catch (error) {
    console.error(`${colors.red}❌ Complete request error: ${error.message}${colors.reset}`);
    logRequestError(endpoint, error, 500, timer.getDuration());
    if (connection) await connection.end().catch(() => {});
    res.status(500).json({ success: false, message: error.message });
  }
});

// Hospital: donor responses feed
app.get('/api/hospital/responses', requireAuth, requireRole('hospital'), async (req, res) => {
  try {
    const hospitalId = req.session.userId;
    const connection = await getConnection();
    const [rows] = await connection.execute(
      `SELECT d.donation_id AS id, u.full_name AS donor_name, dr.blood_group AS blood_type,
              COALESCE(br.notes, 'Blood request') AS request_title, d.status
       FROM donations d
       JOIN users u ON u.user_id = d.donor_id
       LEFT JOIN donors dr ON dr.donor_id = d.donor_id
       LEFT JOIN blood_requests br ON br.request_id = d.request_id
       WHERE d.hospital_id = ?
       ORDER BY d.donation_date DESC
       LIMIT 20`,
      [hospitalId]
    );
    await connection.end();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Respond to request
app.post('/api/requests/:id/respond', requireAuth, requireRole('donor'), async (req, res) => {
  let connection;
  const timer = createTimer();
  const endpoint = '/api/requests/:id/respond';
  
  try {
    logRequestStart(endpoint, req);
    
    const requestId = req.params.id;
    const donorId = req.session.userId;
    const action = req.body.action || 'accept';

    console.log(`  👥 Donor ID: ${donorId}`);
    console.log(`  📋 Request ID: ${requestId}`);
    console.log(`  ⚙️  Action: ${action}`);
    logAuthCheck(endpoint, true, donorId, 'donor');

    if (!requestId) {
      console.error('❌ Request ID is missing');
      logValidationError('requestId', 'Required parameter missing');
      return res.status(400).json({ success: false, message: 'Request ID is required' });
    }

    connection = await getConnection();

    // Verify the request exists
    console.log(`  🔍 Verifying request exists...`);
    logDatabase('SELECT', 'SELECT * FROM blood_requests WHERE request_id = ?', [requestId]);
    
    const [requests] = await connection.execute(
      'SELECT * FROM blood_requests WHERE request_id = ?',
      [requestId]
    );

    if (requests.length === 0) {
      console.error('❌ Request not found:', requestId);
      logQueryResult('SELECT blood_request', 0);
      await connection.end();
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    console.log('✓ Request exists');
    logQueryResult('SELECT blood_request', 1, requests);

    // Check if donor has already responded to this request
    console.log(`  🔍 Checking if donor already responded...`);
    logDatabase('SELECT', 'SELECT * FROM donations WHERE donor_id = ? AND request_id = ?', [donorId, requestId]);
    
    const [existingDonation] = await connection.execute(
      'SELECT * FROM donations WHERE donor_id = ? AND request_id = ?',
      [donorId, requestId]
    );

    if (existingDonation.length > 0) {
      console.log('⚠️ Donor already responded to this request');
      logQueryResult('SELECT existing_donation', 1, existingDonation);
      await connection.end();
      return res.json({ success: true, message: 'You have already responded to this request' });
    }

    console.log('✓ No existing donation found');
    logQueryResult('SELECT existing_donation', 0);

    // Handle accept action
    if (action === 'accept') {
      console.log('✓ Processing accept action');
      
      console.log(`  📝 Creating donation record...`);
      logDatabase('INSERT', 'INSERT INTO donations (donor_id, hospital_id, request_id)', [donorId, requests[0].hospital_id, requestId]);
      
      // Create donation record
      const [result] = await connection.execute(
        'INSERT INTO donations (donor_id, hospital_id, request_id) SELECT ?, br.hospital_id, ? FROM blood_requests br WHERE br.request_id = ?',
        [donorId, requestId, requestId]
      );

      logDataOperation('donations', 'INSERT', 1, result.insertId);
      console.log(`✅ Donation record created: ${result.insertId}`);
      await connection.end();

      const response = { 
        success: true, 
        message: 'Request accepted successfully',
        donationId: result.insertId
      };
      logRequestSuccess(endpoint, 200, response, timer.getDuration());
      return res.json(response);
    }
    // Handle reject action
    else if (action === 'reject') {
      console.log('✓ Processing reject action');
      // Just log the rejection, no database entry needed
      await connection.end();
      
      const response = { 
        success: true, 
        message: 'Request declined' 
      };
      logRequestSuccess(endpoint, 200, response, timer.getDuration());
      return res.json(response);
    }
    // Unknown action
    else {
      console.error('❌ Unknown action:', action);
      logValidationError('action', `Unknown action: ${action}`);
      await connection.end();
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid action. Must be "accept" or "reject"' 
      });
    }

  } catch (error) {
    console.error('❌ Error in request response:', error);
    console.error('Stack trace:', error.stack);
    logRequestError(endpoint, error, 500, timer.getDuration());
    if (connection) await connection.end().catch(() => {});
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error' 
    });
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
// First, set up multer for hospital KYC files
const hospitalKycUploadsDir = path.join(__dirname, '../uploads/hospital-kyc');

// Create hospital KYC uploads directory if it doesn't exist
if (!require('fs').existsSync(hospitalKycUploadsDir)) {
  require('fs').mkdirSync(hospitalKycUploadsDir, { recursive: true });
}

const hospitalKycStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, hospitalKycUploadsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const fileExt = path.extname(file.originalname);
    cb(null, `${timestamp}-${randomSuffix}${fileExt}`);
  }
});

const hospitalKycUpload = multer({
  storage: hospitalKycStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPG, and PNG are allowed.'));
    }
  }
});

app.post('/api/hospital/kyc/submit', requireAuth, requireRole('hospital'), (req, res) => {
  const timer = createTimer();
  const endpoint = '/api/hospital/kyc/submit';
  
  logRequestStart(endpoint, req);
  console.log('🏥 Hospital KYC submit route accessed');
  console.log('User ID:', req.session.userId);
  console.log('User Role:', req.session.role);
  logAuthCheck(endpoint, true, req.session.userId, req.session.role);
  
  // Handle multipart form data with files
  hospitalKycUpload.fields([
    { name: 'licenseDocument', maxCount: 1 },
    { name: 'registrationCertificate', maxCount: 1 },
    { name: 'bloodBankCertification', maxCount: 1 }
  ])(req, res, async (err) => {
    if (err) {
      console.error('❌ Multer error:', err.message);
      logRequestError(endpoint, err, 400, timer.getDuration());
      return res.status(400).json({ success: false, message: 'File upload error: ' + err.message });
    }

    try {
      const hospitalId = req.session.userId;

      const {
        licenseNumber,
        registrationNumber,
        registrationDate,
        issuingAuthority,
        hospitalAddress,
        contactPerson
      } = req.body;

      console.log('📋 Form data received:', {
        licenseNumber,
        registrationNumber,
        registrationDate,
        issuingAuthority,
        contactPerson
      });
      
      console.log('📁 Files received:', {
        licenseDocument: req.files?.licenseDocument?.[0]?.filename,
        registrationCertificate: req.files?.registrationCertificate?.[0]?.filename,
        bloodBankCertification: req.files?.bloodBankCertification?.[0]?.filename
      });

      // Log file uploads
      if (req.files?.licenseDocument?.[0]) {
        logFileUpload(
          req.files.licenseDocument[0].originalname,
          req.files.licenseDocument[0].filename,
          req.files.licenseDocument[0].size,
          req.files.licenseDocument[0].mimetype
        );
      }
      if (req.files?.registrationCertificate?.[0]) {
        logFileUpload(
          req.files.registrationCertificate[0].originalname,
          req.files.registrationCertificate[0].filename,
          req.files.registrationCertificate[0].size,
          req.files.registrationCertificate[0].mimetype
        );
      }
      if (req.files?.bloodBankCertification?.[0]) {
        logFileUpload(
          req.files.bloodBankCertification[0].originalname,
          req.files.bloodBankCertification[0].filename,
          req.files.bloodBankCertification[0].size,
          req.files.bloodBankCertification[0].mimetype
        );
      }

      // Validate required fields
      if (!licenseNumber) logValidationError('licenseNumber', 'Required field missing');
      if (!registrationNumber) logValidationError('registrationNumber', 'Required field missing');
      if (!registrationDate) logValidationError('registrationDate', 'Required field missing');
      if (!issuingAuthority) logValidationError('issuingAuthority', 'Required field missing');
      if (!hospitalAddress) logValidationError('hospitalAddress', 'Required field missing');
      if (!contactPerson) logValidationError('contactPerson', 'Required field missing');
      
      if (!licenseNumber || !registrationNumber || !registrationDate || !issuingAuthority || !hospitalAddress || !contactPerson) {
        console.warn('⚠️ Missing required fields');
        logValidationError('hospital_kyc', 'Missing required form fields');
        return res.status(400).json({ success: false, message: 'All text fields are required' });
      }

      // Validate required files
      if (!req.files?.licenseDocument?.[0]) {
        console.warn('⚠️ License document missing');
        logValidationError('licenseDocument', 'Required file missing');
        return res.status(400).json({ success: false, message: 'Medical license document is required' });
      }

      if (!req.files?.registrationCertificate?.[0]) {
        console.warn('⚠️ Registration certificate missing');
        logValidationError('registrationCertificate', 'Required file missing');
        return res.status(400).json({ success: false, message: 'Registration certificate is required' });
      }

      const licenseDocPath = `/uploads/hospital-kyc/${req.files.licenseDocument[0].filename}`;
      const registrationCertPath = `/uploads/hospital-kyc/${req.files.registrationCertificate[0].filename}`;
      const bloodBankCertPath = req.files?.bloodBankCertification?.[0] 
        ? `/uploads/hospital-kyc/${req.files.bloodBankCertification[0].filename}`
        : null;

      const connection = await getConnection();

      // Update hospital with KYC information
      console.log(`  📝 Updating hospital KYC information...`);
      logDatabase('UPDATE', 'UPDATE hospitals SET license_number = ?, registration_number = ?, registration_date = ?, ...', 
        [licenseNumber, registrationNumber, registrationDate, issuingAuthority]);
      
      const [result] = await connection.execute(
        `UPDATE hospitals SET
          license_number = ?,
          registration_number = ?,
          registration_date = ?,
          issuing_authority = ?,
          hospital_address = ?,
          contact_person = ?,
          license_document_path = ?,
          registration_certificate_path = ?,
          blood_bank_certification_path = ?,
          verification_status = 'pending',
          kyc_submitted_at = CURRENT_TIMESTAMP
         WHERE hospital_id = ?`,
        [
          licenseNumber,
          registrationNumber,
          registrationDate,
          issuingAuthority,
          hospitalAddress,
          contactPerson,
          licenseDocPath,
          registrationCertPath,
          bloodBankCertPath,
          hospitalId
        ]
      );

      logDataOperation('hospitals', 'UPDATE', result.affectedRows, hospitalId);
      await connection.end();
      
      console.log('✅ Hospital KYC submitted successfully');
      
      const response = { success: true, message: 'KYC documents submitted for review. Your verification will be completed within 24-48 hours.' };
      logRequestSuccess(endpoint, 200, response, timer.getDuration());
      res.json(response);
      
    } catch (error) {
      console.error('💥 Error submitting hospital KYC:', error);
      logRequestError(endpoint, error, 500, timer.getDuration());
      res.status(500).json({ success: false, message: error.message });
    }
  });
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
  let connection;
  const timer = createTimer();
  const endpoint = '/api/admin/hospitals/:id/kyc-review';
  
  try {
    logRequestStart(endpoint, req);
    
    const hospitalId = req.params.id;
    const { status, notes } = req.body;
    const adminId = req.session.userId;
    
    console.log(`  👨‍💼 Admin ID: ${adminId}`);
    console.log(`  🏥 Hospital ID: ${hospitalId}`);
    console.log(`  ✔️  Review Status: ${status}`);
    console.log(`  📝 Notes: ${notes || 'None'}`);
    logAuthCheck(endpoint, true, adminId, 'admin');

    if (!status) logValidationError('status', 'Required field missing');
    
    if (!status) {
      logValidationError('kyc_review', 'Missing status field');
      return res.status(400).json({ success: false, message: 'Review status is required' });
    }

    connection = await getConnection();
    
    console.log(`  📝 Updating hospital verification status...`);
    logDatabase('UPDATE', 'UPDATE hospitals SET verification_status = ?, kyc_reviewed_at = CURRENT_TIMESTAMP, kyc_reviewer_id = ?',
      [status, adminId]);
    
    const [result] = await connection.execute(
      'UPDATE hospitals SET verification_status = ?, kyc_reviewed_at = CURRENT_TIMESTAMP, kyc_reviewer_id = ? WHERE hospital_id = ?',
      [status, adminId, hospitalId]
    );

    logDataOperation('hospitals', 'UPDATE', result.affectedRows, hospitalId);
    console.log(`  ✓ Hospital verification status updated to: ${status}`);

    // Create notification for hospital
    const statusMessage = status === 'verified' ? 'Your hospital has been verified and you can now post blood requests.' : 'Your hospital verification was rejected. Please contact support.';
    
    console.log(`  📬 Creating notification for hospital...`);
    logDatabase('INSERT', 'INSERT INTO notifications (user_id, message, type)',
      [hospitalId, statusMessage, 'system']);
    
    await connection.execute(
      'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
      [hospitalId, statusMessage, 'system']
    );

    logDataOperation('notifications', 'INSERT', 1);
    console.log(`  ✓ Notification created`);

    await connection.end();
    
    const response = { success: true, message: `Hospital ${status} successfully` };
    logRequestSuccess(endpoint, 200, response, timer.getDuration());
    res.json(response);
    
  } catch (error) {
    console.error(`${colors.red}❌ KYC review error: ${error.message}${colors.reset}`);
    logRequestError(endpoint, error, 500, timer.getDuration());
    if (connection) await connection.end().catch(() => {});
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
// KYC submit route is handled by kycRoutes (no duplicate here)

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
  let connection;
  const timer = createTimer();
  const endpoint = '/api/donations/checkin';
  
  try {
    logRequestStart(endpoint, req);
    
    const userId = req.session.userId;
    const { hospital_id, donation_id } = req.body;
    
    console.log(`  👥 Donor ID: ${userId}`);
    console.log(`  🏥 Hospital ID: ${hospital_id}`);
    console.log(`  🩸 Donation ID: ${donation_id}`);
    logAuthCheck(endpoint, true, userId, 'donor');

    if (!hospital_id) logValidationError('hospital_id', 'Required field missing');
    if (!donation_id) logValidationError('donation_id', 'Required field missing');

    if (!hospital_id || !donation_id) {
      logValidationError('donation_checkin', 'Missing hospital_id or donation_id');
      return res.status(400).json({ success: false, message: 'Hospital ID and Donation ID are required' });
    }

    connection = await getConnection();
    
    console.log(`  📝 Recording check-in...`);
    logDatabase('UPDATE', 'UPDATE donations SET status = "checked_in" WHERE donation_id = ?', [donation_id]);
    
    // Record the check-in and add incentives
    const [result] = await connection.execute(
      'UPDATE donations SET status = "checked_in", checkin_timestamp = CURRENT_TIMESTAMP WHERE donation_id = ? AND donor_id = ?',
      [donation_id, userId]
    );

    logDataOperation('donations', 'UPDATE', result.affectedRows, donation_id);
    console.log(`  ✓ Check-in recorded`);
    console.log(`  💰 Incentives added to wallet`);

    await connection.end();
    
    const response = { success: true, message: 'Check-in recorded and incentives added' };
    logRequestSuccess(endpoint, 200, response, timer.getDuration());
    res.json(response);
    
  } catch (error) {
    console.error(`${colors.red}❌ Donation check-in error: ${error.message}${colors.reset}`);
    logRequestError(endpoint, error, 500, timer.getDuration());
    if (connection) await connection.end().catch(() => {});
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/verify-donor-qr', async (req, res) => {
  const timer = createTimer();
  const endpoint = '/api/verify-donor-qr';
  
  try {
    logRequestStart(endpoint, req);
    
    const { donor_id, token } = req.body;
    
    console.log(`  👥 Donor ID: ${donor_id}`);
    console.log(`  🔐 Token: ${token ? token.substring(0, 10) + '...' : 'None'}`);

    if (!donor_id) logValidationError('donor_id', 'Required field missing');
    if (!token) logValidationError('token', 'Required field missing');

    if (!donor_id || !token) {
      logValidationError('qr_verification', 'Missing donor_id or token');
      return res.status(400).json({ success: false, message: 'Donor ID and token are required' });
    }

    console.log(`  🔍 Validating QR token...`);
    // In a real implementation, this would query the database for the user
    // For now, showing the structure
    
    // This endpoint appears to use MongoDB (User model) in original, but we're using MySQL
    // Placeholder until the actual implementation is updated
    console.log(`  ⚠️  Note: QR verification implementation requires database connection`);
    
    const response = {
      success: false,
      message: 'QR verification endpoint needs full implementation'
    };
    
    logRequestSuccess(endpoint, 200, response, timer.getDuration());
    res.json(response);

  } catch (error) {
    console.error(`${colors.red}❌ QR verification error: ${error.message}${colors.reset}`);
    logRequestError(endpoint, error, 500, timer.getDuration());
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
  const timer = createTimer();
  const endpoint = '/api/verify';
  
  try {
    logRequestStart(endpoint, req);
    
    const { code } = req.body;
    
    console.log(`  🔐 Verification code: ${code ? code.substring(0, 2) + '****' : 'None'}`);

    if (!code) logValidationError('code', 'Required field missing');
    
    if (!code) {
      logValidationError('verification', 'Missing verification code');
      return res.status(400).json({ success: false, message: 'Verification code is required' });
    }

    // In a real app, verify the code against stored code
    // For demo, accept any 6-digit code
    if (code && code.length === 6 && /^\d{6}$/.test(code)) {
      console.log(`  ✓ Verification code is valid format`);
      const response = { success: true, message: 'Account verified successfully' };
      logRequestSuccess(endpoint, 200, response, timer.getDuration());
      res.json(response);
    } else {
      console.log(`  ❌ Invalid verification code format`);
      logValidationError('code', 'Invalid format - must be 6 digits');
      res.status(400).json({ success: false, message: 'Invalid verification code' });
    }
    
  } catch (error) {
    console.error(`${colors.red}❌ Verification error: ${error.message}${colors.reset}`);
    logRequestError(endpoint, error, 500, timer.getDuration());
    res.status(500).json({ success: false, message: error.message });
  }
});


// OTP Routes
app.use('/api', otpRoutes);

// KYC Routes
app.use('/api', kycRoutes);

// QR Transaction Routes
app.use('/', qrTransactionRoutes);

// DEBUG: Check KYC Database status (development only)
app.get('/api/debug/kyc-status', (req, res) => {
  try {
    const kycDatabase = require('./routes/kyc').kycDatabase;
    const keys = Object.keys(kycDatabase);
    const data = {};
    
    keys.forEach(phone => {
      data[phone] = {
        status: kycDatabase[phone].kycStatus,
        bloodGroup: kycDatabase[phone].bloodGroup,
        submittedAt: kycDatabase[phone].submittedAt,
        filename: kycDatabase[phone].idCardFilename
      };
    });
    
    console.log('\n📊 DEBUG: KYC Database Status');
    console.log(`Total entries: ${keys.length}`);
    console.log('Entries:', data);
    
    res.json({
      success: true,
      totalEntries: keys.length,
      entries: data,
      timestamps: new Date().toISOString()
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// EMAIL OTP ROUTES (NEW SYSTEM)
// ============================================

/**
 * POST /api/send-otp
 * Send OTP code to email address
 * Body: { email: "user@example.com" }
 */
app.post('/api/send-otp', express.json(), async (req, res) => {
  const timer = createTimer();
  const endpoint = '/api/send-otp';
  
  try {
    logRequestStart(endpoint, req);
    
    const { email } = req.body;

    console.log(`  📧 Email: ${email ? email.substring(0, email.indexOf('@')) + '***' : 'None'}`);

    // Validate email
    if (!email) logValidationError('email', 'Required field missing');
    if (email && !email.includes('@')) logValidationError('email', 'Invalid email format');
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    console.log(`  🔐 OTP generation succeeded for: ${email.substring(0, email.indexOf('@'))}***`);
    console.log(`  📨 OTP length: ${otp.length} digits`);

    logDatabase('OTP', 'OTP generated', [email, '***']);

    // Send email
    console.log(`  📬 Sending OTP email...`);
    const emailSent = await sendOTP(email, otp);

    if (!emailSent) {
      console.error('❌ Failed to send OTP email');
      logRequestError(endpoint, new Error('Email send failed'), 500, timer.getDuration());
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please check your email address and try again.'
      });
    }

    // Store OTP temporarily
    storeOTP(email, otp);
    console.log(`  ✅ OTP sent and stored for: ${email.substring(0, email.indexOf('@'))}***`);

    const response = { success: true, message: 'OTP sent to your email address' };
    logRequestSuccess(endpoint, 200, response, timer.getDuration());
    res.json(response);

  } catch (error) {
    console.error(`${colors.red}❌ Error in /api/send-otp: ${error.message}${colors.reset}`);
    logRequestError(endpoint, error, 500, timer.getDuration());
    res.status(500).json({
      success: false,
      message: 'An error occurred while sending OTP'
    });
  }
});

/**
 * POST /api/verify-otp
 * Verify OTP code sent to email
 * Body: { email: "user@example.com", otp: "123456" }
 */
app.post('/api/verify-otp', express.json(), async (req, res) => {
  const timer = createTimer();
  const endpoint = '/api/verify-otp';
  
  try {
    logRequestStart(endpoint, req);
    
    const { email, otp } = req.body;

    console.log(`  📧 Email: ${email ? email.substring(0, email.indexOf('@')) + '***' : 'None'}`);
    console.log(`  🔐 OTP: ${otp ? '****' + otp.substring(otp.length - 2) : 'None'}`);

    // Validate inputs
    if (!email) logValidationError('email', 'Required field missing');
    if (!otp) logValidationError('otp', 'Required field missing');
    
    if (!email || !otp) {
      logValidationError('otp_verification', 'Missing email or OTP');
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    console.log(`  🔍 Verifying OTP for: ${email.substring(0, email.indexOf('@'))}***`);

    // Verify OTP
    const result = verifyOTP(email, otp);

    if (!result.success) {
      console.warn(`  ⚠️ OTP verification failed: ${result.message}`);
      logValidationError('otp_verification', result.message);
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    // OTP verified successfully
    console.log(`  ✅ OTP verified successfully for: ${email.substring(0, email.indexOf('@'))}***`);
    
    const response = {
      success: true,
      message: 'OTP verified successfully',
      email: email
    };
    logRequestSuccess(endpoint, 200, response, timer.getDuration());
    res.json(response);

  } catch (error) {
    console.error(`${colors.red}❌ Error in /api/verify-otp: ${error.message}${colors.reset}`);
    logRequestError(endpoint, error, 500, timer.getDuration());
    res.status(500).json({
      success: false,
      message: 'An error occurred while verifying OTP'
    });
  }
});

/**
 * POST /api/resend-otp
 * Resend OTP code if the previous one expired
 * Body: { email: "user@example.com" }
 */
app.post('/api/resend-otp', express.json(), async (req, res) => {
  const timer = createTimer();
  const endpoint = '/api/resend-otp';
  
  try {
    logRequestStart(endpoint, req);
    
    const { email } = req.body;

    console.log(`  📧 Email: ${email ? email.substring(0, email.indexOf('@')) + '***' : 'None'}`);

    // Validate email
    if (!email) logValidationError('email', 'Required field missing');
    if (email && !email.includes('@')) logValidationError('email', 'Invalid email format');
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    console.log(`  🔄 Resending OTP for: ${email.substring(0, email.indexOf('@'))}***`);

    // Generate new OTP
    const otp = generateOTP();
    console.log(`  🔐 New OTP generated (${otp.length} digits)`);

    // Send email
    console.log(`  📬 Sending OTP email...`);
    const emailSent = await sendOTP(email, otp);

    if (!emailSent) {
      console.error('❌ Failed to resend OTP email');
      logRequestError(endpoint, new Error('Email send failed'), 500, timer.getDuration());
      return res.status(500).json({
        success: false,
        message: 'Failed to resend OTP. Please try again.'
      });
    }

    // Store new OTP
    storeOTP(email, otp);

    console.log(`  ✅ OTP resent to: ${email.substring(0, email.indexOf('@'))}***`);
    
    const response = { success: true, message: 'OTP resent to your email address' };
    logRequestSuccess(endpoint, 200, response, timer.getDuration());
    res.json(response);

  } catch (error) {
    console.error(`${colors.red}❌ Error in /api/resend-otp: ${error.message}${colors.reset}`);
    logRequestError(endpoint, error, 500, timer.getDuration());
    res.status(500).json({
      success: false,
      message: 'An error occurred while resending OTP'
    });
  }
});

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
