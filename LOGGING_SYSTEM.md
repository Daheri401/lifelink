# Comprehensive Logging System Documentation

## Overview
A comprehensive logging utility has been integrated into the LifeLink backend server, providing detailed logging for all GET and POST request handlers with structured, easy-to-read output.

## Files Added

### 1. `backend/utils/logger.js`
A centralized logging utility module that provides standardized logging functions and color-coded console output.

## Key Logging Functions

### Request Logging
- **`logRequestStart(endpoint, req)`** - Logs incoming request with:
  - Endpoint path
  - HTTP method
  - Session ID and role
  - Client IP
  - User-Agent
  - Request body (with sensitive data sanitized)
  - Timestamp

### Database Operations
- **`logDatabase(operation, query, params)`** - Logs all database operations
- **`logQueryResult(description, rowsAffected, results)`** - Logs query execution results
- **`logDataOperation(table, action, affectedRows, recordId)`** - Logs INSERT/UPDATE/DELETE operations

### Validation & Authentication
- **`logValidationError(field, reason)`** - Logs validation failures for specific fields
- **`logAuthCheck(endpoint, isAuthenticated, userId, role)`** - Logs authentication/authorization checks

### File Operations
- **`logFileUpload(filename, savedAs, size, mimetype)`** - Logs file upload details

### Response Logging
- **`logRequestSuccess(endpoint, statusCode, responseData, duration)`** - Logs successful responses
- **`logRequestError(endpoint, error, statusCode, duration)`** - Logs error responses with stack traces

## Features

### 1. Colored Console Output
Different colors for different log types:
- 🔵 **Cyan** - Database operations
- 🟢 **Green** - Success messages, data operations
- 🔴 **Red** - Error messages
- 🟡 **Yellow** - Warnings and validation errors

### 2. Request Timing
All requests include timing information:
```javascript
const timer = createTimer();
// ... request handling ...
logRequestSuccess(endpoint, 200, response, timer.getDuration());
```

### 3. Data Sanitization
Sensitive fields are automatically redacted:
- Passwords → `***REDACTED***`
- Tokens → `***REDACTED***`
- API Keys → `***REDACTED***`
- Authorization headers → `***REDACTED***`

### 4. Persistent Logging
All logs are written to daily log files:
- Location: `logs/app-YYYY-MM-DD.log`
- Format: `[ISO_TIMESTAMP] [LEVEL] MESSAGE`
- Automatic directory creation

## POST Endpoints with Enhanced Logging

All 16 POST endpoints now have comprehensive logging:

### Authentication & Registration
1. **POST /api/register/donor** - Donor registration with password hashing logging
2. **POST /api/register/hospital** - Hospital registration with validation details
3. **POST /api/login/donor** - Donor login with credential verification
4. **POST /api/login/hospital** - Hospital login with authorization check
5. **POST /api/logout** - Session destruction logging

### Blood Request Management
6. **POST /api/requests** - Blood request creation with hospital validation
7. **POST /api/requests/:id/complete** - Request completion with authorization check
8. **POST /api/requests/:id/respond** - Donor response handling with detailed action logging

### Hospital KYC Verification
9. **POST /api/hospital/kyc/submit** - File uploads with detailed logging for each document
10. **POST /api/admin/hospitals/:id/kyc-review** - KYC approval/rejection with notification creation

### Donation Management
11. **POST /api/donations/checkin** - Check-in recording with incentive tracking
12. **POST /api/verify-donor-qr** - QR code verification

### Account Verification
13. **POST /api/verify** - Verification code validation

### OTP System
14. **POST /api/send-otp** - OTP generation and email sending
15. **POST /api/verify-otp** - OTP verification with security checks
16. **POST /api/resend-otp** - OTP resending with new generation

## Logging Output Examples

### Successful Request
```
╔═══════════════════════════════════════════════════════════════
🚀 REQUEST STARTED
├─ Endpoint: /api/login/donor
├─ Method: POST
├─ Session ID: None
├─ Session Role: No role
├─ IP: 192.168.1.1
├─ User-Agent: Mozilla/5.0...
├─ Body: {"identifier":"john@example.com","password":"***REDACTED***"}
└─ Timestamp: 2024-01-15T10:30:45.123Z
╚═══════════════════════════════════════════════════════════════

  🔍 Identifier type: Email
  🔐 Identifier: joh***...com
  📧 Querying user from database...
  ✓ Donor found: John Smith
  🔐 Verifying password...
  ✓ Password verified successfully
  📝 Creating session...
  ✓ Session created - User ID: 42, Role: donor

╔═══════════════════════════════════════════════════════════════
✅ REQUEST SUCCESS
├─ Endpoint: /api/login/donor
├─ Status Code: 200
├─ Duration: 234ms
├─ Response: {"success":true,"role":"donor","redirect":"/donor-dashboard"}
└─ Timestamp: 2024-01-15T10:30:45.357Z
╚═══════════════════════════════════════════════════════════════
```

### Validation Error
```
🟡 Validation Error: email - Required field missing
🟡 Validation Error: donor_registration - Missing required fields
```

### Database Operation
```
🟦 Database Operation: SELECT
  ├─ Query: SELECT * FROM blood_requests WHERE request_id = ?
  └─ Parameters: [123]

📊 Query Result: SELECT blood_request - 1 row(s)
  ✓ INSERT on blood_requests: 1 row(s) affected | ID: 456
```

### Error Response
```
❌ REQUEST ERROR
├─ Endpoint: /api/login/hospital
├─ Status Code: 500
├─ Error: Connection refused
├─ Stack: at Server.handle (server.js:789)
├─ Duration: 45ms
└─ Timestamp: 2024-01-15T10:30:45.402Z
╚═══════════════════════════════════════════════════════════════
```

## Log File Structure

Each day creates a new log file with:
- **Filename**: `app-YYYY-MM-DD.log` (e.g., `app-2024-01-15.log`)
- **Location**: `backend/logs/` directory
- **Rotation**: Automatic (new file each day)
- **Content Format**: `[ISO_TIMESTAMP] [LEVEL] MESSAGE`

### Log Levels
- **INFO** - General information (requests, operations)
- **DEBUG** - Detailed debugging information
- **WARN** - Warnings and validation issues
- **ERROR** - Error conditions

## Usage Tips

### 1. Debugging Failed Requests
- Check the colored console output for immediate error details
- Review `app-YYYY-MM-DD.log` for complete request history
- Look for `❌ ERROR` sections with stack traces

### 2. Monitoring Database Operations
- Search for `🗄️  Database Operation` in logs
- Track affected row counts with `✓ INSERT/UPDATE/DELETE`
- Review slow queries by checking `Duration` values

### 3. Performance Analysis
- Each request includes duration in milliseconds
- Search for requests exceeding expected times
- Monitor database query performance

### 4. Security Auditing
- All sensitive data is sanitized in logs
- Track authentication attempts with auth check logs
- Monitor failed login attempts

## Integration Points

The logger is used throughout server.js:
1. **At endpoint start** - `logRequestStart(endpoint, req)`
2. **At validation checks** - `logValidationError(field, reason)`
3. **At database operations** - `logDatabase()` and `logQueryResult()`
4. **At successful operations** - `logDataOperation()` and `logFileUpload()`
5. **At response** - `logRequestSuccess()` or `logRequestError()`

## Best Practices

1. **Always use createTimer()** at the start of POST handlers
2. **Redact sensitive data** before logging (already handled by `sanitizeData()`)
3. **Log database queries** before execution for debugging
4. **Log operation results** with affected row counts
5. **Use appropriate log functions** for different operation types
6. **Include request context** (user ID, role, endpoint)

## Future Enhancements

- Integration with centralized logging service (ELK, Splunk)
- Real-time log streaming for monitoring dashboards
- Automated alerts for error thresholds
- Performance metrics aggregation
- Export utilities for log analysis

## Troubleshooting

If logs aren't appearing:
1. Verify `logs/` directory exists and is writable
2. Check `node` process has file write permissions
3. Verify logger module is correctly imported
4. Check console for import errors

If sensitive data is appearing in logs:
1. Add field name to `sensitiveFields` array in `sanitizeData()`
2. Test with actual request data
3. Verify logs are regenerated after code changes
