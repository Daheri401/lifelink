# QR Verification System - Quick Start & Testing Guide

## ✅ System Status
- **Server:** Running on http://localhost:8500
- **Database:** ✅ Schema created and verified
- **API Routes:** ✅ 4 endpoints implemented
- **Frontend:** ✅ All functions integrated
- **CSS:** ✅ Styles added for QR modal and wallet lock

## 📊 What Was Implemented

### Backend (3 new files)
1. **backend/routes/qr-transactions.js** (371 lines)
   - POST `/api/create-transaction` - Create donation transaction
   - GET `/api/verify/:token` - Verify and update wallet (atomic)
   - GET `/api/transaction/:token` - Check transaction status
   - GET `/api/wallet/balance` - Get donor balance

2. **backend/migrate-qr-transactions.js** (139 lines)
   - Executes SQL migration safely
   - Parses and validates SQL
   - Verifies schema creation
   - Reports status with color output

3. **backend/database/qr-transactions-setup.sql**
   - ALTER TABLE donors ADD wallet_balance
   - CREATE TABLE transactions (8 columns, 5 indexes, atomic support)
   - CREATE TABLE transaction_logs (audit trail)

### Frontend (300+ lines added)
1. **js/script.js** - 8 new functions
   - `getWalletBalance()` - Fetch balance from API
   - `checkWalletLock()` - Apply/remove lock overlay based on balance
   - `initiateTransaction()` - Create transaction & generate QR
   - `generateQRCode()` - Render QR code canvas
   - `generateQRWithLibrary()` - Use QRCode.js library
   - `createQRContainer()` - Build QR modal structure
   - `pollTransactionStatus()` - Detect when hospital scans QR
   - `closeQRModal()` - Close QR verification modal

2. **css/styles.css** - 150+ lines
   - `.qr-modal` - Full-screen overlay
   - `.qr-modal-content` - Centered white box with animation
   - `.qr-container` - Canvas container for QR code
   - `.wallet-overlay` - Lock overlay when balance = 0
   - `.wallet-locked` - Blur effect on locked elements
   - `#wallet-balance` - Balance display in header with gradient
   - Transaction status badges (pending/completed/failed)
   - `.btn-donate` - Styled donation button

3. **pages/donor-dashboard.html**
   - Added wallet balance display in header
   - Added `checkWalletLock()` initialization

4. **pages/wallet.html**
   - Added `checkWalletLock()` initialization

### Database Schema
```
donors:
  + wallet_balance DECIMAL(10,2) DEFAULT 0
  + idx_wallet index for fast lookups

transactions (NEW):
  - id (PK)
  - donor_id (FK to users)
  - hospital_id (FK to users)
  - amount DECIMAL(10,2)
  - status ENUM('pending','completed')
  - token VARCHAR(255) UNIQUE (32-char random hex)
  - metadata JSON
  - created_at TIMESTAMP
  - completed_at TIMESTAMP NULL
  - 5 indexes for performance

transaction_logs (NEW):
  - id (PK)
  - transaction_id (FK)
  - action VARCHAR(50)
  - old_status, new_status VARCHAR(50)
  - details JSON
  - logged_at TIMESTAMP
  - Audit trail for all changes
```

## 🧪 Testing the System

### Test 1: Check Wallet Balance (No Auth)
```bash
curl -X GET http://localhost:8500/api/wallet/balance
# Expected: { "success": false, "message": "Not authenticated" }
```

### Test 2: Check Wallet Balance (With Auth - After Login)
```bash
# First, login as a donor to get session
# Then in browser console:
fetch('/api/wallet/balance')
  .then(r => r.json())
  .then(console.log)
# Expected: { "success": true, "balance": 0 }
```

### Test 3: Create Transaction (Requires Auth)
```javascript
// In browser console, logged in as donor:
fetch('/api/create-transaction', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount: 50, hospital_id: 1 })
})
.then(r => r.json())
.then(data => {
  console.log('Transaction:', data);
  console.log('QR URL:', data.qrUrl);
  // Token should be 32 characters: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
})
```

### Test 4: Verify Transaction (No Auth - Hospital Scanning)
```bash
# Get token from test 3, then open in browser:
http://localhost:8500/api/verify/[TOKEN]
# Expected: HTML page with ✅ Donation Verified! message
```

### Test 5: Check Transaction Status
```javascript
// After creating transaction (test 3):
fetch('/api/transaction/[TOKEN]')
  .then(r => r.json())
  .then(console.log)
# Expected response:
# { "success": true, "status": "pending|completed", "amount": 50, ... }
```

### Test 6: Wallet Lock System
1. Reset donor wallet_balance to 0 in database:
   ```sql
   UPDATE donors SET wallet_balance = 0 WHERE donor_id = 1;
   ```

2. Refresh donor dashboard
   - Overlay should appear with 🔒 Wallet Locked
   - "Donate blood to unlock wallet features"

3. Set wallet_balance > 0:
   ```sql
   UPDATE donors SET wallet_balance = 100 WHERE donor_id = 1;
   ```

4. Refresh page
   - Overlay should disappear
   - Wallet balance displays in header

### Test 7: Full QR Flow (Manual)
1. **Setup:**
   - Login as Donor in one browser window
   - Open another window with QR scanner or `http://localhost:8500/api/verify/[TOKEN]`

2. **Steps:**
   - Click "Donate" button (if implemented on dashboard)
   - JavaScript calls `initiateTransaction(50, 1)`
   - QR modal opens with QR code
   - Backend console shows: `💳 Create transaction endpoint called...`
   - Frontend console shows: `📲 Generating QR code...`

3. **Hospital Scanning:**
   - Visit the URL shown in QR modal
   - Or scan actual QR code with phone
   - Server receives GET `/api/verify/[TOKEN]`
   - Database transaction executes atomically:
     - BEGIN TRANSACTION
     - Update status to 'completed'
     - Add amount to donor wallet_balance
     - COMMIT
   - Shows ✅ Donation Verified! page

4. **Donor Side:**
   - Frontend detects status change via polling
   - QR modal closes automatically
   - Wallet balance refreshes
   - Success notification displays

## 🔍 Debugging Tips

### View Server Logs
Terminal running server shows:
```
💳 Create transaction endpoint called
🔐 Generated token: a1b2c3d4...
📊 Connected to database
✅ Transaction created with ID: 123
🙋 Verify transaction endpoint called
🔑 Token: a1b2c3d4...
🔒 Transaction started
📋 Transaction found: { id: 1, donor_id: 1, ... }
✅ Transaction status updated to completed
💰 Donor wallet updated with amount: 50
✅ Transaction committed successfully
```

### View Browser Console (F12)
Shows progress as functions execute:
```
🔒 Checking wallet lock status...
✅ Wallet is unlocked (balance = 150)
💳 Initiating transaction: { amount: 50, hospitalId: 1 }
✅ Transaction created: { token: "a1b2...", ... }
📲 Generating QR code for token: a1b2...
🎨 Rendering QR code canvas
🔄 Starting transaction status poll for: a1b2...
✅ Transaction verified!
✅ Donation verified! Wallet updated.
```

### Database Verification
```sql
-- Check if schema was created
SHOW TABLES LIKE 'transaction%';

-- Check latest transactions
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 5;

-- Check wallet balance
SELECT donor_id, wallet_balance FROM donors ORDER BY wallet_balance DESC LIMIT 10;

-- Check audit logs
SELECT * FROM transaction_logs ORDER BY logged_at DESC LIMIT 10;

-- Verify token format
SELECT token, status, created_at FROM transactions;
# Tokens should be 32 lowercase hex characters
```

## ⚙️ Configuration

### Environment Variables (Optional)
```bash
# For QR codes to work with remote scanning, set base URL:
set QR_BASE_URL=http://192.168.1.100:8500
# Then restart server

# Default is: window.location.origin (current hostname)
```

### Database Connection
Edit `backend/routes/qr-transactions.js` line 11:
```javascript
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',  // Change if needed
  database: 'lifelink'
};
```

## 📱 Integration Points

### Where to Call Functions

**On Donor Dashboard Load:**
```javascript
checkWalletLock();  // Show lock if balance = 0
getWalletBalance(); // Display balance in header
```

**When Donate Button Clicked:**
```javascript
initiateTransaction(amount, hospitalId);
// Returns: true if QR modal opened, false otherwise
```

**For Real-time Balance Updates:**
```javascript
// Call every 30 seconds or after significant events
getWalletBalance().then(balance => {
  document.getElementById('wallet-balance').textContent = `Balance: ${balance} points`;
});
```

## 🚀 Production Checklist

- [ ] Test all 4 API endpoints
- [ ] Verify atomic transactions work
- [ ] Test wallet lock overlay
- [ ] Verify QR code generation
- [ ] Test hospital scanning flow
- [ ] Check error handling
- [ ] Verify token uniqueness (no collisions)
- [ ] Set correct QR_BASE_URL for production IP
- [ ] Configure HTTPS/SSL for production
- [ ] Monitor transaction_logs for anomalies
- [ ] Setup database backups
- [ ] Document any custom configurations

## 📞 Support

**Common Issues:**

1. **QR Code Not Showing**
   - Check browser console for errors
   - Verify CDN link to QRCode.js is working
   - Check internet connection for CDN access

2. **Wallet Not Locking**
   - Verify wallet_balance column exists: 
     ```sql
     DESCRIBE donors; # Look for wallet_balance row
     ```
   - Clear browser cache and reload

3. **Transaction Not Completing**
   - Check database transaction logs for errors
   - Verify hospital visited correct URL
   - Check token wasn't used twice

4. **Authentication Issues**
   - Verify session is active (check session cookie)
   - Login again if session expired
   - Check browser console for errors

---

**Status:** ✅ Ready for Testing
**Last Updated:** April 7, 2026
