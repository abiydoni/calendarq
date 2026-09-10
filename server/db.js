import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path.join(dataDir, 'licenses.db');

// Support both node:sqlite (Node 22.5+) and better-sqlite3
let db;
try {
  const { DatabaseSync } = await import('node:sqlite');
  db = new DatabaseSync(dbPath);
} catch {
  const BetterSqlite3 = (await import('better-sqlite3')).default;
  db = new BetterSqlite3(dbPath);
}

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_key TEXT UNIQUE NOT NULL,
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_phone TEXT,
    license_type TEXT NOT NULL DEFAULT 'lifetime',
    status TEXT NOT NULL DEFAULT 'active',
    max_activations INTEGER NOT NULL DEFAULT 2,
    valid_until INTEGER,
    notes TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS activations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_id INTEGER NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
    machine_id TEXT NOT NULL,
    machine_name TEXT,
    os_platform TEXT,
    user_name TEXT,
    user_email TEXT,
    activated_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL,
    UNIQUE(license_id, machine_id)
  );

  CREATE TABLE IF NOT EXISTS app_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    os_platform TEXT,
    machine_name TEXT,
    status TEXT NOT NULL DEFAULT 'trial',
    license_key TEXT,
    registered_at INTEGER NOT NULL,
    last_active_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    package_id TEXT NOT NULL,
    proof_image TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL
  );
`);

// Safe migrations if tables already exist
try { db.exec('ALTER TABLE activations ADD COLUMN user_name TEXT;'); } catch {}
try { db.exec('ALTER TABLE activations ADD COLUMN user_email TEXT;'); } catch {}

// Seed default settings
const defaultSettings = [
  ['admin_email', 'appsbeem@gmail.com'],
  ['bank_name', ''],
  ['bank_account', ''],
  ['bank_owner', ''],
  ['latest_version', '1.0.0'],
  ['update_link', ''],
  ['announcement', ''],
  ['price_annual', '50000'],
  ['price_lifetime', '150000']
];

const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)');
defaultSettings.forEach(([key, val]) => insertSetting.run(key, val));

// Password hashing utility using standard scrypt
export function hashPassword(password, existingSalt = null) {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password, salt, storedHash) {
  const { hash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

// Seed default admin if table is empty
const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get();
if (adminCount.count === 0) {
  const defaultUsername = process.env.ADMIN_USER || 'admin';
  const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const { salt, hash } = hashPassword(defaultPassword);
  db.prepare(`
    INSERT INTO admins (username, salt, password_hash, created_at)
    VALUES (?, ?, ?, ?)
  `).run(defaultUsername, salt, hash, Date.now());
  console.log(`[License Server] Default admin created: username="${defaultUsername}", password="${defaultPassword}"`);
}

export default db;
