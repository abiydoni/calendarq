import crypto from 'node:crypto';
import db, { hashPassword, verifyPassword } from '../db.js';
import { authenticateAdmin, createToken } from '../auth.js';

// Key generator helper: CQ-XXXX-XXXX-XXXX
export function generateKey(prefix = 'CQ') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0, O, 1, I to avoid confusion
  const segment = (len = 4) => {
    let s = '';
    const bytes = crypto.randomBytes(len);
    for (let i = 0; i < len; i++) {
      s += chars[bytes[i] % chars.length];
    }
    return s;
  };
  return `${prefix}-${segment(4)}-${segment(4)}-${segment(4)}`;
}

export function handleAdminLogin(body) {
  const { username, password } = body || {};
  const user = authenticateAdmin(username?.trim(), password?.trim());
  if (!user) {
    return { status: 401, data: { success: false, error: 'Username atau password salah.' } };
  }
  const token = createToken({ id: user.id, username: user.username });
  return { status: 200, data: { success: true, token, username: user.username } };
}

export function handleGetStats() {
  const totalLicenses = db.prepare('SELECT COUNT(*) as count FROM licenses').get().count;
  const activeLicenses = db.prepare("SELECT COUNT(*) as count FROM licenses WHERE status = 'active'").get().count;
  const totalActivations = db.prepare('SELECT COUNT(*) as count FROM activations').get().count;
  const suspendedOrExpired = db.prepare("SELECT COUNT(*) as count FROM licenses WHERE status != 'active'").get().count;
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM app_users').get().count;
  const trialUsers = db.prepare("SELECT COUNT(*) as count FROM app_users WHERE status = 'trial'").get().count;

  return {
    status: 200,
    data: {
      totalLicenses,
      activeLicenses,
      totalActivations,
      suspendedOrExpired,
      totalUsers,
      trialUsers
    }
  };
}

export function handleGetLicenses(query = {}) {
  const search = (query.search || '').trim();
  const status = (query.status || '').trim();

  let sql = `
    SELECT 
      l.*,
      COUNT(a.id) as active_devices_count
    FROM licenses l
    LEFT JOIN activations a ON l.id = a.license_id
  `;
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push('(l.license_key LIKE ? OR l.client_name LIKE ? OR l.client_email LIKE ? OR l.client_phone LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  if (status) {
    conditions.push('l.status = ?');
    params.push(status);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' GROUP BY l.id ORDER BY l.created_at DESC';

  const licenses = db.prepare(sql).all(...params);
  return { status: 200, data: { licenses } };
}

export function handleCreateLicense(body) {
  const {
    client_name,
    client_email = '',
    client_phone = '',
    license_type = 'lifetime', // 'lifetime' | 'annual'
    max_activations = 2,
    duration_months = 12,
    notes = '',
    custom_key = ''
  } = body || {};

  if (!client_name || !String(client_name).trim()) {
    return { status: 400, data: { success: false, error: 'Nama klien wajib diisi.' } };
  }

  let key = (custom_key && String(custom_key).trim().toUpperCase()) || generateKey();

  // Ensure unique key
  const existing = db.prepare('SELECT id FROM licenses WHERE license_key = ?').get(key);
  if (existing) {
    if (custom_key) {
      return { status: 400, data: { success: false, error: 'License key sudah terdaftar. Gunakan key lain.' } };
    }
    key = generateKey(); // regenerate
  }

  const now = Date.now();
  let validUntil = null;

  if (license_type === 'annual') {
    const months = parseInt(duration_months, 10) || 12;
    const expDate = new Date();
    expDate.setMonth(expDate.getMonth() + months);
    validUntil = expDate.getTime();
  }

  const result = db.prepare(`
    INSERT INTO licenses (
      license_key, client_name, client_email, client_phone,
      license_type, status, max_activations, valid_until, notes,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)
  `).run(
    key,
    client_name.trim(),
    client_email ? client_email.trim() : null,
    client_phone ? client_phone.trim() : null,
    license_type,
    parseInt(max_activations, 10) || 2,
    validUntil,
    notes ? notes.trim() : null,
    now,
    now
  );

  const created = db.prepare('SELECT * FROM licenses WHERE id = ?').get(result.lastInsertRowid);
  return { status: 201, data: { success: true, license: created } };
}

export function handleUpdateLicense(id, body) {
  const licenseId = parseInt(id, 10);
  const license = db.prepare('SELECT * FROM licenses WHERE id = ?').get(licenseId);
  if (!license) {
    return { status: 404, data: { success: false, error: 'Lisensi tidak ditemukan.' } };
  }

  const {
    client_name,
    client_email,
    client_phone,
    license_type,
    status,
    max_activations,
    valid_until,
    notes
  } = body || {};

  const now = Date.now();

  db.prepare(`
    UPDATE licenses SET
      client_name = COALESCE(?, client_name),
      client_email = COALESCE(?, client_email),
      client_phone = COALESCE(?, client_phone),
      license_type = COALESCE(?, license_type),
      status = COALESCE(?, status),
      max_activations = COALESCE(?, max_activations),
      valid_until = COALESCE(?, valid_until),
      notes = COALESCE(?, notes),
      updated_at = ?
    WHERE id = ?
  `).run(
    client_name !== undefined ? client_name : null,
    client_email !== undefined ? client_email : null,
    client_phone !== undefined ? client_phone : null,
    license_type !== undefined ? license_type : null,
    status !== undefined ? status : null,
    max_activations !== undefined ? parseInt(max_activations, 10) : null,
    valid_until !== undefined ? valid_until : null,
    notes !== undefined ? notes : null,
    now,
    licenseId
  );

  const updated = db.prepare('SELECT * FROM licenses WHERE id = ?').get(licenseId);
  return { status: 200, data: { success: true, license: updated } };
}

export function handleDeleteLicense(id) {
  const licenseId = parseInt(id, 10);
  db.prepare('DELETE FROM activations WHERE license_id = ?').run(licenseId);
  const result = db.prepare('DELETE FROM licenses WHERE id = ?').run(licenseId);
  if (result.changes === 0) {
    return { status: 404, data: { success: false, error: 'Lisensi tidak ditemukan.' } };
  }
  return { status: 200, data: { success: true, message: 'Lisensi berhasil dihapus.' } };
}

export function handleGetLicenseActivations(id) {
  const licenseId = parseInt(id, 10);
  const license = db.prepare('SELECT * FROM licenses WHERE id = ?').get(licenseId);
  if (!license) {
    return { status: 404, data: { success: false, error: 'Lisensi tidak ditemukan.' } };
  }

  const activations = db.prepare(`
    SELECT * FROM activations WHERE license_id = ? ORDER BY activated_at DESC
  `).all(licenseId);

  return { status: 200, data: { license, activations } };
}

export function handleDeleteActivation(activationId) {
  const id = parseInt(activationId, 10);
  const result = db.prepare('DELETE FROM activations WHERE id = ?').run(id);
  if (result.changes === 0) {
    return { status: 404, data: { success: false, error: 'Data aktivasi perangkat tidak ditemukan.' } };
  }
  return { status: 200, data: { success: true, message: 'Slot perangkat berhasil direset.' } };
}

export function handleChangePassword(adminId, body) {
  const { current_password, new_password } = body || {};
  if (!current_password || !new_password || new_password.length < 6) {
    return { status: 400, data: { success: false, error: 'Password baru minimal 6 karakter.' } };
  }

  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(adminId);
  if (!admin) {
    return { status: 404, data: { success: false, error: 'Admin tidak ditemukan.' } };
  }

  const valid = verifyPassword(current_password, admin.salt, admin.password_hash);
  if (!valid) {
    return { status: 401, data: { success: false, error: 'Password saat ini salah.' } };
  }

  const { salt, hash } = hashPassword(new_password);
  db.prepare('UPDATE admins SET salt = ?, password_hash = ? WHERE id = ?').run(salt, hash, adminId);
  return { status: 200, data: { success: true, message: 'Password berhasil diperbarui.' } };
}

export function handleBatchCreateLicenses(body) {
  const {
    count = 5,
    name_prefix = 'Batch Key',
    license_type = 'lifetime',
    max_activations = 2,
    duration_months = 12,
    notes = ''
  } = body || {};

  const num = Math.min(Math.max(parseInt(count, 10) || 1, 1), 100);
  const now = Date.now();
  let validUntil = null;

  if (license_type === 'annual') {
    const months = parseInt(duration_months, 10) || 12;
    const expDate = new Date();
    expDate.setMonth(expDate.getMonth() + months);
    validUntil = expDate.getTime();
  }

  const generated = [];
  const insertStmt = db.prepare(`
    INSERT INTO licenses (
      license_key, client_name, client_email, client_phone,
      license_type, status, max_activations, valid_until, notes,
      created_at, updated_at
    ) VALUES (?, ?, null, null, ?, 'active', ?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN TRANSACTION;');
  try {
    for (let i = 0; i < num; i++) {
      const key = generateKey('CQ');
      const clientName = `${(name_prefix || 'Batch Key').trim()} #${i + 1}`;
      insertStmt.run(
        key,
        clientName,
        license_type,
        parseInt(max_activations, 10) || 2,
        validUntil,
        notes ? notes.trim() : `Batch Generated (${num} keys)`,
        now,
        now
      );
      generated.push({ key, clientName });
    }
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    return { status: 500, data: { success: false, error: err.message } };
  }

  return { status: 201, data: { success: true, count: generated.length, licenses: generated } };
}

export function handleGetSettings() {
  const rows = db.prepare('SELECT setting_key, setting_value FROM settings').all();
  const settings = {};
  rows.forEach(r => settings[r.setting_key] = r.setting_value);
  return { status: 200, data: { success: true, settings } };
}

export function handleUpdateSettings(body) {
  if (!body || typeof body !== 'object') {
    return { status: 400, data: { success: false, error: 'Invalid body' } };
  }
  const updateStmt = db.prepare(`
    INSERT INTO settings (setting_key, setting_value) 
    VALUES (?, ?) 
    ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value
  `);
  
  db.exec('BEGIN TRANSACTION;');
  try {
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string' || typeof value === 'number') {
        updateStmt.run(key, String(value));
      }
    }
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    return { status: 500, data: { success: false, error: err.message } };
  }
  
  return handleGetSettings();
}
