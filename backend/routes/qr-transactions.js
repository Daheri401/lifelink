// ============================================
// TRANSACTIONAL QR VERIFICATION SYSTEM
// Backend API Routes
// ============================================

const express = require('express');
const crypto = require('crypto');
const mysql = require('mysql2/promise');
const router = express.Router();

// Database configuration (should match server.js dbConfig)
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'lifelink'
};

// Helper function to get database connection
async function getConnection() {
  return await mysql.createConnection(dbConfig);
}

// ============================================
// 1. CREATE TRANSACTION ENDPOINT
// POST /api/create-transaction
// ============================================

/**
 * Create a new transaction for QR verification
 * Called when donor initiates a donation
 * 
 * Request body:
 * {
 *   amount: number (e.g., 50 for 50 blood points),
 *   hospital_id: number,
 *   metadata: object (optional - for storing donation details)
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   token: "a1b2c3d4...",      // 32-char hex token
 *   qrUrl: "http://ip:port/api/verify/a1b2c3d4..."
 * }
 */
router.post('/api/create-transaction', async (req, res) => {
  console.log('💳 Create transaction endpoint called');
  
  let connection;
  try {
    const donorId = req.session.userId;
    const { amount, hospital_id, metadata } = req.body;

    // Validation
    if (!donorId) {
      console.warn('⚠️ Unauthorized: No donor ID in session');
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    if (!amount || amount <= 0) {
      console.warn('⚠️ Invalid amount:', amount);
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    if (!hospital_id) {
      console.warn('⚠️ Missing hospital ID');
      return res.status(400).json({ success: false, message: 'Hospital ID required' });
    }

    // Generate secure 32-character hex token
    const token = crypto.randomBytes(16).toString('hex');
    console.log('🔐 Generated token:', token.substring(0, 8) + '...');

    // Save transaction to database
    connection = await getConnection();
    console.log('📊 Connected to database');

    const result = await connection.execute(
      `INSERT INTO transactions (donor_id, hospital_id, amount, token, metadata, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [
        donorId,
        hospital_id,
        amount,
        token,
        metadata ? JSON.stringify(metadata) : null
      ]
    );

    const transactionId = result[0].insertId;
    console.log('✅ Transaction created with ID:', transactionId);

    // Log the transaction creation
    await connection.execute(
      `INSERT INTO transaction_logs (transaction_id, action, new_status)
       VALUES (?, 'CREATED', 'pending')`,
      [transactionId]
    );

    await connection.end();

    // Generate QR URL (use environment variable or config for IP/PORT)
    const baseUrl = process.env.QR_BASE_URL || 'http://localhost:8500';
    const qrUrl = `${baseUrl}/api/verify/${token}`;

    console.log('✅ Transaction created successfully');
    res.json({
      success: true,
      transaction_id: transactionId,
      token: token,
      qrUrl: qrUrl,
      amount: amount
    });

  } catch (error) {
    console.error('💥 Error creating transaction:', error);
    res.status(500).json({ success: false, message: error.message });
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

// ============================================
// 2. VERIFY TRANSACTION ENDPOINT
// GET /api/verify/:token
// ============================================

/**
 * Verify a transaction and update wallet
 * Called when hospital scans the QR code
 * 
 * Uses database transactions (BEGIN, COMMIT, ROLLBACK) for atomicity
 * 
 * Response:
 * - HTML page with styled success/error message
 * - Updates wallet_balance atomically
 */
router.get('/api/verify/:token', async (req, res) => {
  console.log('🔍 Verify transaction endpoint called');
  
  let connection;
  try {
    const { token } = req.params;
    console.log('🔑 Token:', token.substring(0, 8) + '...');

    // Input validation
    if (!token || token.length !== 32) {
      console.warn('⚠️ Invalid token format');
      return res.status(400).send(generateErrorHTML('Invalid QR Code', 'Token format is invalid'));
    }

    connection = await getConnection();
    console.log('📊 Connected to database');

    // BEGIN TRANSACTION
    await connection.beginTransaction();
    console.log('🔒 Transaction started');

    try {
      // STEP 1: Find transaction by token
      const [transactions] = await connection.execute(
        `SELECT id, donor_id, hospital_id, amount, status FROM transactions WHERE token = ? FOR UPDATE`,
        [token]
      );

      if (transactions.length === 0) {
        console.warn('⚠️ Transaction not found for token:', token);
        await connection.rollback();
        return res.status(404).send(generateErrorHTML('QR Code Invalid', 'This transaction does not exist'));
      }

      const transaction = transactions[0];
      console.log('📋 Transaction found:', transaction);

      // Check if already completed
      if (transaction.status === 'completed') {
        console.warn('⚠️ Transaction already completed:', transaction.id);
        await connection.rollback();
        return res.status(400).send(generateErrorHTML('Already Verified', 'This donation has already been verified'));
      }

      // STEP 2: Update transaction status to completed
      await connection.execute(
        `UPDATE transactions SET status = 'completed', completed_at = NOW() WHERE id = ?`,
        [transaction.id]
      );
      console.log('✅ Transaction status updated to completed');

      // STEP 3: Update donor wallet balance
      await connection.execute(
        `UPDATE donors SET wallet_balance = wallet_balance + ? WHERE donor_id = ?`,
        [transaction.amount, transaction.donor_id]
      );
      console.log('💰 Donor wallet updated with amount:', transaction.amount);

      // STEP 4: Log the verification
      await connection.execute(
        `INSERT INTO transaction_logs (transaction_id, action, old_status, new_status)
         VALUES (?, 'VERIFIED', 'pending', 'completed')`,
        [transaction.id]
      );

      // COMMIT TRANSACTION
      await connection.commit();
      console.log('✅ Transaction committed successfully');

      // Get updated wallet balance for confirmation
      const [donorData] = await connection.execute(
        `SELECT wallet_balance FROM donors WHERE donor_id = ?`,
        [transaction.donor_id]
      );

      const newBalance = donorData[0]?.wallet_balance || 0;

      // Return success HTML
      return res.send(generateSuccessHTML(
        transaction.amount,
        newBalance,
        transaction.donor_id
      ));

    } catch (error) {
      // ROLLBACK on error
      await connection.rollback();
      console.error('💥 Error in transaction, rolling back:', error);
      throw error;
    }

  } catch (error) {
    console.error('💥 Error verifying transaction:', error);
    res.status(500).send(generateErrorHTML('Verification Failed', error.message));
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

// ============================================
// 3. GET TRANSACTION STATUS
// GET /api/transaction/:token
// ============================================

/**
 * Check the status of a transaction
 * Useful for frontend to poll and see if verification is complete
 */
router.get('/api/transaction/:token', async (req, res) => {
  console.log('📊 Get transaction status endpoint called');
  
  let connection;
  try {
    const { token } = req.params;

    connection = await getConnection();

    const [transactions] = await connection.execute(
      `SELECT id, donor_id, amount, status, created_at, completed_at FROM transactions WHERE token = ?`,
      [token]
    );

    await connection.end();

    if (transactions.length === 0) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const transaction = transactions[0];
    res.json({
      success: true,
      status: transaction.status,
      amount: transaction.amount,
      created_at: transaction.created_at,
      completed_at: transaction.completed_at
    });

  } catch (error) {
    console.error('Error checking transaction status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// 4. GET DONOR WALLET BALANCE
// GET /api/wallet/balance
// ============================================

/**
 * Get current wallet balance for authenticated donor
 */
router.get('/api/wallet/balance', async (req, res) => {
  console.log('💳 Get wallet balance endpoint called');
  
  let connection;
  try {
    const donorId = req.session.userId;

    if (!donorId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    connection = await getConnection();

    const [donors] = await connection.execute(
      `SELECT wallet_balance FROM donors WHERE donor_id = ?`,
      [donorId]
    );

    await connection.end();

    if (donors.length === 0) {
      return res.status(404).json({ success: false, message: 'Donor not found' });
    }

    const balance = donors[0].wallet_balance || 0;
    res.json({ success: true, balance: balance });

  } catch (error) {
    console.error('Error getting wallet balance:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// HTML RESPONSE GENERATORS
// ============================================

function generateSuccessHTML(amount, newBalance, donorId) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Donation Verified - LifeLink</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          padding: 60px 40px;
          text-align: center;
          max-width: 500px;
          animation: slideUp 0.6s ease-out;
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .checkmark {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #4CAF50;
          margin: 0 auto 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: scaleIn 0.6s ease-out;
        }
        @keyframes scaleIn {
          from {
            transform: scale(0);
          }
          to {
            transform: scale(1);
          }
        }
        .checkmark::after {
          content: '✅';
          font-size: 50px;
        }
        h1 {
          color: #333;
          font-size: 28px;
          margin-bottom: 10px;
        }
        .subtitle {
          color: #666;
          font-size: 16px;
          margin-bottom: 30px;
        }
        .details {
          background: #f5f5f5;
          border-radius: 8px;
          padding: 20px;
          margin: 30px 0;
          text-align: left;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #e0e0e0;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          color: #666;
          font-weight: 500;
        }
        .detail-value {
          color: #333;
          font-weight: 600;
        }
        .amount {
          color: #4CAF50;
          font-size: 24px;
        }
        .button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 14px 40px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 20px;
          transition: transform 0.2s;
        }
        .button:hover {
          transform: translateY(-2px);
        }
        .timestamp {
          color: #999;
          font-size: 12px;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="checkmark"></div>
        <h1>✅ Donation Verified!</h1>
        <p class="subtitle">Your wallet has been updated successfully</p>
        
        <div class="details">
          <div class="detail-row">
            <span class="detail-label">Amount Credited:</span>
            <span class="detail-value amount">+${amount}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">New Balance:</span>
            <span class="detail-value">${newBalance} points</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Verification:</span>
            <span class="detail-value">✅ Complete</span>
          </div>
        </div>
        
        <button class="button" onclick="closeWindow()">Close Window</button>
        <p class="timestamp">Verified at ${new Date().toLocaleTimeString()}</p>
      </div>
      
      <script>
        function closeWindow() {
          if (window.opener) {
            window.close();
          } else {
            window.location.href = '/donor-dashboard';
          }
        }
        
        // Auto-close after 5 seconds if opened in popup
        if (window.opener) {
          setTimeout(closeWindow, 5000);
        }
      </script>
    </body>
    </html>
  `;
}

function generateErrorHTML(title, message) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verification Failed - LifeLink</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          padding: 60px 40px;
          text-align: center;
          max-width: 500px;
          animation: slideUp 0.6s ease-out;
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #f5576c;
          margin: 0 auto 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: shake 0.5s ease-out;
        }
        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg); }
          75% { transform: rotate(5deg); }
        }
        .icon::after {
          content: '❌';
          font-size: 50px;
        }
        h1 {
          color: #333;
          font-size: 28px;
          margin-bottom: 10px;
        }
        p {
          color: #666;
          font-size: 16px;
          margin-bottom: 30px;
        }
        .button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 14px 40px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 20px;
          transition: transform 0.2s;
        }
        .button:hover {
          transform: translateY(-2px);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon"></div>
        <h1>${title}</h1>
        <p>${message}</p>
        <button class="button" onclick="goBack()">Go Back</button>
      </div>
      
      <script>
        function goBack() {
          if (window.opener) {
            window.close();
          } else {
            window.location.href = '/donor-dashboard';
          }
        }
      </script>
    </body>
    </html>
  `;
}

module.exports = router;
