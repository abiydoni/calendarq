import crypto from 'node:crypto';
import db, { verifyPassword } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'calendarq-secret-key-' + crypto.randomBytes(16).toString('hex');

// Simple, robust, dependency-free token generator (HMAC SHA-256)
export function createToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({
    ...payload,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days validity
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  if (signature !== expectedSignature) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null; // expired
    return payload;
  } catch {
    return null;
  }
}

export function authenticateAdmin(username, password) {
  if (!username || !password) return null;
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (!admin) return null;
  const valid = verifyPassword(password, admin.salt, admin.password_hash);
  if (!valid) return null;
  return { id: admin.id, username: admin.username };
}
