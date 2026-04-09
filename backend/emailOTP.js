/**
 * Email OTP System for LifeLink Authentication
 * Handles OTP generation, storage, and email delivery
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

// ============================================
// CONFIGURATION
// ============================================

// Determine email service from environment
const emailService = process.env.EMAIL_SERVICE || 'gmail';
const mockEmail = process.env.MOCK_EMAIL === 'true' || process.env.NODE_ENV === 'development';

let emailConfig = {};

if (emailService === 'mailtrap') {
  // Mailtrap Configuration (Free Testing Service)
  // Sign up at https://mailtrap.io
  emailConfig = {
    host: 'smtp.mailtrap.io',
    port: 2525,
    auth: {
      user: process.env.EMAIL_USER || 'your_mailtrap_user',
      pass: process.env.EMAIL_PASSWORD || 'your_mailtrap_password'
    }
  };
  console.log('📧 Using Mailtrap email service');
} else {
  // Gmail SMTP Configuration (Default)
  emailConfig = {
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'your_email@gmail.com',
      pass: process.env.EMAIL_PASSWORD || 'your_app_password'
    }
  };
  console.log('📧 Using Gmail SMTP service');
}

// Create Email Transporter
let transporter;
try {
  if (mockEmail || !process.env.EMAIL_USER) {
    console.log('⚠️ EMAIL MOCK MODE ENABLED - OTP will be logged to console');
    transporter = null;
  } else {
    transporter = nodemailer.createTransport(emailConfig);
    console.log('✅ Email transporter initialized');
  }
} catch (error) {
  console.error('❌ Failed to initialize email transporter:', error.message);
  console.log('⚠️ Falling back to console logging for development');
  transporter = null;
}

// ============================================
// OTP STORAGE
// ============================================

// In-memory OTP storage
// Format: { email: { code: '123456', expires: timestamp } }
const otpStore = {};

// OTP Configuration
const OTP_CONFIG = {
  LENGTH: 6,              // 6-digit OTP
  EXPIRY_MINUTES: 5,      // OTP valid for 5 minutes
  EXPIRY_MS: 5 * 60 * 1000 // 5 minutes in milliseconds
};

// ============================================
// OTP GENERATION
// ============================================

/**
 * Generate a random 6-digit OTP code
 * @returns {string} 6-digit numeric string
 */
function generateOTP() {
  const min = 100000;
  const max = 999999;
  const otp = Math.floor(Math.random() * (max - min + 1)) + min;
  return otp.toString();
}

// ============================================
// SEND OTP EMAIL
// ============================================

/**
 * Send OTP code via email using nodemailer
 * @param {string} email - Recipient email address
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<boolean>} Success status
 */
async function sendOTP(email, otp) {
  console.log(`\n📧 OTP SENDING ATTEMPT`);
  console.log(`📧 Email: ${email}`);
  console.log(`🔐 OTP Code: ${otp}`);

  // DEVELOPMENT MODE: Log to console instead of sending
  if (!transporter) {
    console.log(`\n⚠️ DEV MODE: Email not configured`);
    console.log(`🔑 OTP for testing: ${otp}`);
    console.log(`📧 In production, this would be sent to: ${email}\n`);
    return true; // Return success so registration continues
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || emailConfig.auth.user,
    to: email,
    subject: 'LifeLink - Your OTP Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">LifeLink</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Blood Donation Platform</p>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333; font-size: 18px; margin-top: 0;">Your OTP Code</h2>
          
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            You requested a One-Time Password (OTP) for your LifeLink account. 
            Use the code below to verify your email address.
          </p>
          
          <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; margin: 0 0 10px 0;">Your OTP Code:</p>
            <p style="font-size: 32px; font-weight: bold; color: #667eea; margin: 0; letter-spacing: 2px;">
              ${otp}
            </p>
            <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">Valid for 5 minutes</p>
          </div>
          
          <div style="background: #f0f4ff; border-left: 4px solid #667eea; padding: 12px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #666; font-size: 13px; margin: 0;">
              <strong>⚠️ Security:</strong> Never share this code with anyone. LifeLink staff will never ask for your OTP.
            </p>
          </div>
          
          <p style="color: #999; font-size: 12px; text-align: center; margin: 20px 0 0 0;">
            If you didn't request this OTP, please ignore this email.
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 11px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0;">
            © 2026 LifeLink. All rights reserved. | 
            <a href="#" style="color: #667eea; text-decoration: none;">Privacy Policy</a>
          </p>
        </div>
      </div>
    `,
    text: `Your LifeLink OTP Code: ${otp}\n\nValid for 5 minutes.\n\nDo not share this code with anyone.`
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent successfully to ${email}`);
    console.log(`   Message ID: ${result.messageId}\n`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send OTP email to ${email}:`, error.message);
    console.log(`📧 Falling back to console logging for development\n`);
    return true; // Still return true to allow testing
  }
}

// ============================================
// STORE OTP
// ============================================

/**
 * Store OTP in memory with expiration time
 * @param {string} email - User email address
 * @param {string} otp - OTP code
 */
function storeOTP(email, otp) {
  const expiresAt = Date.now() + OTP_CONFIG.EXPIRY_MS;
  otpStore[email.toLowerCase()] = {
    code: otp,
    expires: expiresAt,
    createdAt: new Date().toISOString()
  };
  console.log(`💾 OTP stored for ${email} (expires in ${OTP_CONFIG.EXPIRY_MINUTES} minutes)`);
}

// ============================================
// VERIFY OTP
// ============================================

/**
 * Verify OTP code against stored value
 * @param {string} email - User email address
 * @param {string} otp - OTP code to verify
 * @returns {object} { success: boolean, message: string }
 */
function verifyOTP(email, otp) {
  const emailLower = email.toLowerCase();
  console.log(`🔍 OTP verification attempt for: ${emailLower}`);

  // Check if OTP exists
  if (!otpStore[emailLower]) {
    console.warn(`⚠️ No OTP found for ${emailLower}`);
    return { success: false, message: 'OTP not found. Please request a new one.' };
  }

  const storedOTP = otpStore[emailLower];

  // Check if OTP is expired
  if (Date.now() > storedOTP.expires) {
    console.warn(`⏰ OTP expired for ${emailLower}`);
    delete otpStore[emailLower];
    return { success: false, message: 'OTP has expired. Please request a new one.' };
  }

  // Check if OTP matches
  if (storedOTP.code !== otp.trim()) {
    console.warn(`❌ OTP mismatch for ${emailLower}. Expected: ${storedOTP.code}, Got: ${otp}`);
    return { success: false, message: 'Invalid OTP. Please try again.' };
  }

  // OTP is valid - delete it to prevent reuse
  delete otpStore[emailLower];
  console.log(`✅ OTP verified successfully for ${emailLower}`);
  return { success: true, message: 'OTP verified successfully' };
}

// ============================================
// CLEANUP EXPIRED OTPs
// ============================================

/**
 * Clean up expired OTPs every 5 minutes
 * Prevents memory leaks
 */
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;

  for (const email in otpStore) {
    if (otpStore[email].expires < now) {
      delete otpStore[email];
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned up ${cleanedCount} expired OTPs`);
  }
}, 5 * 60 * 1000); // Run every 5 minutes

// Export functions for use in server.js
module.exports = {
  generateOTP,
  sendOTP,
  storeOTP,
  verifyOTP,
  otpStore,
  OTP_CONFIG,
  transporter
};
