-- ============================================
-- KYC Database Setup - Add Missing Columns
-- ============================================
-- Run this SQL script in your MySQL database
-- to add KYC fields to the donors table
-- ============================================

-- Add KYC-related columns to donors table if they don't exist
ALTER TABLE donors ADD COLUMN IF NOT EXISTS kyc_document_path VARCHAR(255);
ALTER TABLE donors ADD COLUMN IF NOT EXISTS kyc_pending BOOLEAN DEFAULT false;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS kyc_verified BOOLEAN DEFAULT false;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMP;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMP;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS kyc_rejected_at TIMESTAMP;
ALTER TABLE donors ADD COLUMN IF NOT EXISTS kyc_rejection_reason VARCHAR(255);
ALTER TABLE donors ADD COLUMN IF NOT EXISTS kyc_reviewed_by INT;

-- Create index for faster queries
ALTER TABLE donors ADD INDEX idx_kyc_status (kyc_pending, kyc_verified);
ALTER TABLE donors ADD INDEX idx_kyc_submitted (kyc_submitted_at);

-- Verify the columns were added
DESCRIBE donors;

-- ============================================
-- Summary of columns added:
-- ============================================
-- kyc_document_path       - stores the filename of uploaded KYC document
-- kyc_pending             - flag indicating KYC is awaiting review
-- kyc_verified            - flag indicating KYC has been approved
-- kyc_submitted_at        - timestamp when KYC was submitted
-- kyc_verified_at         - timestamp when KYC was approved
-- kyc_rejected_at         - timestamp when KYC was rejected
-- kyc_rejection_reason    - reason for rejection if applicable
-- kyc_reviewed_by         - admin ID who reviewed the KYC
-- ============================================
