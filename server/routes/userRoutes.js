import db from '../db.js';

const TRIAL_DAYS = 14;

// Email validation helper
function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Handle new user registration on first install
 */
export function handleRegisterUser(body) {
  const { name, email, machineId, machineName = '', platform = '' } = body || {};

  if (!name || !String(name).trim()) {
    return { status: 400, data: { success: false, error: 'Nama lengkap wajib diisi.' } };
  }

  if (!email || !isValidEmail(email)) {
    return { status: 400, data: { success: false, error: 'Email tidak valid. Pastikan format email benar (contoh: nama@gmail.com).' } };
  }

  if (!machineId) {
    return { status: 400, data: { success: false, error: 'Machine ID tidak ditemukan.' } };
  }

  const cleanName = String(name).trim();
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanMachineId = String(machineId).trim();
  const now = Date.now();

  const existing = db.prepare('SELECT * FROM app_users WHERE machine_id = ?').get(cleanMachineId);

  if (existing) {
    db.prepare(`
      UPDATE app_users SET
        name = ?,
        email = ?,
        machine_name = COALESCE(NULLIF(?, ''), machine_name),
        os_platform = COALESCE(NULLIF(?, ''), os_platform),
        last_active_at = ?
      WHERE id = ?
    `).run(cleanName, cleanEmail, machineName, platform, now, existing.id);

    return {
      status: 200,
      data: {
        success: true,
        message: 'Data pengguna diperbarui.',
        user: { name: cleanName, email: cleanEmail, registered_at: existing.registered_at }
      }
    };
  }

  db.prepare(`
    INSERT INTO app_users (
      machine_id, name, email, os_platform, machine_name,
      status, license_key, registered_at, last_active_at
    ) VALUES (?, ?, ?, ?, ?, 'trial', null, ?, ?)
  `).run(cleanMachineId, cleanName, cleanEmail, platform, machineName, now, now);

  return {
    status: 201,
    data: {
      success: true,
      message: 'Registrasi berhasil! Masa trial 14 hari dimulai.',
      user: { name: cleanName, email: cleanEmail, registered_at: now }
    }
  };
}

/**
 * Handle periodic ping/heartbeat from client to update last_active_at
 */
export function handleUserPing(body) {
  const { machineId } = body || {};
  if (!machineId) return { status: 400, data: { success: false } };

  const now = Date.now();
  db.prepare('UPDATE app_users SET last_active_at = ? WHERE machine_id = ?').run(now, String(machineId).trim());
  return { status: 200, data: { success: true } };
}

/**
 * Admin: Get all app users (installations)
 */
export function handleGetUsers(query = {}) {
  const search = (query.search || '').trim();
  const statusFilter = (query.status || '').trim();

  let sql = 'SELECT * FROM app_users';
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push('(name LIKE ? OR email LIKE ? OR machine_name LIKE ? OR license_key LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  if (statusFilter) {
    conditions.push('status = ?');
    params.push(statusFilter);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY last_active_at DESC';

  const rows = db.prepare(sql).all(...params);
  const now = Date.now();

  const users = rows.map(u => {
    let daysLeft = null;
    let computedStatus = u.status;

    if (u.status === 'trial') {
      const elapsedMs = now - u.registered_at;
      const daysUsed = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
      daysLeft = Math.max(0, TRIAL_DAYS - daysUsed);
      if (daysLeft === 0) {
        computedStatus = 'expired';
      }
    }

    return {
      ...u,
      days_left: daysLeft,
      computed_status: computedStatus
    };
  });

  return { status: 200, data: { users } };
}

/**
 * Admin: Delete user record
 */
export function handleDeleteUser(id) {
  const userId = parseInt(id, 10);
  const res = db.prepare('DELETE FROM app_users WHERE id = ?').run(userId);
  if (res.changes === 0) {
    return { status: 404, data: { success: false, error: 'Data pemakai tidak ditemukan.' } };
  }
  return { status: 200, data: { success: true, message: 'Data pemakai berhasil dihapus.' } };
}

/**
 * Admin: Export users as CSV
 */
export function handleExportUsersCsv() {
  const rows = db.prepare('SELECT * FROM app_users ORDER BY registered_at DESC').all();
  const headers = ['ID', 'Nama', 'Email', 'Nama Komputer', 'OS', 'Status', 'License Key', 'Tgl Daftar', 'Terakhir Aktif'];
  
  const csvLines = [headers.join(',')];
  for (const r of rows) {
    const regDate = new Date(r.registered_at).toISOString().split('T')[0];
    const actDate = new Date(r.last_active_at).toISOString().split('T')[0];
    const line = [
      r.id,
      `"${(r.name || '').replace(/"/g, '""')}"`,
      `"${(r.email || '').replace(/"/g, '""')}"`,
      `"${(r.machine_name || '').replace(/"/g, '""')}"`,
      `"${(r.os_platform || '').replace(/"/g, '""')}"`,
      `"${r.status}"`,
      `"${r.license_key || '-'}"`,
      `"${regDate}"`,
      `"${actDate}"`
    ];
    csvLines.push(line.join(','));
  }

  return { status: 200, data: csvLines.join('\n') };
}
