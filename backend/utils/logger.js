/**
 * Comprehensive Logging Utility for LifeLink Backend
 * Provides standardized logging for all API endpoints
 */

const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Sanitize sensitive data from request body
 * @param {Object} data - Request body data
 * @returns {Object} Sanitized data
 */
function sanitizeData(data) {
  if (!data) return data;
  
  const sanitized = { ...data };
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  });
  
  return sanitized;
}

/**
 * Format timestamp for logs
 * @returns {string} Formatted timestamp
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Write to log file
 * @param {string} message - Log message
 * @param {string} level - Log level (INFO, ERROR, WARN, DEBUG)
 */
function writeToFile(message, level = 'INFO') {
  const logFile = path.join(logsDir, `app-${new Date().toISOString().split('T')[0]}.log`);
  const timestamp = getTimestamp();
  const logEntry = `[${timestamp}] [${level}] ${message}\n`;
  
  fs.appendFileSync(logFile, logEntry, 'utf8');
}

/**
 * Log incoming request
 * @param {string} endpoint - API endpoint
 * @param {Object} req - Express request object
 */
function logRequestStart(endpoint, req) {
  const sanitizedBody = sanitizeData(req.body);
  const message = `
╔═══════════════════════════════════════════════════════════════
🚀 REQUEST STARTED
├─ Endpoint: ${endpoint}
├─ Method: ${req.method}
├─ Session ID: ${req.session?.userId || 'No session'}
├─ Session Role: ${req.session?.role || 'No role'}
├─ IP: ${req.ip}
├─ User-Agent: ${req.get('user-agent')}
├─ Body: ${JSON.stringify(sanitizedBody)}
└─ Timestamp: ${getTimestamp()}
╚═══════════════════════════════════════════════════════════════`;
  
  console.log(`${colors.cyan}${message}${colors.reset}`);
  writeToFile(`REQUEST_START: ${endpoint} [${req.method}] Session: ${req.session?.userId || 'none'}`, 'INFO');
}

/**
 * Log database operations
 * @param {string} operation - Database operation description
 * @param {string} query - SQL query (optional)
 * @param {Array} params - Query parameters (optional)
 */
function logDatabase(operation, query = '', params = []) {
  const message = `
  ├─ 🗄️  Database Operation: ${operation}
  ├─ Query: ${query}
  └─ Parameters: ${JSON.stringify(params)}`;
  
  console.log(`${colors.blue}${message}${colors.reset}`);
  writeToFile(`DB_OP: ${operation} | Query: ${query}`, 'DEBUG');
}

/**
 * Log validation errors
 * @param {string} field - Field name
 * @param {string} reason - Reason for failure
 */
function logValidationError(field, reason) {
  const message = `  ⚠️  Validation Error: ${field} - ${reason}`;
  console.log(`${colors.yellow}${message}${colors.reset}`);
  writeToFile(`VALIDATION_ERROR: ${field} - ${reason}`, 'WARN');
}

/**
 * Log successful response
 * @param {string} endpoint - API endpoint
 * @param {number} statusCode - HTTP status code
 * @param {Object} responseData - Response data
 * @param {number} duration - Request duration in ms
 */
function logRequestSuccess(endpoint, statusCode, responseData, duration = 0) {
  const message = `
${colors.green}╔═══════════════════════════════════════════════════════════════
✅ REQUEST SUCCESS
├─ Endpoint: ${endpoint}
├─ Status Code: ${statusCode}
├─ Duration: ${duration}ms
├─ Response: ${JSON.stringify(responseData).substring(0, 200)}...
└─ Timestamp: ${getTimestamp()}
╚═══════════════════════════════════════════════════════════════${colors.reset}`;
  
  console.log(message);
  writeToFile(`REQUEST_SUCCESS: ${endpoint} [${statusCode}] Duration: ${duration}ms`, 'INFO');
}

/**
 * Log error response
 * @param {string} endpoint - API endpoint
 * @param {Error} error - Error object
 * @param {number} statusCode - HTTP status code
 * @param {number} duration - Request duration in ms
 */
function logRequestError(endpoint, error, statusCode = 500, duration = 0) {
  const message = `
${colors.red}╔═══════════════════════════════════════════════════════════════
❌ REQUEST ERROR
├─ Endpoint: ${endpoint}
├─ Status Code: ${statusCode}
├─ Error: ${error.message}
├─ Stack: ${error.stack?.split('\n')[1] || 'N/A'}
├─ Duration: ${duration}ms
└─ Timestamp: ${getTimestamp()}
╚═══════════════════════════════════════════════════════════════${colors.reset}`;
  
  console.error(message);
  writeToFile(`REQUEST_ERROR: ${endpoint} [${statusCode}] Error: ${error.message}`, 'ERROR');
}

/**
 * Log authentication check
 * @param {string} endpoint - API endpoint
 * @param {boolean} isAuthenticated - Is user authenticated
 * @param {string} userId - User ID
 * @param {string} role - User role
 */
function logAuthCheck(endpoint, isAuthenticated, userId, role) {
  const status = isAuthenticated ? '✓' : '✗';
  const message = `  ${status} Auth Check: ${isAuthenticated ? 'Authenticated' : 'Not Authenticated'} | User: ${userId} | Role: ${role}`;
  const color = isAuthenticated ? colors.green : colors.red;
  console.log(`${color}${message}${colors.reset}`);
  
  writeToFile(`AUTH_CHECK: ${endpoint} - ${isAuthenticated ? 'PASS' : 'FAIL'} [User: ${userId}, Role: ${role}]`, 'INFO');
}

/**
 * Log data insertion/update
 * @param {string} table - Database table
 * @param {string} action - INSERT, UPDATE, DELETE
 * @param {number} affectedRows - Number of affected rows
 * @param {number|string} recordId - ID of affected record
 */
function logDataOperation(table, action, affectedRows, recordId = null) {
  const message = `  ✓ ${action} on ${table}: ${affectedRows} row(s) affected${recordId ? ` | ID: ${recordId}` : ''}`;
  console.log(`${colors.green}${message}${colors.reset}`);
  writeToFile(`DATA_OP: ${action} ${table} Rows: ${affectedRows} ID: ${recordId || 'N/A'}`, 'DEBUG');
}

/**
 * Log file upload
 * @param {string} filename - Original filename
 * @param {string} savedAs - Saved filename
 * @param {number} size - File size in bytes
 * @param {string} mimetype - File MIME type
 */
function logFileUpload(filename, savedAs, size, mimetype) {
  const message = `  📁 File Upload: ${filename} -> ${savedAs} (${(size / 1024).toFixed(2)}KB) [${mimetype}]`;
  console.log(`${colors.blue}${message}${colors.reset}`);
  writeToFile(`FILE_UPLOAD: ${filename} as ${savedAs} Size: ${size} bytes Type: ${mimetype}`, 'INFO');
}

/**
 * Create a request timer
 * @returns {Object} Object with startTime and getDuration method
 */
function createTimer() {
  const startTime = Date.now();
  return {
    getDuration: () => Date.now() - startTime
  };
}

/**
 * Log database query with results
 * @param {string} description - Query description
 * @param {number} rowsAffected - Number of rows affected
 * @param {Array} results - Query results (optional)
 */
function logQueryResult(description, rowsAffected, results = []) {
  const message = `  📊 Query Result: ${description} - ${rowsAffected} row(s)${results.length > 0 ? ` | Data: ${JSON.stringify(results[0]).substring(0, 150)}...` : ''}`;
  console.log(`${colors.cyan}${message}${colors.reset}`);
  writeToFile(`QUERY_RESULT: ${description} Rows: ${rowsAffected}`, 'DEBUG');
}

/**
 * Export all logging functions
 */
module.exports = {
  logRequestStart,
  logRequestSuccess,
  logRequestError,
  logDatabase,
  logValidationError,
  logAuthCheck,
  logDataOperation,
  logFileUpload,
  logQueryResult,
  sanitizeData,
  getTimestamp,
  createTimer,
  writeToFile,
  colors
};
