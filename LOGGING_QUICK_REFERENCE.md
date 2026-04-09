# Comprehensive Logging Implementation - Quick Reference

## What Was Added

### 1. Logger Module (`backend/utils/logger.js`)
A complete logging utility with 12 functions for standardized logging across the application.

**Key Functions:**
- `logRequestStart()` - Log incoming requests
- `logRequestSuccess()` - Log successful responses
- `logRequestError()` - Log errors with stack traces
- `logDatabase()` - Log database operations
- `logValidationError()` - Log validation failures
- `logAuthCheck()` - Log auth/role checks
- `logDataOperation()` - Log INSERT/UPDATE/DELETE
- `logFileUpload()` - Log file uploads
- `logQueryResult()` - Log query results
- `sanitizeData()` - Redact sensitive info
- `createTimer()` - Measure request duration

### 2. Server Integration (`backend/server.js`)
Enhanced ALL 16 POST endpoints with comprehensive logging:

**Authentication (5 endpoints)**
- ✅ POST /api/register/donor
- ✅ POST /api/register/hospital
- ✅ POST /api/login/donor
- ✅ POST /api/login/hospital
- ✅ POST /api/logout

**Blood Requests (3 endpoints)**
- ✅ POST /api/requests (create)
- ✅ POST /api/requests/:id/complete
- ✅ POST /api/requests/:id/respond

**KYC/Verification (2 endpoints)**
- ✅ POST /api/hospital/kyc/submit (with file upload logging)
- ✅ POST /api/admin/hospitals/:id/kyc-review

**Donations (2 endpoints)**
- ✅ POST /api/donations/checkin
- ✅ POST /api/verify-donor-qr

**Account Verification (1 endpoint)**
- ✅ POST /api/verify

**OTP System (3 endpoints)**
- ✅ POST /api/send-otp
- ✅ POST /api/verify-otp
- ✅ POST /api/resend-otp

## Logging Features

### 📊 Detailed Request Information
```
🚀 REQUEST STARTED
├─ Endpoint: /api/login/donor
├─ Method: POST
├─ Session ID: 42
├─ Session Role: donor
├─ IP: 192.168.1.1
├─ User-Agent: Mozilla/5.0...
├─ Body: {...sanitized...}
└─ Timestamp: 2024-01-15T10:30:45.123Z
```

### 🔐 Security Features
- ✅ Automatic password redaction
- ✅ Token redaction
- ✅ Email masking (john@***...com)
- ✅ OTP masking (****56)
- ✅ Sensitive field filtering

### 📈 Database Logging
- ✅ SQL query logging
- ✅ Parameter logging
- ✅ Row-affected tracking
- ✅ Query result summaries

### 🎨 Color-Coded Output
- 🟢 Green = Success, data operations
- 🔴 Red = Errors
- 🟡 Yellow = Warnings, validation errors
- 🔵 Cyan = Database operations
- ⚪ White = Info messages

### ⏱️ Performance Tracking
Each request includes duration:
```
Duration: 234ms
```

### 📝 Persistent Logging
Daily log files in `backend/logs/app-YYYY-MM-DD.log`

## Usage Example

```javascript
// In a POST endpoint
app.post('/api/example', async (req, res) => {
  let connection;
  const timer = createTimer();
  const endpoint = '/api/example';
  
  try {
    logRequestStart(endpoint, req);
    
    // Validate input
    if (!req.body.requiredField) {
      logValidationError('requiredField', 'Required field missing');
      return res.status(400).json({ success: false });
    }
    
    // Database operation
    connection = await getConnection();
    logDatabase('SELECT', 'SELECT * FROM users WHERE id = ?', [userId]);
    
    const [results] = await connection.query(...);
    logQueryResult('SELECT users', results.length, results);
    
    // Data operation
    const [result] = await connection.execute(...);
    logDataOperation('users', 'INSERT', result.affectedRows, result.insertId);
    
    // Success response
    const response = { success: true, data: results };
    logRequestSuccess(endpoint, 200, response, timer.getDuration());
    res.json(response);
    
  } catch (error) {
    logRequestError(endpoint, error, 500, timer.getDuration());
    if (connection) await connection.end();
    res.status(500).json({ success: false, message: error.message });
  }
});
```

## File Structure

```
LIFELINK-FINAL/
├── backend/
│   ├── server.js (UPDATED - All POST endpoints enhanced)
│   ├── utils/
│   │   └── logger.js (NEW - Logging utility)
│   └── logs/ (AUTO-CREATED - Daily log files)
├── LOGGING_SYSTEM.md (NEW - Full documentation)
└── LOGGING_QUICK_REFERENCE.md (this file)
```

## Log File Locations

- **Console Output**: Real-time colored output to terminal
- **File Output**: `backend/logs/app-2024-01-15.log` (daily)

## Monitoring Tips

### 1. Real-Time Monitoring
```bash
# Watch server output in real-time
node backend/server.js
```

### 2. Check Daily Logs
```bash
# View today's logs
cat backend/logs/app-$(date +%Y-%m-%d).log

# Search for errors
grep "❌ ERROR" backend/logs/app-*.log

# Filter by endpoint
grep "/api/login/donor" backend/logs/app-*.log
```

### 3. Monitor Performance
```bash
# Find slow requests (>1000ms)
grep "Duration: [1-9][0-9][0-9][0-9]" backend/logs/app-*.log
```

### 4. Track Database Operations
```bash
# View all database operations
grep "Database Operation" backend/logs/app-*.log
```

## Key Improvements

✅ **Debugging** - Instantly see what's happening with each request
✅ **Security** - Sensitive data automatically redacted
✅ **Performance** - Track request duration and bottlenecks
✅ **Monitoring** - Permanent log files for auditing
✅ **Consistency** - Standardized logging across all endpoints
✅ **Detail** - Full context for each operation
✅ **Visibility** - Color-coded console output

## Next Steps

1. **Start the server** to see logging in action
2. **Test endpoints** - Make POST requests to see detailed logs
3. **Review logs** - Check `backend/logs/` for persistent records
4. **Monitor performance** - Identify slow endpoints by duration
5. **Audit security** - Verify sensitive data is redacted

## Troubleshooting

**Issue**: No logs appearing
- ✓ Verify logs/ directory exists
- ✓ Check file permissions
- ✓ Restart the server

**Issue**: Too much logging
- ✓ This is normal and useful for debugging
- ✓ Filter logs by endpoint as needed
- ✓ Archive old log files periodically

**Issue**: Sensitive data in logs
- ✓ Add field to `sensitiveFields` array in logger.js
- ✓ Test the change
- ✓ Old logs are still unaffected
