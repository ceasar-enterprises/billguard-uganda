const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

const DB_PATH = path.join(app.getPath('userData'), 'billguard.db');

let db;

function init() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  createTables();
  return db;
}

function getDb() {
  if (!db) init();
  return db;
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('water', 'electricity', 'loan')),
      provider TEXT NOT NULL,
      account_number TEXT NOT NULL,
      nickname TEXT,
      area TEXT,
      meter_number TEXT,
      loan_principal REAL DEFAULT 0,
      loan_interest_rate REAL DEFAULT 0,
      loan_term_months INTEGER DEFAULT 0,
      loan_start_date TEXT,
      loan_lender TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(type, account_number)
    );

    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      due_date TEXT NOT NULL,
      period TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'overdue')),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id INTEGER,
      account_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      method TEXT,
      reference TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE SET NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      triggered INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

module.exports = { init, getDb };
