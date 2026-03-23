-- QR Verification System Tables
-- Run this script to add QR code verification functionality to LifeLink

-- QR Codes table - stores generated QR codes
CREATE TABLE IF NOT EXISTS qr_codes (
    qr_code_id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(36) UNIQUE NOT NULL, -- UUID
    request_id INT NOT NULL,
    hospital_id INT NOT NULL,
    qr_data LONGTEXT NOT NULL, -- JSON data encoded in QR
    qr_image LONGTEXT, -- Base64 image or reference
    status ENUM('active', 'used', 'expired', 'cancelled') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    used_by_donor INT NULL,
    used_at TIMESTAMP NULL,
    FOREIGN KEY (request_id) REFERENCES blood_requests(request_id) ON DELETE CASCADE,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id) ON DELETE CASCADE,
    FOREIGN KEY (used_by_donor) REFERENCES donors(donor_id) ON DELETE SET NULL,
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_request_id (request_id),
    INDEX idx_hospital_id (hospital_id),
    INDEX idx_status (status)
);

-- Donation Rewards table - tracks rewards issued for donations
CREATE TABLE IF NOT EXISTS donation_rewards (
    reward_id INT AUTO_INCREMENT PRIMARY KEY,
    donation_id INT NOT NULL,
    donor_id INT NOT NULL,
    hospital_id INT NOT NULL,
    amount INT DEFAULT 500, -- in XAF
    status ENUM('pending', 'issued', 'redeemed', 'cancelled') DEFAULT 'pending',
    issued_at TIMESTAMP NULL,
    redeemed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donation_id) REFERENCES donations(donation_id) ON DELETE CASCADE,
    FOREIGN KEY (donor_id) REFERENCES donors(donor_id) ON DELETE CASCADE,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id) ON DELETE CASCADE,
    INDEX idx_donation_id (donation_id),
    INDEX idx_donor_id (donor_id),
    INDEX idx_status (status)
);

-- Add QR-related fields to donations table if they don't exist
-- ALTER TABLE donations ADD COLUMN qr_code VARCHAR(255) NULL AFTER status; -- Already exists
-- ALTER TABLE donations ADD COLUMN verified_at TIMESTAMP NULL DEFAULT NULL;
-- ALTER TABLE donations ADD INDEX idx_verified_at (verified_at);

-- Transaction Log table - audit trail for QR verification
CREATE TABLE IF NOT EXISTS qr_transaction_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(36) NOT NULL,
    donor_id INT,
    hospital_id INT,
    action VARCHAR(50), -- 'generated', 'scanned', 'verified', 'rewarded'
    details LONGTEXT,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donor_id) REFERENCES donors(donor_id) ON DELETE SET NULL,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id) ON DELETE SET NULL,
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_action (action),
    INDEX idx_timestamp (timestamp)
);

-- Donation Verification Status table - detailed tracking
CREATE TABLE IF NOT EXISTS donation_verification_status (
    verification_id INT AUTO_INCREMENT PRIMARY KEY,
    donation_id INT NOT NULL,
    request_id INT NOT NULL,
    donor_id INT NOT NULL,
    hospital_id INT NOT NULL,
    qr_generated_at TIMESTAMP NULL,
    qr_scanned_at TIMESTAMP NULL,
    donation_verified_at TIMESTAMP NULL,
    reward_issued_at TIMESTAMP NULL,
    current_status ENUM('pending', 'qr_generated', 'qr_scanned', 'verified', 'rewarded', 'cancelled') DEFAULT 'pending',
    completion_percentage INT DEFAULT 0, -- 0, 25, 50, 75, 100
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donation_id) REFERENCES donations(donation_id) ON DELETE CASCADE,
    FOREIGN KEY (request_id) REFERENCES blood_requests(request_id) ON DELETE CASCADE,
    FOREIGN KEY (donor_id) REFERENCES donors(donor_id) ON DELETE CASCADE,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id) ON DELETE CASCADE,
    UNIQUE KEY unique_donation (donation_id),
    INDEX idx_status (current_status),
    INDEX idx_hospital_id (hospital_id)
);
