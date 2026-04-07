const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'lifelink'
};

// Database connection function
async function getConnection() {
  return await mysql.createConnection(dbConfig);
}

// ============ IN-MEMORY KYC STORAGE ============
// Extended pendingUsers stored in otp.js, we reference it here
let kycDatabase = {}; // { phone: { idCard, bloodGroup, kycStatus, kycSubmitted, submittedAt, reviewedAt, reviewedBy } }

// ============ MULTER CONFIGURATION FOR FILE UPLOADS ============
const uploadsDir = path.join(__dirname, '../uploads/kyc');

// Create uploads directory if it doesn't exist  
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Use timestamp + random number for unique filenames
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, and PDF allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// ============ BLOOD GROUPS VALIDATION ============
const validBloodGroups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

// ============ GET /api/profile - Get user profile with KYC status ============
router.get('/profile', (req, res) => {
  try {
    // In a real system, this would get the phone from session/auth token
    // For now, we'll create a simple demo
    const phone = req.query.phone || req.session.phone;
    
    if (!phone) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authenticated' 
      });
    }

    const kycData = kycDatabase[phone] || {
      kycStatus: 'pending', // not_started, pending, approved, rejected
      kycSubmitted: false,
      kycVerified: false,
      bloodGroup: null,
      submittedAt: null,
      reviewedAt: null
    };

    res.json({
      success: true,
      kyc_status: kycData.kycStatus,
      kyc_submitted: kycData.kycSubmitted,
      kyc_verified: kycData.kycStatus === 'approved',
      kyc_pending: kycData.kycStatus === 'pending',
      blood_group: kycData.bloodGroup,
      submitted_at: kycData.submittedAt,
      reviewed_at: kycData.reviewedAt
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
});

// ============ POST /api/kyc/submit - Submit KYC for verification ============
router.post('/kyc/submit', (req, res, next) => {
  // Handle multer file upload with proper error handling
  upload.single('idCard')(req, res, (err) => {
    if (err) {
      // Handle multer errors
      if (err.code === 'FILE_TOO_LARGE' || err.limit === 'fileSize') {
        return res.status(400).json({ 
          success: false, 
          message: 'File is too large. Maximum size is 5MB.' 
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ 
          success: false, 
          message: 'Unexpected file field' 
        });
      }
      return res.status(400).json({ 
        success: false, 
        message: 'File upload error: ' + err.message 
      });
    }
    
    // Continue to route handler after multer completes successfully
    handleKYCSubmit(req, res);
  });
});

function handleKYCSubmit(req, res) {
  try {
    console.log('\n=== KYC SUBMIT HANDLER ===');
    console.log('File received:', req.file ? {filename: req.file.filename, size: req.file.size, mimetype: req.file.mimetype} : 'NO FILE');
    console.log('Body fields:', {phone: req.body.phone, bloodGroup: req.body.bloodGroup});
    
    if (!req.file) {
      console.log('ERROR: No file uploaded');
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    const { phone, bloodGroup } = req.body;

    if (!phone || !bloodGroup) {
      console.log('ERROR: Missing fields - Phone:', phone, 'Blood Group:', bloodGroup);
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ 
        success: false, 
        message: 'Phone and blood group are required' 
      });
    }

    if (!validBloodGroups.includes(bloodGroup)) {
      console.log('ERROR: Invalid blood group:', bloodGroup);
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid blood group: ' + bloodGroup 
      });
    }

    // Store in memory for admin lookup
    kycDatabase[phone] = {
      phone: phone,
      bloodGroup: bloodGroup,
      idCardPath: req.file.filename,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      kycStatus: 'pending',
      kycSubmitted: true,
      reviewedAt: null,
      rejectionReason: null
    };

    console.log('✓ KYC stored in memory:', kycDatabase[phone]);

    // Now save to database
    saveKYCToDatabase(phone, bloodGroup, req.file.filename, res);

  } catch (err) {
    console.error('KYC Submit Error:', err);
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkErr) {
        console.error('Error deleting file:', unlinkErr);
      }
    }
    res.status(500).json({ 
      success: false, 
      message: 'Upload failed: ' + err.message 
    });
  }
}

// Save KYC data to database
async function saveKYCToDatabase(phone, bloodGroup, filename, res) {
  let connection;
  try {
    connection = await getConnection();

    // Check if user with this phone exists in users table
    const [users] = await connection.execute(
      'SELECT user_id FROM users WHERE phone = ?',
      [phone]
    );

    if (users.length === 0) {
      console.log('ERROR: User not found with phone:', phone);
      if (res && !res.headersSent) {
        return res.status(404).json({
          success: false,
          message: 'User not found. Please register first.'
        });
      }
      return;
    }

    const userId = users[0].user_id;
    console.log('Found user:', userId);

    // Check if donor record exists
    const [donors] = await connection.execute(
      'SELECT donor_id FROM donors WHERE donor_id = ?',
      [userId]
    );

    if (donors.length === 0) {
      console.log('Creating new donor record for user:', userId);
      // Insert new donor record
      await connection.execute(
        `INSERT INTO donors (donor_id, blood_group, kyc_document_path, kyc_pending, kyc_submitted_at) 
         VALUES (?, ?, ?, ?, NOW())`,
        [userId, bloodGroup, filename, true]
      );
    } else {
      console.log('Updating existing donor record:', userId);
      // Update existing donor record
      await connection.execute(
        `UPDATE donors 
         SET blood_group = ?, kyc_document_path = ?, kyc_pending = ?, kyc_submitted_at = NOW(), kyc_verified = false
         WHERE donor_id = ?`,
        [bloodGroup, filename, true, userId]
      );
    }

    console.log('✓ KYC saved to database for phone:', phone);
    console.log('=== END KYC SUBMIT ===\n');

    if (res && !res.headersSent) {
      res.json({ 
        success: true, 
        message: 'KYC submitted successfully! Admin will review within 24 hours.',
        kycStatus: 'pending'
      });
    }

  } catch (err) {
    console.error('Database Error:', err);
    console.log('=== END KYC SUBMIT (ERROR) ===\n');
    if (res && !res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Database error: ' + err.message
      });
    }
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (endErr) {
        console.error('Error closing connection:', endErr);
      }
    }
  }
}

// ============ GET /api/kyc/requests - Get all pending KYC requests (ADMIN) ============
router.get('/kyc/requests', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();

    const [donors] = await connection.execute(`
      SELECT u.phone, u.full_name, u.user_id,
             d.blood_group, d.kyc_document_path, d.kyc_submitted_at, d.kyc_verified
      FROM donors d
      JOIN users u ON d.donor_id = u.user_id
      WHERE d.kyc_pending = true AND d.kyc_verified = false
      ORDER BY d.kyc_submitted_at DESC
    `);

    const pendingRequests = donors.map(donor => ({
      phone: donor.phone.slice(-4), // Only last 4 digits for privacy
      phoneFullForAdmin: donor.phone, // Full phone for admin operations
      bloodGroup: donor.blood_group,
      submittedAt: donor.kyc_submitted_at ? donor.kyc_submitted_at.toISOString() : new Date().toISOString(),
      idCardPath: `/uploads/kyc/${donor.kyc_document_path}`,
      idCardUrl: `/uploads/kyc/${donor.kyc_document_path}`,
      status: 'pending'
    }));

    res.json({
      success: true,
      count: pendingRequests.length,
      requests: pendingRequests
    });

  } catch (error) {
    console.error('KYC requests fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch KYC requests' });
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
});

// ============ POST /api/kyc/approve - Approve KYC (ADMIN) ============
router.post('/kyc/approve', async (req, res) => {
  let connection;
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number required' 
      });
    }

    connection = await getConnection();

    // Find user by phone
    const [users] = await connection.execute(
      'SELECT user_id FROM users WHERE phone = ?',
      [phone]
    );

    if (users.length === 0) {
      await connection.end();
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const userId = users[0].user_id;

    // Check if already approved
    const [donors] = await connection.execute(
      'SELECT kyc_verified FROM donors WHERE donor_id = ?',
      [userId]
    );

    if (donors.length > 0 && donors[0].kyc_verified) {
      await connection.end();
      return res.status(409).json({ 
        success: false, 
        message: 'Already approved' 
      });
    }

    // Approve KYC in database
    await connection.execute(
      `UPDATE donors 
       SET kyc_verified = true, kyc_pending = false, kyc_verified_at = NOW()
       WHERE donor_id = ?`,
      [userId]
    );

    // Update in-memory database
    if (kycDatabase[phone]) {
      kycDatabase[phone].kycStatus = 'approved';
      kycDatabase[phone].reviewedAt = new Date().toISOString();
    }

    await connection.end();

    res.json({
      success: true,
      message: `KYC approved for ${phone}`,
      kycStatus: 'approved'
    });

  } catch (error) {
    console.error('KYC Approve Error:', error);
    res.status(500).json({ success: false, message: 'Failed to approve KYC: ' + error.message });
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (err) {
        console.error('Connection error:', err);
      }
    }
  }
});

// ============ POST /api/kyc/reject - Reject KYC (ADMIN) ============
router.post('/kyc/reject', async (req, res) => {
  let connection;
  try {
    const { phone, reason } = req.body;

    if (!phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number required' 
      });
    }

    connection = await getConnection();

    // Find user by phone
    const [users] = await connection.execute(
      'SELECT user_id FROM users WHERE phone = ?',
      [phone]
    );

    if (users.length === 0) {
      await connection.end();
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const userId = users[0].user_id;
    const rejectionReason = reason || 'Documents did not meet verification requirements';

    // Reject KYC and allow resubmission
    await connection.execute(
      `UPDATE donors 
       SET kyc_verified = false, kyc_pending = false, kyc_rejection_reason = ?, kyc_rejected_at = NOW()
       WHERE donor_id = ?`,
      [rejectionReason, userId]
    );

    // Update in-memory database
    if (kycDatabase[phone]) {
      kycDatabase[phone].kycStatus = 'rejected';
      kycDatabase[phone].kycSubmitted = false;
      kycDatabase[phone].reviewedAt = new Date().toISOString();
      kycDatabase[phone].rejectionReason = rejectionReason;
    }

    await connection.end();

    res.json({
      success: true,
      message: `KYC rejected for ${phone}. User can resubmit.`,
      kycStatus: 'rejected',
      rejectionReason: rejectionReason
    });

  } catch (error) {
    console.error('KYC Reject Error:', error);
    res.status(500).json({ success: false, message: 'Failed to reject KYC: ' + error.message });
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (err) {
        console.error('Connection error:', err);
      }
    }
  }
});

// ============ GET /api/kyc/status/:phone - Check KYC status ============
router.get('/kyc/status/:phone', async (req, res) => {
  let connection;
  try {
    const { phone } = req.params;

    connection = await getConnection();

    // Find user by phone
    const [users] = await connection.execute(
      'SELECT user_id FROM users WHERE phone = ?',
      [phone]
    );

    if (users.length === 0) {
      await connection.end();
      return res.json({
        success: true,
        status: 'not_started',
        verified: false,
        pending: false
      });
    }

    const userId = users[0].user_id;

    // Get KYC status from donors table
    const [donors] = await connection.execute(
      `SELECT kyc_verified, kyc_pending, blood_group, kyc_submitted_at, 
              kyc_verified_at, kyc_rejection_reason
       FROM donors WHERE donor_id = ?`,
      [userId]
    );

    await connection.end();

    if (donors.length === 0 || !donors[0].kyc_pending) {
      return res.json({
        success: true,
        status: 'not_started',
        verified: false,
        pending: false
      });
    }

    const donor = donors[0];
    let status = 'pending';
    if (donor.kyc_verified) status = 'approved';
    else if (donor.kyc_rejection_reason) status = 'rejected';

    res.json({
      success: true,
      status: status,
      verified: donor.kyc_verified || false,
      pending: donor.kyc_pending || false,
      bloodGroup: donor.blood_group,
      submittedAt: donor.kyc_submitted_at ? donor.kyc_submitted_at.toISOString() : null,
      verifiedAt: donor.kyc_verified_at ? donor.kyc_verified_at.toISOString() : null,
      rejectionReason: donor.kyc_rejection_reason || null
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ success: false, message: 'Failed to check status' });
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (err) {
        console.error('Connection error:', err);
      }
    }
  }
});

// ============ EXPORT KYCDATABASE FOR REFERENCE IN OTHER MODULES ============
module.exports = router;
module.exports.kycDatabase = kycDatabase;

