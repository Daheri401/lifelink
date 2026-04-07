-- LifeLink Database Schema

-- Users table (base for all users)
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('donor', 'hospital', 'admin') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Donors table (extends users)
CREATE TABLE donors (
    donor_id INT PRIMARY KEY,
    blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
    city VARCHAR(100) NOT NULL,
    availability BOOLEAN DEFAULT TRUE,
    kyc_verified BOOLEAN DEFAULT FALSE,
    kyc_pending BOOLEAN DEFAULT FALSE,
    national_id_path VARCHAR(255),
    blood_doc_path VARCHAR(255),
    FOREIGN KEY (donor_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Hospitals table (extends users)
CREATE TABLE hospitals (
    hospital_id INT PRIMARY KEY,
    hospital_name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
    license_number VARCHAR(100),
    registration_number VARCHAR(100),
    registration_date DATE,
    issuing_authority VARCHAR(255),
    hospital_address TEXT,
    contact_person VARCHAR(255),
    license_document_path VARCHAR(255),
    registration_certificate_path VARCHAR(255),
    blood_bank_certification_path VARCHAR(255),
    kyc_submitted_at TIMESTAMP NULL,
    kyc_reviewed_at TIMESTAMP NULL,
    kyc_reviewer_id INT NULL,
    FOREIGN KEY (hospital_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (kyc_reviewer_id) REFERENCES users(user_id)
);

-- Blood Requests table
CREATE TABLE blood_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    hospital_id INT NOT NULL,
    blood_type ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
    units_needed INT NOT NULL,
    urgency_level ENUM('critical', 'urgent', 'routine') NOT NULL,
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('active', 'fulfilled', 'cancelled') DEFAULT 'active',
    notes TEXT,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id) ON DELETE CASCADE
);

-- Donations table
CREATE TABLE donations (
    donation_id INT AUTO_INCREMENT PRIMARY KEY,
    donor_id INT NOT NULL,
    hospital_id INT NOT NULL,
    request_id INT NOT NULL,
    donation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
    qr_code VARCHAR(255), -- For QR verification
    FOREIGN KEY (donor_id) REFERENCES donors(donor_id) ON DELETE CASCADE,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id) ON DELETE CASCADE,
    FOREIGN KEY (request_id) REFERENCES blood_requests(request_id) ON DELETE CASCADE
);

-- Notifications table (optional for tracking)
CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    type ENUM('request', 'response', 'system') DEFAULT 'system',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Donor Wallet table
CREATE TABLE donor_wallet (
    wallet_id INT AUTO_INCREMENT PRIMARY KEY,
    donor_id INT NOT NULL,
    transport_balance INT DEFAULT 0, -- in XAF
    pharmacy_vouchers INT DEFAULT 0,
    lab_vouchers INT DEFAULT 0,
    total_rewards INT DEFAULT 0,
    FOREIGN KEY (donor_id) REFERENCES donors(donor_id) ON DELETE CASCADE
);

-- Incentives/Rewards table
CREATE TABLE incentives (
    incentive_id INT AUTO_INCREMENT PRIMARY KEY,
    donor_id INT NOT NULL,
    incentive_type ENUM('transport', 'pharmacy_voucher', 'lab_voucher', 'other') NOT NULL,
    amount DECIMAL(10,2),
    description VARCHAR(255),
    earned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used BOOLEAN DEFAULT FALSE,
    used_date TIMESTAMP NULL,
    expiry_date DATE,
    FOREIGN KEY (donor_id) REFERENCES donors(donor_id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_blood_requests_hospital ON blood_requests(hospital_id);
CREATE INDEX idx_blood_requests_blood_type ON blood_requests(blood_type);
CREATE INDEX idx_blood_requests_status ON blood_requests(status);
CREATE INDEX idx_donations_donor ON donations(donor_id);
CREATE INDEX idx_donations_request ON donations(request_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);