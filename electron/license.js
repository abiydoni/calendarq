/**
 * CalendarQ License Manager
 * ─────────────────────────
 * Handles:
 *  - 14-day trial (persisted via install_date in encrypted store)
 *  - Online license validation via Self-Hosted CalendarQ License Server
 *  - Machine-ID fingerprinting (max PC activations per key enforced by server)
 *  - 7-day offline grace period after last successful validation
 *  - License activation / deactivation
 *
 * CONFIG: Ubah DEFAULT_LICENSE_SERVER dengan domain/IP server Anda saat dideploy
 *         (contoh: 'https://license.domainanda.com')
 */

import crypto from 'crypto';
import os from 'os';

/* ─────────────────── CONFIG ─────────────────── */
const TRIAL_DAYS            = 14;
const OFFLINE_GRACE_DAYS    = 7;

// Default server URL — ganti ke URL server VPS Anda saat rilis produksi
export const DEFAULT_LICENSE_SERVER = 'http://localhost:3001';
/* ────────────────────────────────────────────── */

export function getLicenseServerUrl(store) {
  return (store && store.get('custom_license_server')) || process.env.LICENSE_SERVER_URL || DEFAULT_LICENSE_SERVER;
}

/**
 * Generate a stable machine fingerprint from hardware/OS properties.
 * Stored as a 32-char hex string.
 */
export function getMachineId() {
  const raw = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.cpus()[0]?.model || '',
    String(os.totalmem()),
  ].join('||');
  return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 32);
}

/**
 * Check current license status.
 * Returns: { status: 'trial'|'active'|'expired', daysLeft: number|null, key: string|null, info?: object }
 */
export async function checkLicenseStatus(store) {
  const machineId = getMachineId();

  // ── 1. Already activated? Validate stored key ──
  const storedKey   = store.get('license_key');
  const lastChecked = store.get('license_last_checked'); // timestamp ms
  const licenseInfo = store.get('license_info') || null;

  if (storedKey) {
    const now = Date.now();
    const gracePeriodMs = OFFLINE_GRACE_DAYS * 24 * 60 * 60 * 1000;

    // Offline grace: if checked recently, skip network check
    if (lastChecked && (now - lastChecked) < gracePeriodMs) {
      return { status: 'active', daysLeft: null, key: storedKey, info: licenseInfo };
    }

    // Re-validate online against self-hosted server
    try {
      const serverUrl = getLicenseServerUrl(store);
      const result = await validateKeyOnline(serverUrl, storedKey, machineId);

      if (result.valid) {
        store.set('license_last_checked', now);
        if (result.info) store.set('license_info', result.info);
        return { status: 'active', daysLeft: null, key: storedKey, info: result.info || licenseInfo };
      } else {
        // Key was revoked, suspended, or expired
        store.delete('license_key');
        store.delete('license_last_checked');
        store.delete('license_info');
      }
    } catch {
      // Network error → use grace period if within limit
      if (lastChecked && (now - lastChecked) < gracePeriodMs) {
        return { status: 'active', daysLeft: null, key: storedKey, info: licenseInfo };
      }
      // Grace expired and offline → treat as expired
      return { status: 'expired', daysLeft: 0, key: null, offlineExpired: true };
    }
  }

  // ── 2. Check if user has registered their email on first install ──
  const registered = store.get('user_registered') === true;
  if (!registered) {
    return { status: 'unregistered', daysLeft: TRIAL_DAYS, key: null };
  }

  // ── 3. Trial logic ──
  let installDate = store.get('install_date');
  if (!installDate) {
    installDate = Date.now();
    store.set('install_date', installDate);
  }

  // Send background ping to keep last_active_at updated
  try {
    const serverUrl = getLicenseServerUrl(store);
    fetch(`${serverUrl}/api/users/ping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ machineId }),
    }).catch(() => {});
  } catch {}

  const elapsed  = Date.now() - installDate;
  const daysUsed = Math.floor(elapsed / (1000 * 60 * 60 * 24));
  const daysLeft = Math.max(0, TRIAL_DAYS - daysUsed);

  if (daysLeft > 0) {
    return { status: 'trial', daysLeft, key: null };
  }

  return { status: 'expired', daysLeft: 0, key: null };
}

/**
 * Register user email & name on first install
 */
export async function registerUser(store, { name, email }) {
  const machineId   = getMachineId();
  const machineName = os.hostname();
  const platform    = os.platform();
  const serverUrl   = getLicenseServerUrl(store);

  try {
    const res = await fetch(`${serverUrl}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        machineId,
        machineName,
        platform
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      store.set('user_registered', true);
      store.set('user_name', name.trim());
      store.set('user_email', email.trim().toLowerCase());
      if (!store.get('install_date')) {
        store.set('install_date', Date.now());
      }
      return { success: true };
    }
    return { success: false, error: data.error || 'Gagal mendaftarkan email.' };
  } catch {
    return {
      success: false,
      error: 'Tidak dapat terhubung ke server lisensi. Pastikan koneksi internet Anda aktif untuk memulai uji coba gratis.'
    };
  }
}

/**
 * Activate a license key with self-hosted server.
 * Returns: { success: boolean, error?: string, info?: object }
 */
export async function activateLicense(store, keyOrOptions) {
  const machineId   = getMachineId();
  const machineName = os.hostname();
  const platform    = os.platform();
  const serverUrl   = getLicenseServerUrl(store);

  let cleanKey, name, email;
  if (typeof keyOrOptions === 'object' && keyOrOptions !== null) {
    cleanKey = String(keyOrOptions.key || '').trim().toUpperCase();
    name = (keyOrOptions.name || store.get('user_name') || '').trim();
    email = (keyOrOptions.email || store.get('user_email') || '').trim().toLowerCase();
  } else {
    cleanKey = String(keyOrOptions || '').trim().toUpperCase();
    name = (store.get('user_name') || '').trim();
    email = (store.get('user_email') || '').trim().toLowerCase();
  }

  if (name) store.set('user_name', name);
  if (email) store.set('user_email', email);

  try {
    const res = await fetch(`${serverUrl}/api/license/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: cleanKey,
        machineId,
        machineName,
        platform,
        name,
        email
      }),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      const info = {
        licenseType: data.licenseType,
        validUntil: data.validUntil,
        clientName: data.clientName
      };
      store.set('license_key', cleanKey);
      store.set('license_last_checked', Date.now());
      store.set('license_info', info);
      return { success: true, info };
    }

    return {
      success: false,
      error: data.error || friendlyError(data.code)
    };
  } catch (err) {
    return {
      success: false,
      error: 'Tidak dapat terhubung ke server lisensi. Pastikan koneksi internet Anda aktif.'
    };
  }
}

/**
 * Deactivate license on this machine.
 * Returns: { success: boolean }
 */
export async function deactivateLicense(store) {
  const key       = store.get('license_key');
  const machineId = getMachineId();
  const serverUrl = getLicenseServerUrl(store);

  if (key) {
    try {
      await fetch(`${serverUrl}/api/license/deactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, machineId }),
      });
    } catch {
      // Best effort — still clear locally even if network fails
    }
  }

  store.delete('license_key');
  store.delete('license_last_checked');
  store.delete('license_info');
  return { success: true };
}

/* ─────────────────── Internal helpers ─────────────────── */

async function validateKeyOnline(serverUrl, key, machineId) {
  const res = await fetch(`${serverUrl}/api/license/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, machineId }),
  });

  const data = await res.json();
  if (res.ok && data.valid) {
    return {
      valid: true,
      info: {
        licenseType: data.licenseType,
        validUntil: data.validUntil,
        clientName: data.clientName
      }
    };
  }
  return { valid: false, code: data.code };
}

function friendlyError(code) {
  const messages = {
    'NOT_FOUND':                    'License Key tidak ditemukan. Periksa kembali key yang Anda masukkan.',
    'SUSPENDED':                    'Lisensi ini telah dinonaktifkan oleh admin. Hubungi dukungan kami.',
    'EXPIRED':                      'Lisensi telah kedaluwarsa. Perbarui masa aktif lisensi Anda.',
    'TOO_MANY_MACHINES':            'Key ini sudah digunakan di batas maksimum perangkat. Hubungi admin untuk mereset perangkat lama.',
    'MACHINE_NOT_ACTIVATED':        'Perangkat ini belum terdaftar di lisensi tersebut.',
    'INVALID_REQUEST':              'Permintaan lisensi tidak valid.',
  };
  return messages[code] || `Aktivasi gagal (${code || 'UNKNOWN'}). Coba lagi nanti.`;
}
