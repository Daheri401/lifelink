-- ============================================
-- TRANSACTIONAL QR VERIFICATION SYSTEM
-- Database Setup Script
-- ============================================

-- 1. Add wallet_balance to donors table if it doesn't exist
ALTER TABLE donors ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10, 2) DEFAULT 0;

-- Create an index for faster wallet lookups
ALTER TABLE donors ADD INDEX IF NOT EXISTS idx_wallet (wallet_balance);

-- 2. Create transactions table for QR verification
CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  donor_id INT NOT NULL,
  hospital_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status ENUM('pending', 'completed') DEFAULT 'pending',
  token VARCHAR(255) UNIQUE NOT NULL,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  
  -- Foreign keys
  CONSTRAINT fk_transaction_donor FOREIGN KEY (donor_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_transaction_hospital FOREIGN KEY (hospital_id) REFERENCES users(user_id) ON DELETE CASCADE,
  
  -- Indexes for performance
  INDEX idx_donor_id (donor_id),
  INDEX idx_hospital_id (hospital_id),
  INDEX idx_token (token),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- 3. Create transaction_logs table for audit trail
CREATE TABLE IF NOT EXISTS transaction_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id INT NOT NULL,
  action VARCHAR(50),
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  details JSON,
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_log_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  INDEX idx_transaction_id (transaction_id),
  INDEX idx_logged_at (logged_at)
);

-- Verify tables were created
SHOW TABLES LIKE 'transactions';
SHOW TABLES LIKE 'transaction_logs';

-- Check donors table has wallet_balance
DESCRIBE donors;
