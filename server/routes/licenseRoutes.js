import db from '../db.js';

/**
 * Handle license activation from CalendarQ desktop app
 */
export function handleActivate(body) {
  const { key, machineId, machineName = '', platform = '', name = '', email = '' } = body || {};

  if (!key || !machineId) {
    return { status: 400, data: { success: false, error: 'Key dan Machine ID wajib disertakan.' } };
  }

  const cleanKey = String(key).trim().toUpperCase();
  const cleanMachineId = String(machineId).trim();
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();

  const license = db.prepare('SELECT * FROM licenses WHERE license_key = ?').get(cleanKey);
  if (!license) {
    return {
      status: 404,
      data: {
        success: false,
        code: 'NOT_FOUND',
        error: 'Key tidak ditemukan. Pastikan key yang dimasukkan benar.'
      }
    };
  }

  if (license.status === 'suspended') {
    return {
      status: 403,
      data: {
        success: false,
        code: 'SUSPENDED',
        error: 'Lisensi ini telah dinonaktifkan oleh admin. Hubungi dukungan.'
      }
    };
  }

  const now = Date.now();
  if (license.valid_until && now > license.valid_until) {
    db.prepare("UPDATE licenses SET status = 'expired', updated_at = ? WHERE id = ?").run(now, license.id);
    return {
      status: 403,
      data: {
        success: false,
        code: 'EXPIRED',
        error: 'Lisensi telah kedaluwarsa. Perbarui lisensi Anda.'
      }
    };
  }

  // Check existing activations for this license
  const existing = db.prepare('SELECT * FROM activations WHERE license_id = ? AND machine_id = ?').get(license.id, cleanMachineId);

  if (existing) {
    // Already registered to this machine -> update last_seen_at, name, email
    db.prepare(`
      UPDATE activations 
      SET last_seen_at = ?, 
          machine_name = COALESCE(NULLIF(?, ''), machine_name), 
          os_platform = COALESCE(NULLIF(?, ''), os_platform),
          user_name = COALESCE(NULLIF(?, ''), user_name),
          user_email = COALESCE(NULLIF(?, ''), user_email)
      WHERE id = ?
    `).run(now, machineName, platform, cleanName, cleanEmail, existing.id);

    // Sync app_users
    try {
      db.prepare(`
        UPDATE app_users 
        SET status = 'active', license_key = ?, 
            name = COALESCE(NULLIF(?, ''), name),
            email = COALESCE(NULLIF(?, ''), email),
            last_active_at = ?
        WHERE machine_id = ?
      `).run(cleanKey, cleanName, cleanEmail, now, cleanMachineId);
    } catch {}

    return {
      status: 200,
      data: {
        success: true,
        message: 'Lisensi aktif pada perangkat ini.',
        licenseType: license.license_type,
        validUntil: license.valid_until,
        clientName: license.client_name
      }
    };
  }

  // New machine -> check limit
  const countRow = db.prepare('SELECT COUNT(*) as count FROM activations WHERE license_id = ?').get(license.id);
  if (countRow.count >= license.max_activations) {
    return {
      status: 403,
      data: {
        success: false,
        code: 'TOO_MANY_MACHINES',
        error: `Key ini sudah digunakan di ${countRow.count} perangkat (maks ${license.max_activations} PC). Hubungi admin untuk mereset perangkat lama.`
      }
    };
  }

  // Insert activation
  db.prepare(`
    INSERT INTO activations (license_id, machine_id, machine_name, os_platform, user_name, user_email, activated_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(license.id, cleanMachineId, machineName, platform, cleanName || license.client_name, cleanEmail || license.client_email, now, now);

  // Link / Update with app_users
  try {
    const existingUser = db.prepare('SELECT id FROM app_users WHERE machine_id = ?').get(cleanMachineId);
    if (existingUser) {
      db.prepare(`
        UPDATE app_users 
        SET status = 'active', license_key = ?, 
            name = COALESCE(NULLIF(?, ''), name),
            email = COALESCE(NULLIF(?, ''), email),
            last_active_at = ?
        WHERE id = ?
      `).run(cleanKey, cleanName, cleanEmail, now, existingUser.id);
    } else {
      db.prepare(`
        INSERT INTO app_users (machine_id, name, email, os_platform, machine_name, status, license_key, registered_at, last_active_at)
        VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)
      `).run(cleanMachineId, cleanName || license.client_name, cleanEmail || license.client_email || '', platform, machineName, cleanKey, now, now);
    }
  } catch {}

  return {
    status: 200,
    data: {
      success: true,
      message: 'Aktivasi berhasil!',
      licenseType: license.license_type,
      validUntil: license.valid_until,
      clientName: license.client_name
    }
  };
}

/**
 * Handle heartbeat validation from CalendarQ desktop app
 */
export function handleValidate(body) {
  const { key, machineId } = body || {};

  if (!key || !machineId) {
    return { status: 400, data: { valid: false, code: 'INVALID_REQUEST' } };
  }

  const cleanKey = String(key).trim().toUpperCase();
  const cleanMachineId = String(machineId).trim();

  const license = db.prepare('SELECT * FROM licenses WHERE license_key = ?').get(cleanKey);
  if (!license) {
    return { status: 404, data: { valid: false, code: 'NOT_FOUND' } };
  }

  if (license.status !== 'active') {
    return { status: 403, data: { valid: false, code: license.status.toUpperCase() } };
  }

  const now = Date.now();
  if (license.valid_until && now > license.valid_until) {
    db.prepare("UPDATE licenses SET status = 'expired', updated_at = ? WHERE id = ?").run(now, license.id);
    return { status: 403, data: { valid: false, code: 'EXPIRED' } };
  }

  const activation = db.prepare('SELECT * FROM activations WHERE license_id = ? AND machine_id = ?').get(license.id, cleanMachineId);
  if (!activation) {
    return { status: 403, data: { valid: false, code: 'MACHINE_NOT_ACTIVATED' } };
  }

  // Update heartbeat timestamp
  db.prepare('UPDATE activations SET last_seen_at = ? WHERE id = ?').run(now, activation.id);

  return {
    status: 200,
    data: {
      valid: true,
      status: 'active',
      licenseType: license.license_type,
      validUntil: license.valid_until,
      clientName: license.client_name
    }
  };
}

/**
 * Handle deactivation from CalendarQ desktop app
 */
export function handleDeactivate(body) {
  const { key, machineId } = body || {};
  if (!key || !machineId) {
    return { status: 400, data: { success: false, error: 'Key dan Machine ID wajib disertakan.' } };
  }

  const cleanKey = String(key).trim().toUpperCase();
  const cleanMachineId = String(machineId).trim();

  const license = db.prepare('SELECT id FROM licenses WHERE license_key = ?').get(cleanKey);
  if (license) {
    db.prepare('DELETE FROM activations WHERE license_id = ? AND machine_id = ?').run(license.id, cleanMachineId);
  }

  return { status: 200, data: { success: true, message: 'Perangkat berhasil dinonaktifkan.' } };
}
