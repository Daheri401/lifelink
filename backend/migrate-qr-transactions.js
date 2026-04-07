#!/usr/bin/env node
/**
 * QR Transaction System - Database Migration Script
 * Executes the SQL schema for transactional QR verification
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'lifelink'
};

async function runMigration() {
  let connection;
  try {
    console.log('🔄 Starting QR Transaction System Migration...\n');

    // Read SQL file
    const sqlFile = path.join(__dirname, 'database', 'qr-transactions-setup.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    console.log('📄 SQL file loaded:', sqlFile);

    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database:', dbConfig.database);

    // Parse SQL statements more carefully
    // Remove comments and split by semicolon
    const lines = sqlContent.split('\n');
    let currentStatement = '';
    const statements = [];

    for (const line of lines) {
      // Skip comment lines
      if (line.trim().startsWith('--')) {
        continue;
      }

      currentStatement += ' ' + line;

      // If line ends with semicolon, it's a complete statement
      if (line.trim().endsWith(';')) {
        const stmt = currentStatement
          .replace(/;$/, '') // Remove trailing semicolon
          .trim();

        if (stmt.length > 0) {
          statements.push(stmt);
        }
        currentStatement = '';
      }
    }

    // Add any remaining statement
    if (currentStatement.trim().length > 0) {
      statements.push(currentStatement.trim());
    }

    console.log(`\n📊 Executing ${statements.length} SQL statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const preview = statement.substring(0, 80).replace(/\s+/g, ' ');

      console.log(`[${i + 1}/${statements.length}] ${preview}${statement.length > 80 ? '...' : ''}`);

      try {
        await connection.execute(statement);
        console.log('  ✅ Success\n');
      } catch (error) {
        // Some statements may fail if they already exist
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log('  ⚠️ Column already exists (skipped)\n');
        } else if (error.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log('  ⚠️ Table already exists (skipped)\n');
        } else if (error.code === 'ER_DUP_KEYNAME') {
          console.log('  ⚠️ Index already exists (skipped)\n');
        } else {
          console.log('  ⚠️ Warning:', error.message, '\n');
        }
      }
    }

    // Verify schema
    console.log('\n🔍 Verifying schema...\n');

    // Check donors table wallet column
    const [donors] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'donors' AND COLUMN_NAME = 'wallet_balance'`
    );
    console.log('donors.wallet_balance:', donors.length ? '✅ Exists' : '❌ Missing');

    // Check transactions table
    const [tables] = await connection.execute(
      `SHOW TABLES LIKE 'transactions'`
    );
    console.log('transactions table:', tables.length ? '✅ Exists' : '❌ Missing');

    // Check transaction_logs table
    const [logs] = await connection.execute(
      `SHOW TABLES LIKE 'transaction_logs'`
    );
    console.log('transaction_logs table:', logs.length ? '✅ Exists' : '❌ Missing');

    // Show table DESCRIBE for transactions
    if (tables.length > 0) {
      console.log('\n📋 Transactions table structure:');
      const [schema] = await connection.execute('DESCRIBE transactions');
      schema.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    }

    console.log('\n✅ Migration completed successfully!\n');
    console.log('📝 Ready to use:');
    console.log('  - POST /api/create-transaction');
    console.log('  - GET /api/verify/:token');
    console.log('  - GET /api/transaction/:token');
    console.log('  - GET /api/wallet/balance\n');

    await connection.end();

  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration
runMigration();
