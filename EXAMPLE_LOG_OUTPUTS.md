# Example Log Outputs

This document shows actual example log outputs from the comprehensive logging system.

---

## 1. Successful Donor Login

```
╔═══════════════════════════════════════════════════════════════
🚀 REQUEST STARTED
├─ Endpoint: /api/login/donor
├─ Method: POST
├─ Session ID: No session
├─ Session Role: No role
├─ IP: ::1
├─ User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)
├─ Body: {"identifier":"john@example.com","password":"***REDACTED***"}
└─ Timestamp: 2024-01-15T10:30:45.123Z
╚═══════════════════════════════════════════════════════════════

  🔍 Validating login credentials...
  📧 Identifier type: Email
  🔐 Identifier: joh***...com
  📧 Querying user from database...
  🗄️  Database Operation: SELECT
    ├─ Query: SELECT * FROM users WHERE (email = ? OR phone = ?) AND role = "donor"
    └─ Parameters: ["john@example.com","john@example.com"]
  ✓ Donor found: John Smith
  📊 Query Result: SELECT donor by identifier - 1 row(s)
  🔐 Verifying password...
  ✓ Password verified successfully
  📝 Creating session...
  ✓ Auth Check: Authenticated | User: 42 | Role: donor
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

---

## 2. Failed Donor Login (Invalid Credentials)

```
╔═══════════════════════════════════════════════════════════════
🚀 REQUEST STARTED
├─ Endpoint: /api/login/donor
├─ Method: POST
├─ Session ID: No session
├─ Session Role: No role
├─ IP: ::1
├─ User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)
├─ Body: {"identifier":"john@example.com","password":"***REDACTED***"}
└─ Timestamp: 2024-01-15T10:31:12.456Z
╚═══════════════════════════════════════════════════════════════

  🔍 Validating login credentials...
  📧 Identifier type: Email
  🔐 Identifier: joh***...com
  📧 Querying user from database...
  🗄️  Database Operation: SELECT
    ├─ Query: SELECT * FROM users WHERE (email = ? OR phone = ?) AND role = "donor"
    └─ Parameters: ["john@example.com","john@example.com"]
  ❌ No donor found with identifier: john@example.com
  📊 Query Result: SELECT donor by identifier - 0 row(s)

[No error logged - validation caught early]
```

---

## 3. Successful Blood Request Creation

```
╔═══════════════════════════════════════════════════════════════
🚀 REQUEST STARTED
├─ Endpoint: /api/requests
├─ Method: POST
├─ Session ID: 15
├─ Session Role: hospital
├─ IP: ::1
├─ User-Agent: Mozilla/5.0
├─ Body: {
  "bloodType":"O+",
  "unitsNeeded":"5",
  "urgencyLevel":"critical",
  "notes":"Emergency surgery - trauma patient"
}
└─ Timestamp: 2024-01-15T10:45:30.789Z
╚═══════════════════════════════════════════════════════════════

  🏥 Hospital ID: 15
  🩸 Blood Type: O+
  📊 Units Needed: 5
  🚨 Urgency: critical
  📝 Notes: Emergency surgery - trauma patient
  ✓ Auth Check: Authenticated | User: 15 | Role: hospital
  🩸 Blood Type: O+
  📊 Units Needed: 5
  🚨 Urgency: critical
  ✅ All validations passed
  📝 Inserting blood request into database...
  🗄️  Database Operation: INSERT
    ├─ Query: INSERT INTO blood_requests (hospital_id, blood_type, units_needed, urgency_level, notes)
    └─ Parameters: [15,"O+","5","critical","Emergency surgery - trauma patient"]
  ✓ INSERT on blood_requests: 1 row(s) affected | ID: 789

╔═══════════════════════════════════════════════════════════════
✅ REQUEST SUCCESS
├─ Endpoint: /api/requests
├─ Status Code: 200
├─ Duration: 145ms
├─ Response: {"success":true,"message":"Request posted successfully","requestId":789}
└─ Timestamp: 2024-01-15T10:45:30.934Z
╚═══════════════════════════════════════════════════════════════
```

---

## 4. Hospital KYC Submission with File Uploads

```
╔═══════════════════════════════════════════════════════════════
🚀 REQUEST STARTED
├─ Endpoint: /api/hospital/kyc/submit
├─ Method: POST
├─ Session ID: 15
├─ Session Role: hospital
├─ IP: ::1
├─ User-Agent: Mozilla/5.0
├─ Body: {...multipart form data...}
└─ Timestamp: 2024-01-15T11:00:15.321Z
╚═══════════════════════════════════════════════════════════════

🏥 Hospital KYC submit route accessed
User ID: 15
User Role: hospital
✓ Auth Check: Authenticated | User: 15 | Role: hospital
📋 Form data received: {
  licenseNumber: "MED-2023-001",
  registrationNumber: "REG-2023-456",
  registrationDate: "2023-01-15",
  issuingAuthority: "Ministry of Health",
  contactPerson: "Dr. James Osei"
}
📁 Files received: {
  licenseDocument: "1705314015321-a1b2c3.pdf",
  registrationCertificate: "1705314015456-d4e5f6.pdf",
  bloodBankCertification: "1705314015789-g7h8i9.pdf"
}
📁 File Upload: Medical_License.pdf → 1705314015321-a1b2c3.pdf (2854.33KB) [application/pdf]
📁 File Upload: Registration_Cert.pdf → 1705314015456-d4e5f6.pdf (1523.44KB) [application/pdf]
📁 File Upload: BloodBank_Cert.pdf → 1705314015789-g7h8i9.pdf (892.15KB) [application/pdf]
📝 Updating hospital KYC information...
🗄️  Database Operation: UPDATE
  ├─ Query: UPDATE hospitals SET license_number = ?, registration_number = ?, ...
  └─ Parameters: ["MED-2023-001","REG-2023-456","2023-01-15",...]
✓ UPDATE on hospitals: 1 row(s) affected | ID: 15
✅ Hospital KYC submitted successfully

╔═══════════════════════════════════════════════════════════════
✅ REQUEST SUCCESS
├─ Endpoint: /api/hospital/kyc/submit
├─ Status Code: 200
├─ Duration: 1234ms
├─ Response: {"success":true,"message":"KYC documents submitted..."}
└─ Timestamp: 2024-01-15T11:00:16.555Z
╚═══════════════════════════════════════════════════════════════
```

---

## 5. Validation Error - Missing Fields

```
╔═══════════════════════════════════════════════════════════════
🚀 REQUEST STARTED
├─ Endpoint: /api/register/donor
├─ Method: POST
├─ Session ID: No session
├─ Session Role: No role
├─ IP: ::1
├─ User-Agent: Mozilla/5.0
├─ Body: {"full_name":"John Doe","email":"john@example.com"}
└─ Timestamp: 2024-01-15T11:15:40.123Z
╚═══════════════════════════════════════════════════════════════

  🔍 Hashing password for john@example.com...
  ⚠️  Validation Error: user_name - Required field missing
  ⚠️  Validation Error: phone - Required field missing
  ⚠️  Validation Error: password - Required field missing
  ⚠️  Validation Error: location - Required field missing
  ⚠️  Validation Error: donor_registration - Missing required fields

[Early return - validation failed]
```

---

## 6. Donor Responds to Blood Request

```
╔═══════════════════════════════════════════════════════════════
🚀 REQUEST STARTED
├─ Endpoint: /api/requests/:id/respond
├─ Method: POST
├─ Session ID: 42
├─ Session Role: donor
├─ IP: ::1
├─ User-Agent: Mozilla/5.0
├─ Body: {"action":"accept"}
└─ Timestamp: 2024-01-15T11:30:22.456Z
╚═══════════════════════════════════════════════════════════════

  👥 Donor ID: 42
  📋 Request ID: 789
  ⚙️  Action: accept
  ✓ Auth Check: Authenticated | User: 42 | Role: donor
  🔍 Verifying request exists...
  🗄️  Database Operation: SELECT
    ├─ Query: SELECT * FROM blood_requests WHERE request_id = ?
    └─ Parameters: [789]
  ✓ Request exists
  📊 Query Result: SELECT blood_request - 1 row(s) | Data: {...}
  🔍 Checking if donor already responded...
  🗄️  Database Operation: SELECT
    ├─ Query: SELECT * FROM donations WHERE donor_id = ? AND request_id = ?
    └─ Parameters: [42,789]
  ✓ No existing donation found
  📊 Query Result: SELECT existing_donation - 0 row(s)
  ✓ Processing accept action
  📝 Creating donation record...
  🗄️  Database Operation: INSERT
    ├─ Query: INSERT INTO donations (donor_id, hospital_id, request_id)...
    └─ Parameters: [42,789]
  ✓ INSERT on donations: 1 row(s) affected | ID: 456
  ✅ Donation record created: 456

╔═══════════════════════════════════════════════════════════════
✅ REQUEST SUCCESS
├─ Endpoint: /api/requests/:id/respond
├─ Status Code: 200
├─ Duration: 187ms
├─ Response: {"success":true,"message":"Request accepted successfully","donationId":456}
└─ Timestamp: 2024-01-15T11:30:22.643Z
╚═══════════════════════════════════════════════════════════════
```

---

## 7. OTP Sending Success

```
╔═══════════════════════════════════════════════════════════════
🚀 REQUEST STARTED
├─ Endpoint: /api/send-otp
├─ Method: POST
├─ Session ID: No session
├─ Session Role: No role
├─ IP: 192.168.1.100
├─ User-Agent: Mozilla/5.0
├─ Body: {"email":"jane@example.com"}
└─ Timestamp: 2024-01-15T11:45:10.789Z
╚═══════════════════════════════════════════════════════════════

  📧 Email: jan***...com
  🔐 OTP generation succeeded for: jan***...com
  📨 OTP length: 6 digits
  🗄️  Database Operation: OTP
    ├─ Query: OTP generated
    └─ Parameters: ["jane@example.com","***"]
  📬 Sending OTP email...
  ✅ OTP sent and stored for: jan***...com

╔═══════════════════════════════════════════════════════════════
✅ REQUEST SUCCESS
├─ Endpoint: /api/send-otp
├─ Status Code: 200
├─ Duration: 892ms
├─ Response: {"success":true,"message":"OTP sent to your email address"}
└─ Timestamp: 2024-01-15T11:45:11.681Z
╚═══════════════════════════════════════════════════════════════
```

---

## 8. Database Connection Error

```
╔═══════════════════════════════════════════════════════════════
🚀 REQUEST STARTED
├─ Endpoint: /api/hospital/requests
├─ Method: GET
├─ Session ID: 15
├─ Session Role: hospital
├─ IP: ::1
├─ User-Agent: Mozilla/5.0
├─ Body: {}
└─ Timestamp: 2024-01-15T12:00:05.123Z
╚═══════════════════════════════════════════════════════════════

  🏥 Hospital ID: 15
  ✓ Auth Check: Authenticated | User: 15 | Role: hospital
  🔍 Querying hospital requests...

╔═══════════════════════════════════════════════════════════════
❌ REQUEST ERROR
├─ Endpoint: /api/hospital/requests
├─ Status Code: 500
├─ Error: connect ECONNREFUSED 127.0.0.1:3306
├─ Stack: at TCPConnectWrap.afterConnect [as oncomplete]
├─ Duration: 45ms
└─ Timestamp: 2024-01-15T12:00:05.168Z
╚═══════════════════════════════════════════════════════════════
```

---

## 9. Log File Example (backend/logs/app-2024-01-15.log)

```
[2024-01-15T10:30:45.123Z] [INFO] REQUEST_START: /api/login/donor [POST] Session: none
[2024-01-15T10:30:45.234Z] [DEBUG] DB_OP: SELECT | Query: SELECT * FROM users WHERE (email = ? OR phone = ?)
[2024-01-15T10:30:45.357Z] [INFO] REQUEST_SUCCESS: /api/login/donor [200] Duration: 234ms
[2024-01-15T10:45:30.789Z] [INFO] REQUEST_START: /api/requests [POST] Session: 15
[2024-01-15T10:45:30.812Z] [DEBUG] DB_OP: INSERT | Query: INSERT INTO blood_requests
[2024-01-15T10:45:30.934Z] [INFO] REQUEST_SUCCESS: /api/requests [200] Duration: 145ms
[2024-01-15T11:00:15.321Z] [INFO] REQUEST_START: /api/hospital/kyc/submit [POST] Session: 15
[2024-01-15T11:00:16.555Z] [INFO] REQUEST_SUCCESS: /api/hospital/kyc/submit [200] Duration: 1234ms
[2024-01-15T11:15:40.123Z] [INFO] REQUEST_START: /api/register/donor [POST] Session: none
[2024-01-15T11:15:40.145Z] [WARN] VALIDATION_ERROR: donor_registration - Missing required fields
[2024-01-15T12:00:05.123Z] [INFO] REQUEST_START: /api/hospital/requests [GET] Session: 15
[2024-01-15T12:00:05.168Z] [ERROR] REQUEST_ERROR: /api/hospital/requests [500] Error: connect ECONNREFUSED 127.0.0.1:3306
```

---

## Key Observations

1. **Timing**: Notice the Duration field - track slow requests
2. **Sanitization**: Emails show as "jan***...com", passwords as "***REDACTED***"
3. **Hierarchy**: Clear indentation shows request flow
4. **Color Codes**: Console uses colors, log files use text
5. **Context**: Session ID and role always included
6. **Details**: Database queries and parameters are logged
7. **Row Counts**: All INSERT/UPDATE operations show affected rows
8. **Performance**: Each operation duration helps identify bottlenecks

---

## Filtering Logs

```bash
# Find all errors
grep "❌ ERROR" backend/logs/app-*.log

# Find specific endpoint
grep "/api/login/donor" backend/logs/app-*.log

# Find slow requests (>500ms)
grep "Duration: [5-9][0-9][0-9]\|Duration: [0-9]\{4\}" backend/logs/app-*.log

# Find database operations
grep "Database Operation" backend/logs/app-*.log

# Find validation errors
grep "VALIDATION_ERROR" backend/logs/app-*.log

# Find authentication checks
grep "AUTH_CHECK" backend/logs/app-*.log

# Find file uploads
grep "FILE_UPLOAD" backend/logs/app-*.log
```
