const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
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

// Middleware to check authentication
function requireAuth(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

/**
 * POST /generate-qr
 * Hospital generates QR code for a blood donation request
 * Only hospitals can call this endpoint
 */
router.post('/generate-qr', requireAuth, async (req, res) => {
  try {
    const { requestId } = req.body;
    const hospitalId = req.session.userId;

    // Validate input
    if (!requestId) {
      return res.status(400).json({ error: 'Request ID is required' });
    }

    const connection = await getConnection();

    // Verify hospital role
    const [userRows] = await connection.execute(
      'SELECT role FROM users WHERE user_id = ?',
      [hospitalId]
    );

    if (userRows.length === 0 || userRows[0].role !== 'hospital') {
      connection.end();
      return res.status(403).json({ error: 'Only hospitals can generate QR codes' });
    }

    // Verify the request exists and belongs to this hospital
    const [requestRows] = await connection.execute(
      'SELECT * FROM blood_requests WHERE request_id = ? AND hospital_id = ?',
      [requestId, hospitalId]
    );

    if (requestRows.length === 0) {
      connection.end();
      return res.status(404).json({ error: 'Request not found or does not belong to this hospital' });
    }

    // Generate unique transaction ID
    const transactionId = uuidv4();

    // Data to encode in QR code
    const qrData = JSON.stringify({
      transactionId: transactionId,
      requestId: requestId,
      hospitalId: hospitalId,
      timestamp: new Date().toISOString(),
      type: 'blood_donation_verification'
    });

    // Generate QR code as base64 image
    const qrImage = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Store QR code metadata in database (linked to donation when scanned)
    const qrInsertQuery = `
      INSERT INTO qr_codes (transaction_id, request_id, hospital_id, qr_data, qr_image, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'active', NOW())
    `;

    await connection.execute(qrInsertQuery, [
      transactionId,
      requestId,
      hospitalId,
      qrData,
      qrImage.substring(0, 100) // Store reference, not full image
    ]);

    connection.end();

    return res.json({
      success: true,
      transactionId: transactionId,
      qrImage: qrImage,
      requestId: requestId,
      expiresIn: '24 hours',
      message: 'QR code generated successfully. Show this to the donor to verify donation.'
    });
  } catch (error) {
    console.error('Generate QR error:', error);
    return res.status(500).json({ error: 'Failed to generate QR code', details: error.message });
  }
});

/**
 * POST /scan-qr
 * Donor scans QR code to initiate verification
 */
router.post('/scan-qr', requireAuth, async (req, res) => {
  try {
    const { qrData } = req.body;
    const donorId = req.session.userId;

    if (!qrData) {
      return res.status(400).json({ error: 'QR data is required' });
    }

    const connection = await getConnection();

    // Verify donor role
    const [userRows] = await connection.execute(
      'SELECT role FROM users WHERE user_id = ?',
      [donorId]
    );

    if (userRows.length === 0 || userRows[0].role !== 'donor') {
      connection.end();
      return res.status(403).json({ error: 'Only donors can scan QR codes' });
    }

    // Verify donor is KYC approved
    const [donorRows] = await connection.execute(
      'SELECT kyc_verified FROM donors WHERE donor_id = ?',
      [donorId]
    );

    if (donorRows.length === 0 || !donorRows[0].kyc_verified) {
      connection.end();
      return res.status(403).json({ error: 'Only KYC verified donors can verify donations' });
    }

    // Parse QR data
    let qrPayload;
    try {
      qrPayload = JSON.parse(qrData);
    } catch (e) {
      connection.end();
      return res.status(400).json({ error: 'Invalid QR code format' });
    }

    const { transactionId, requestId, hospitalId } = qrPayload;

    // Verify QR code exists and is active
    const [qrRows] = await connection.execute(
      'SELECT * FROM qr_codes WHERE transaction_id = ? AND request_id = ? AND hospital_id = ?',
      [transactionId, requestId, hospitalId]
    );

    if (qrRows.length === 0) {
      connection.end();
      return res.status(404).json({ error: 'QR code not found' });
    }

    if (qrRows[0].status !== 'active') {
      connection.end();
      return res.status(400).json({ error: 'This QR code has already been used or has expired' });
    }

    // Check if QR code has expired (24 hours)
    const qrCreatedAt = new Date(qrRows[0].created_at);
    const now = new Date();
    const hoursDiff = (now - qrCreatedAt) / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      // Mark as expired
      await connection.execute(
        'UPDATE qr_codes SET status = ? WHERE transaction_id = ?',
        ['expired', transactionId]
      );
      connection.end();
      return res.status(400).json({ error: 'QR code has expired (valid for 24 hours)' });
    }

    connection.end();

    return res.json({
      success: true,
      transactionId: transactionId,
      requestId: requestId,
      hospitalId: hospitalId,
      message: 'QR code scanned successfully. Please confirm donation completion.',
      nextStep: 'POST /verify-donation'
    });
  } catch (error) {
    console.error('Scan QR error:', error);
    return res.status(500).json({ error: 'Failed to scan QR code', details: error.message });
  }
});

/**
 * POST /verify-donation
 * Donor confirms donation completion after scanning QR
 */
router.post('/verify-donation', requireAuth, async (req, res) => {
  try {
    const { transactionId, requestId } = req.body;
    const donorId = req.session.userId;

    if (!transactionId || !requestId) {
      return res.status(400).json({ error: 'Transaction ID and Request ID are required' });
    }

    const connection = await getConnection();

    // Verify donor role and KYC status
    const [userRows] = await connection.execute(
      'SELECT role FROM users WHERE user_id = ?',
      [donorId]
    );

    if (userRows.length === 0 || userRows[0].role !== 'donor') {
      connection.end();
      return res.status(403).json({ error: 'Only donors can verify donations' });
    }

    // Get QR code data
    const [qrRows] = await connection.execute(
      'SELECT * FROM qr_codes WHERE transaction_id = ? AND request_id = ?',
      [transactionId, requestId]
    );

    if (qrRows.length === 0) {
      connection.end();
      return res.status(404).json({ error: 'QR code record not found' });
    }

    if (qrRows[0].status !== 'active') {
      connection.end();
      return res.status(400).json({ error: 'QR code is no longer valid' });
    }

    const hospitalId = qrRows[0].hospital_id;

    // Check if donation already exists for this request and donor
    const [existingDonation] = await connection.execute(
      'SELECT * FROM donations WHERE request_id = ? AND donor_id = ? AND status = ?',
      [requestId, donorId, 'completed']
    );

    if (existingDonation.length > 0) {
      connection.end();
      return res.status(400).json({ error: 'You have already completed a donation for this request' });
    }

    // Create or update donation record
    const [donationRows] = await connection.execute(
      'SELECT donation_id FROM donations WHERE request_id = ? AND donor_id = ?',
      [requestId, donorId]
    );

    let donationId;
    if (donationRows.length > 0) {
      // Update existing donation
      donationId = donationRows[0].donation_id;
      await connection.execute(
        'UPDATE donations SET status = ?, qr_code = ?, donation_date = NOW() WHERE donation_id = ?',
        ['completed', transactionId, donationId]
      );
    } else {
      // Create new donation record
      const [result] = await connection.execute(
        `INSERT INTO donations (donor_id, hospital_id, request_id, status, qr_code, donation_date)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [donorId, hospitalId, requestId, 'completed', transactionId]
      );
      donationId = result.insertId;
    }

    // 🔓 UNLOCK WALLET: Update donor wallet_balance to unlock wallet access
    // Set initial wallet balance to 100 points to unlock wallet features
    const [currentBalance] = await connection.execute(
      'SELECT wallet_balance FROM donors WHERE donor_id = ?',
      [donorId]
    );

    if (currentBalance.length > 0) {
      const newBalance = Math.max(100, currentBalance[0].wallet_balance || 0);
      await connection.execute(
        'UPDATE donors SET wallet_balance = ? WHERE donor_id = ?',
        [newBalance, donorId]
      );
      console.log(`✅ Wallet unlocked for donor ${donorId}: balance set to ${newBalance}`);
    }

    // Mark QR code as used
    await connection.execute(
      'UPDATE qr_codes SET status = ?, used_by_donor = ?, used_at = NOW() WHERE transaction_id = ?',
      ['used', donorId, transactionId]
    );

    connection.end();

    return res.json({
      success: true,
      donationId: donationId,
      transactionId: transactionId,
      message: 'Donation verified successfully! 🎉',
      nextStep: 'Reward will be issued'
    });
  } catch (error) {
    console.error('Verify donation error:', error);
    return res.status(500).json({ error: 'Failed to verify donation', details: error.message });
  }
});

/**
 * POST /issue-reward
 * Award rewards to donor after successful verification
 */
router.post('/issue-reward', requireAuth, async (req, res) => {
  try {
    const { donationId, rewardAmount = 500 } = req.body;
    const hospitalId = req.session.userId;

    if (!donationId) {
      return res.status(400).json({ error: 'Donation ID is required' });
    }

    const connection = await getConnection();

    // Verify hospital role
    const [userRows] = await connection.execute(
      'SELECT role FROM users WHERE user_id = ?',
      [hospitalId]
    );

    if (userRows.length === 0 || userRows[0].role !== 'hospital') {
      connection.end();
      return res.status(403).json({ error: 'Only hospitals can issue rewards' });
    }

    // Get donation details
    const [donationRows] = await connection.execute(
      'SELECT donor_id FROM donations WHERE donation_id = ? AND hospital_id = ? AND status = ?',
      [donationId, hospitalId, 'completed']
    );

    if (donationRows.length === 0) {
      connection.end();
      return res.status(404).json({ error: 'Donation not found or has not been verified' });
    }

    const donorId = donationRows[0].donor_id;

    // Check if reward already issued
    const [rewardRows] = await connection.execute(
      'SELECT * FROM donation_rewards WHERE donation_id = ?',
      [donationId]
    );

    if (rewardRows.length > 0 && rewardRows[0].status === 'issued') {
      connection.end();
      return res.status(400).json({ error: 'Reward has already been issued for this donation' });
    }

    // Add reward to donor wallet
    const [walletRows] = await connection.execute(
      'SELECT wallet_id, transport_balance, total_rewards FROM donor_wallet WHERE donor_id = ?',
      [donorId]
    );

    if (walletRows.length === 0) {
      // Create wallet if doesn't exist
      await connection.execute(
        'INSERT INTO donor_wallet (donor_id, transport_balance, total_rewards) VALUES (?, ?, ?)',
        [donorId, rewardAmount, rewardAmount]
      );
    } else {
      // Update existing wallet
      const newBalance = (walletRows[0].transport_balance || 0) + rewardAmount;
      const newTotal = (walletRows[0].total_rewards || 0) + rewardAmount;
      await connection.execute(
        'UPDATE donor_wallet SET transport_balance = ?, total_rewards = ? WHERE donor_id = ?',
        [newBalance, newTotal, donorId]
      );
    }

    // Record reward transaction
    if (rewardRows.length > 0) {
      await connection.execute(
        'UPDATE donation_rewards SET status = ?, amount = ?, issued_at = NOW() WHERE donation_id = ?',
        ['issued', rewardAmount, donationId]
      );
    } else {
      await connection.execute(
        `INSERT INTO donation_rewards (donation_id, donor_id, hospital_id, amount, status, issued_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [donationId, donorId, hospitalId, rewardAmount, 'issued']
      );
    }

    connection.end();

    return res.json({
      success: true,
      message: 'Reward issued successfully',
      rewardAmount: rewardAmount,
      currency: 'XAF',
      donorNotification: `You received ${rewardAmount} XAF for your blood donation! 🎉`
    });
  } catch (error) {
    console.error('Issue reward error:', error);
    return res.status(500).json({ error: 'Failed to issue reward', details: error.message });
  }
});

/**
 * GET /qr-status/:transactionId
 * Check the status of a QR code verification
 */
router.get('/qr-status/:transactionId', requireAuth, async (req, res) => {
  try {
    const { transactionId } = req.params;

    const connection = await getConnection();

    const [qrRows] = await connection.execute(
      'SELECT * FROM qr_codes WHERE transaction_id = ?',
      [transactionId]
    );

    connection.end();

    if (qrRows.length === 0) {
      return res.status(404).json({ error: 'QR code not found' });
    }

    const qr = qrRows[0];
    const createdAt = new Date(qr.created_at);
    const now = new Date();
    const hoursDiff = (now - createdAt) / (1000 * 60 * 60);

    return res.json({
      transactionId: qr.transaction_id,
      status: qr.status,
      expiresIn: Math.max(0, 24 - Math.floor(hoursDiff)) + ' hours',
      usedBy: qr.used_by_donor || null,
      usedAt: qr.used_at || null,
      createdAt: qr.created_at
    });
  } catch (error) {
    console.error('QR status error:', error);
    return res.status(500).json({ error: 'Failed to get QR status', details: error.message });
  }
});

module.exports = router;
