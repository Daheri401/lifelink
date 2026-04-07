-- KYC Database Setup for PICK N DROP - SIMPLIFIED VERSION
-- This file contains the SQL queries to create the necessary tables for KYC verification

-- Database: pick_n_drop

-- 1. First, let's check if the users table exists and create it if needed
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    user_type ENUM('customer', 'driver', 'shipper', 'transporter') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Update the users table to add KYC-related columns (if they don't exist)
-- Note: Using simple approach without IF NOT EXISTS for better compatibility
ALTER TABLE users 
ADD COLUMN kyc_status VARCHAR(20) DEFAULT 'none',
ADD COLUMN kyc_documents TEXT NULL,
ADD COLUMN kyc_submitted_at TIMESTAMP NULL,
ADD COLUMN kyc_reviewed_at TIMESTAMP NULL,
ADD COLUMN kyc_reviewed_by INT NULL,
ADD COLUMN kyc_rejection_reason TEXT NULL;

-- 3. Create a simple KYC documents table without foreign key constraints
CREATE TABLE IF NOT EXISTS kyc_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size INT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    review_notes TEXT NULL,
    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_document_type (document_type),
    INDEX idx_status (status)
);

-- 4. Create KYC verification history table
CREATE TABLE IF NOT EXISTS kyc_verification_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    performed_by INT NULL,
    notes TEXT NULL,
    documents_snapshot TEXT NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_action_date (action_date)
);

-- 5. Create admin users table
CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    role VARCHAR(50) DEFAULT 'kyc_reviewer',
    permissions TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE KEY unique_admin_user (user_id)
);

-- 6. Create indexes for better performance
CREATE INDEX idx_users_kyc_status ON users(kyc_status);
CREATE INDEX idx_users_kyc_submitted ON users(kyc_submitted_at);
CREATE INDEX idx_kyc_documents_user_status ON kyc_documents(user_id, status);

-- 7. Sample queries for common operations:

-- Get all pending KYC submissions
-- SELECT u.id, u.first_name, u.last_name, u.email, u.kyc_submitted_at, kd.document_type, kd.filename 
-- FROM users u 
-- JOIN kyc_documents kd ON u.id = kd.user_id 
-- WHERE u.kyc_submitted_at IS NOT NULL 
-- ORDER BY u.kyc_submitted_at DESC;

-- Get KYC documents for a specific user
-- SELECT * FROM kyc_documents WHERE user_id = ? ORDER BY document_type;

-- Get KYC verification history for a user
-- SELECT * FROM kyc_verification_history WHERE user_id = ? ORDER BY action_date DESC;

-- Update KYC status (example)
-- UPDATE users SET kyc_status = 'approved', kyc_reviewed_at = NOW(), kyc_reviewed_by = ? WHERE id = ?;

-- Insert KYC verification history (example)
-- INSERT INTO kyc_verification_history (user_id, action, performed_by, notes) VALUES (?, 'approved', ?, 'Documents verified successfully');

-- 8. Create a view for easy KYC status overview
CREATE OR REPLACE VIEW kyc_overview AS
SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.kyc_status,
    u.kyc_submitted_at,
    u.kyc_reviewed_at,
    COUNT(kd.id) as documents_count,
    GROUP_CONCAT(kd.document_type) as document_types
FROM users u
LEFT JOIN kyc_documents kd ON u.id = kd.user_id
GROUP BY u.id, u.first_name, u.last_name, u.email, u.kyc_status, u.kyc_submitted_at, u.kyc_reviewed_at;

-- 9. Insert sample data for testing (optional)
-- INSERT INTO users (email, password_hash, first_name, last_name, user_type) 
-- VALUES ('admin@pickndrop.com', 'hashed_password_here', 'Admin', 'User', 'admin');

-- End of KYC Database Setup
