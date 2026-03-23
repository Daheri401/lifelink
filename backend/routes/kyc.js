const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// ============ IN-MEMORY KYC STORAGE ============
// Extended pendingUsers stored in otp.js, we reference it here
let kycDatabase = {}; // { phone: { idCard, bloodGroup, kycStatus, kycSubmitted, submittedAt, reviewedAt, reviewedBy } }

// ============ MULTER CONFIGURATION FOR FILE UPLOADS ============
const uploadsDir = path.join(__dirname, '../uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Format: userid_idcard_timestamp.ext
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}_${file.fieldname}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Only allow images and PDFs
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
router.post('/kyc/submit', upload.single('idCard'), (req, res) => {
  try {
    const { phone, bloodGroup } = req.body;

    // Validation
    if (!phone || !bloodGroup) {
      // Clean up uploaded file if validation fails
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ 
        success: false, 
        message: 'Phone and blood group are required' 
      });
    }

    if (!validBloodGroups.includes(bloodGroup)) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid blood group' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID card file is required' 
      });
    }

    // Check if user already has pending KYC
    if (kycDatabase[phone] && kycDatabase[phone].kycStatus === 'pending') {
      fs.unlinkSync(req.file.path);
      return res.status(409).json({ 
        success: false, 
        message: 'You already have a pending KYC verification. Please wait for admin review.' 
      });
    }

    // Check if user already approved
    if (kycDatabase[phone] && kycDatabase[phone].kycStatus === 'approved') {
      fs.unlinkSync(req.file.path);
      return res.status(409).json({ 
        success: false, 
        message: 'You are already KYC verified!' 
      });
    }

    // Store KYC data
    kycDatabase[phone] = {
      idCard: req.file.path,
      idCardFilename: req.file.filename,
      bloodGroup: bloodGroup,
      kycStatus: 'pending', // pending | approved | rejected
      kycSubmitted: true,
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
      rejectionReason: null
    };

    console.log(`\n✅ KYC SUBMITTED`);
    console.log(`📱 Phone: ${phone}`);
    console.log(`🩸 Blood Group: ${bloodGroup}`);
    console.log(`📄 ID Card: ${req.file.filename}`);
    console.log(`⏰ Submitted: ${new Date().toISOString()}\n`);

    res.json({
      success: true,
      message: 'KYC verification submitted successfully! Admin will review within 24 hours.',
      kycStatus: 'pending'
    });

  } catch (error) {
    // Clean up uploaded file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('KYC submission error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit KYC verification' });
  }
});

// ============ GET /api/kyc/requests - Get all pending KYC requests (ADMIN) ============
router.get('/kyc/requests', (req, res) => {
  try {
    // In production, add admin authentication check here
    // if (!req.session.isAdmin) return res.status(403).json({ message: 'Admin only' });

    const pendingRequests = Object.entries(kycDatabase)
      .filter(([phone, data]) => data.kycStatus === 'pending')
      .map(([phone, data]) => ({
        phone: phone.slice(-4), // Only last 4 digits for privacy
        phoneFullForAdmin: phone, // Full phone for admin operations
        bloodGroup: data.bloodGroup,
        submittedAt: data.submittedAt,
        idCardPath: data.idCard,
        idCardFilename: data.idCardFilename,
        status: data.kycStatus
      }));

    res.json({
      success: true,
      count: pendingRequests.length,
      requests: pendingRequests
    });

  } catch (error) {
    console.error('KYC requests fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch KYC requests' });
  }
});

// ============ POST /api/kyc/approve - Approve KYC (ADMIN) ============
router.post('/kyc/approve', (req, res) => {
  try {
    // In production, add admin authentication check here
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number required' 
      });
    }

    if (!kycDatabase[phone]) {
      return res.status(404).json({ 
        success: false, 
        message: 'KYC record not found' 
      });
    }

    if (kycDatabase[phone].kycStatus === 'approved') {
      return res.status(409).json({ 
        success: false, 
        message: 'Already approved' 
      });
    }

    // Approve KYC
    kycDatabase[phone].kycStatus = 'approved';
    kycDatabase[phone].reviewedAt = new Date().toISOString();
    kycDatabase[phone].reviewedBy = req.session.adminId || 'system'; // Would come from session in production

    console.log(`\n✅ KYC APPROVED`);
    console.log(`📱 Phone: ${phone}`);
    console.log(`🩸 Blood Group: ${kycDatabase[phone].bloodGroup}`);
    console.log(`⏰ Approved: ${new Date().toISOString()}\n`);

    res.json({
      success: true,
      message: `KYC approved for ${phone}`,
      kycStatus: 'approved'
    });

  } catch (error) {
    console.error('KYC approval error:', error);
    res.status(500).json({ success: false, message: 'Failed to approve KYC' });
  }
});

// ============ POST /api/kyc/reject - Reject KYC (ADMIN) ============
router.post('/kyc/reject', (req, res) => {
  try {
    // In production, add admin authentication check here
    const { phone, reason } = req.body;

    if (!phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number required' 
      });
    }

    if (!kycDatabase[phone]) {
      return res.status(404).json({ 
        success: false, 
        message: 'KYC record not found' 
      });
    }

    // Reject KYC and allow resubmission
    kycDatabase[phone].kycStatus = 'rejected';
    kycDatabase[phone].kycSubmitted = false; // Allow resubmission
    kycDatabase[phone].reviewedAt = new Date().toISOString();
    kycDatabase[phone].rejectionReason = reason || 'Documents did not meet verification requirements';

    console.log(`\n❌ KYC REJECTED`);
    console.log(`📱 Phone: ${phone}`);
    console.log(`📋 Reason: ${kycDatabase[phone].rejectionReason}`);
    console.log(`⏰ Rejected: ${new Date().toISOString()}\n`);

    res.json({
      success: true,
      message: `KYC rejected for ${phone}. User can resubmit.`,
      kycStatus: 'rejected',
      rejectionReason: kycDatabase[phone].rejectionReason
    });

  } catch (error) {
    console.error('KYC rejection error:', error);
    res.status(500).json({ success: false, message: 'Failed to reject KYC' });
  }
});

// ============ GET /api/kyc/status/:phone - Check KYC status ============
router.get('/kyc/status/:phone', (req, res) => {
  try {
    const { phone } = req.params;

    if (!kycDatabase[phone]) {
      return res.json({
        success: true,
        status: 'not_started',
        verified: false,
        pending: false
      });
    }

    const data = kycDatabase[phone];

    res.json({
      success: true,
      status: data.kycStatus,
      verified: data.kycStatus === 'approved',
      pending: data.kycStatus === 'pending',
      bloodGroup: data.bloodGroup,
      submittedAt: data.submittedAt,
      reviewedAt: data.reviewedAt,
      rejectionReason: data.rejectionReason || null
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ success: false, message: 'Failed to check status' });
  }
});

// ============ EXPORT KYCDATABASE FOR REFERENCE IN OTHER MODULES ============
module.exports = router;
module.exports.kycDatabase = kycDatabase;

