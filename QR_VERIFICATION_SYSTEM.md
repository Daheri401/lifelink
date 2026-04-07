# LifeLink Transactional QR Verification System - Implementation Guide

## Overview

The Transactional QR Verification System enables donors to earn wallet balance through donations and hospitals to verify donations using QR codes. The system uses atomic database transactions to ensure data integrity.

## System Architecture

### 1. Database Schema

**Tables Created:**
- `transactions` - Stores pending and completed donations
- `transaction_logs` - Audit trail for all transaction state changes
- `donors.wallet_balance` - New column to track donor rewards

**Key Features:**
- ACID compliance with MySQL transactions
- UNIQUE token constraint prevents duplicate scanning
- JSON metadata storage for flexible data
- Timestamps for audit trailing
- Foreign key relationships for data integrity

## API Endpoints

### 1. Create Transaction
**Endpoint:** `POST /api/create-transaction`

**Purpose:** Initiate a donation and generate a transaction token

**Request Body:**
```json
{
  "amount": 50,
  "hospital_id": 123,
  "metadata": {
    "blood_type": "O+",
    "units": 1
  }
}
```

**Response:**
```json
{
  "success": true,
  "transaction_id": 1,
  "token": "a1b2c3d4e5f6...",  // 32-char hex token
  "qrUrl": "http://localhost:8500/api/verify/a1b2c3d4e5f6...",
  "amount": 50
}
```

**Features:**
- Generates cryptographically secure 32-character hex token
- Creates transaction in `pending` status
- Logs creation in `transaction_logs` table
- Returns QR-encodable URL for hospital scanning

### 2. Verify Transaction
**Endpoint:** `GET /api/verify/:token`

**Purpose:** Verify donation and atomically update wallet when hospital scans QR

**Response:** Styled HTML page with success/error message

**Transaction Flow (Atomic):**
1. BEGIN TRANSACTION
2. Find transaction by token (with FOR UPDATE lock)
3. Check if already completed (prevent double-spending)
4. Update status to 'completed' + timestamp
5. Update donor.wallet_balance += amount
6. Log verification in transaction_logs
7. COMMIT (or ROLLBACK on error)

**Success Response:** Green styled HTML with:
- ✅ Donation Verified!
- Amount credited amount
- Updated wallet balance
- Auto-close or manual close button

**Error Response:** Red styled HTML with error details

### 3. Get Transaction Status
**Endpoint:** `GET /api/transaction/:token`

**Purpose:** Check if transaction has been verified

**Response:**
```json
{
  "success": true,
  "status": "pending|completed",
  "amount": 50,
  "created_at": "2026-04-07T...",
  "completed_at": "2026-04-07T..." or null
}
```

**Frontend Use:** Poll this endpoint to detect when hospital has scanned QR

### 4. Get Wallet Balance
**Endpoint:** `GET /api/wallet/balance`

**Purpose:** Retrieve current donor wallet balance

**Response:**
```json
{
  "success": true,
  "balance": 150
}
```

**Frontend Use:** Display balance in header, check if wallet is locked

## Frontend Implementation

### JavaScript Functions

#### 1. `getWalletBalance()`
- Fetches current wallet balance
- Returns balance or 0 if not authenticated
- Used to check wallet status

#### 2. `checkWalletLock()`
- Queries wallet balance
- If balance = 0: applies wallet lock overlay
- If balance > 0: removes wallet lock
- Shows "Donate to Unlock" message when locked
- Called on page load and after verification

#### 3. `initiateTransaction(amount, hospitalId)`
- Validates inputs and wallet status
- Calls `/api/create-transaction` endpoint
- Generates QR code with token
- Returns success/failure

#### 4. `generateQRCode(token, amount)`
- Uses QRCode.js library
- Creates modal for QR display
- Shows transaction details
- Starts polling for verification

#### 5. `pollTransactionStatus(token)`
- Polls `/api/transaction/:token` every 1 second
- Detects when hospital scans QR
- Auto-closes modal on verification
- Refreshes wallet balance
- Shows success notification
- Timeout after 2 minutes

### CSS Classes

#### Modal Styles
```css
.qr-modal              /* Fixed overlay container */
.qr-modal-content      /* Centered modal box */
.qr-container          /* QR code canvas container */
.qr-details            /* Transaction details display */
.qr-instructions       /* User instructions */
```

#### Wallet Lock Styles
```css
.wallet-overlay        /* Lock overlay when balance = 0 */
.wallet-lock-message   /* 🔒 Wallet Locked message */
.wallet-locked         /* Applied to donation elements (blur) */
#wallet-balance        /* Balance display in header */
```

## Integration with Existing System

### Modified Files

1. **backend/server.js**
   - Added `qrTransactionRoutes` import
   - Registered routes with `app.use('/', qrTransactionRoutes)`

2. **backend/routes/qr-transactions.js** (NEW)
   - All 4 API endpoints
   - Atomic transaction handling
   - HTML response generators

3. **js/script.js** (ADDED)
   - 8 new functions for QR system
   - Wallet balance checking
   - QR generation and polling
   - 300+ lines of code

4. **css/styles.css** (ADDED)
   - QR modal styles
   - Wallet lock overlay styles
   - Transaction status badges
   - 150+ lines of CSS

5. **pages/donor-dashboard.html**
   - Added wallet balance display in header
   - Added `checkWalletLock()` call in DOMContentLoaded

6. **pages/wallet.html**
   - Added `checkWalletLock()` call in DOMContentLoaded

### Database Files

1. **backend/database/qr-transactions-setup.sql**
   - CREATE TABLE transactions (8 columns, 5 indexes)
   - CREATE TABLE transaction_logs (6 columns, 2 indexes)
   - ALTER TABLE donors ADD COLUMN wallet_balance

2. **backend/migrate-qr-transactions.js**
   - Executes SQL migration
   - Verifies schema creation
   - Reports status with colored output

## Usage Flow

### Donor Perspective

1. **Dashboard Load**
   - `checkWalletLock()` is called
   - If balance = 0, overlay appears with "Donate to Unlock"
   - Wallet balance displays in header

2. **Initiate Donation**
   - Donor clicks "Donate" button
   - Calls `initiateTransaction(amount, hospitalId)`
   - Server creates transaction with unique token
   - QR modal opens showing QR code

3. **QR Display**
   - Modal shows:
     - QR code image (200x200)
     - "Ask hospital to scan" instruction
     - Transaction amount and status
   - Polling starts in background

4. **Verification**
   - Hospital staff scans QR code
   - QR URL: `http://[IP]:8500/api/verify/[TOKEN]`
   - Hospital sees success page with wallet update
   - Frontend detects completion via polling
   - Modal closes automatically
   - Wallet balance refreshes
   - Success notification shown

### Hospital Perspective

1. **Scanning QR Code**
   - Staff uses QR scanner or phone camera
   - Navigates to verification URL
   - Server executes atomic transaction

2. **Verification Success**
   - Receives styled HTML confirmation
   - Shows amount, new balance, timestamp
   - Can close window or auto-closes after 5 seconds

3. **Error Handling**
   - Already verified: Shows error message
   - Invalid token: Shows error message
   - System preserves data integrity

## Security Features

1. **Token Generation**
   - `crypto.randomBytes(16).toString('hex')` = 32 random characters
   - UNIQUE constraint prevents duplicates
   - Cannot be guessed or predicted

2. **Double-Spending Prevention**
   - FOR UPDATE lock during verification
   - Status check prevents re-verification
   - Atomic commit ensures atomicity

3. **Access Control**
   - `/api/create-transaction` requires authentication (session.userId)
   - `/api/verify/:token` is public (hospital scanning)
   - `/api/wallet/balance` requires authentication

4. **Database Integrity**
   - Foreign keys to users table
   - ENUM type for status enforcement
   - Timestams for audit trail
   - JSON metadata for flexibility

## Testing the System

### API Testing (cURL or Postman)

```bash
# 1. Create transaction (as authenticated donor)
POST /api/create-transaction
{
  "amount": 50,
  "hospital_id": 1
}

# 2. Verify transaction (hospital scanning)
GET /api/verify/[TOKEN]
# Opens in browser, shows success/error

# 3. Check status
GET /api/transaction/[TOKEN]

# 4. Get balance (as authenticated donor)
GET /api/wallet/balance
```

### Manual Testing in Frontend

1. Login as donor
2. Navigate to dashboard
3. Open Console (F12)
4. Test wallet functions:
   ```javascript
   // Check balance
   getWalletBalance().then(balance => console.log(balance))
   
   // Create transaction
   initiateTransaction(50, 1)
   
   // Poll status
   pollTransactionStatus('token-hex-here')
   ```

## Configuration

### Database Connection
Edit `backend/routes/qr-transactions.js`:
```javascript
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'lifelink'
};
```

### QR Base URL
The system uses `window.location.origin` for QR URLs.
For remote access, set environment variable:
```bash
QR_BASE_URL=http://YOUR_IP:8500
```

## Monitoring & Debugging

### Server Console Output
```
💳 Create transaction endpoint called
🔐 Generated token: abc123...
📊 Connected to database
✅ Transaction created with ID: 123
```

### Browser Console (F12)
```
🔒 Checking wallet lock status...
✅ Wallet is unlocked (balance = 150)
💳 Initiating transaction: { amount: 50, hospitalId: 1 }
📲 Generating QR code for token: abc123...
🔄 Starting transaction status poll for: abc123...
```

### Database Verification
```sql
-- Check transactions
SELECT * FROM transactions ORDER BY created_at DESC;

-- Check logs
SELECT * FROM transaction_logs ORDER BY logged_at DESC;

-- Check donor balance
SELECT wallet_balance FROM donors WHERE donor_id = 1;
```

## Error Handling

### Common Issues

1. **QR Code Not Displaying**
   - Check if QRCode.js CDN is accessible
   - Verify browser console for errors

2. **Transaction Not Verifying**
   - Check if hospital clicked correct QR URL
   - Verify database connection
   - Check token format (should be 32 chars)

3. **Wallet Not Updating**
   - Verify donation doesn't exceed limits
   - Check database transaction logs
   - Ensure hospital verification was successful

## Future Enhancements

1. **Reward Multipliers**
   - Different point values for different blood types
   - Seasonal bonuses

2. **Recurring Donations**
   - Auto-generate QR codes for frequent donors
   - Subscription-based scheduling

3. **Leaderboards**
   - Top donors
   - Donation milestones
   - Public recognition

4. **Advanced Analytics**
   - Donation patterns
   - Peak donation times
   - Hospital demand prediction

5. **Mobile App Integration**
   - Native QR scanning
   - Push notifications
   - Offline mode

## Maintenance

### Regular Tasks

1. **Monitor transaction_logs**
   - Archive old entries to separate table
   - Detect anomalies/fraud patterns

2. **Verify token uniqueness**
   - Regular integrity checks
   - Ensure no duplicates

3. **Backup strategy**
   - Daily backup of transactions table
   - Point-in-time recovery capability

4. **Performance tuning**
   - Index usage monitoring
   - Query optimization
   - Connection pooling review

---

**Implementation Date:** April 7, 2026
**Status:** ✅ Production Ready
**Version:** 1.0.0
