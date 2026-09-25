// API base URL
const API_BASE = window.location.origin;

let token = localStorage.getItem('cq_admin_token') || null;
let currentLicenses = [];
let activeViewingLicenseId = null;

// Toast Helper
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : '⚠️'}</span> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Modal Helpers
window.openModal = function(id) {
  document.getElementById(id).classList.add('open');
};

window.closeModal = function(id) {
  document.getElementById(id).classList.remove('open');
};

// Client-side Key Generator Helper: CQ-XXXX-XXXX-XXXX
function generateClientKey(prefix = 'CQ') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () => {
    let s = '';
    for (let i = 0; i < 4; i++) {
      s += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return s;
  };
  return `${prefix}-${seg()}-${seg()}-${seg()}`;
}

// API Fetch Helper with Auth
async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    if (res.status === 401 && !endpoint.includes('/login')) {
      handleLogout();
      showToast('Sesi login telah habis. Silakan login kembali.', 'error');
      return null;
    }
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    showToast('Gagal terhubung ke server.', 'error');
    return null;
  }
}

// Check Login State
async function initAuth() {
  if (!token) {
    showLoginView();
    return;
  }

  const res = await apiFetch('/api/admin/me');
  if (res && res.ok && res.data.success) {
    document.getElementById('adminUsername').textContent = res.data.user.username;
    showDashboardView();
    loadDashboardData();
  } else {
    handleLogout();
  }
}

function showLoginView() {
  document.getElementById('loginSection').style.display = 'flex';
  document.getElementById('dashboardSection').style.display = 'none';
}

function showDashboardView() {
  document.getElementById('loginSection').style.display = 'none';
  document.getElementById('dashboardSection').style.display = 'block';
}

function handleLogout() {
  token = null;
  localStorage.removeItem('cq_admin_token');
  showLoginView();
}

// ────────────────── Dashboard Data Loading ──────────────────
async function loadDashboardData() {
  loadStats();
  loadLicenses();
  loadUsers();
  loadOrders();
}

async function loadStats() {
  const res = await apiFetch('/api/admin/stats');
  if (res && res.ok) {
    const s = res.data;
    document.getElementById('statTotalLicenses').textContent = s.totalLicenses || 0;
    document.getElementById('statActiveLicenses').textContent = s.activeLicenses || 0;
    document.getElementById('statTotalActivations').textContent = s.totalActivations || 0;
    document.getElementById('statSuspended').textContent = s.suspendedOrExpired || 0;
    if (document.getElementById('tabUserCount')) {
      document.getElementById('tabUserCount').textContent = s.totalUsers || 0;
    }
  }
}

async function loadLicenses() {
  const search = document.getElementById('searchInput').value.trim();
  const status = document.getElementById('statusFilter').value;
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (status) params.set('status', status);

  const res = await apiFetch(`/api/admin/licenses?${params.toString()}`);
  const tbody = document.getElementById('licenseTableBody');

  if (!res || !res.ok) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger);">Gagal memuat data lisensi.</td></tr>`;
    return;
  }

  currentLicenses = res.data.licenses || [];

  if (currentLicenses.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">Belum ada lisensi yang dibuat.</td></tr>`;
    return;
  }

  tbody.innerHTML = currentLicenses.map(lic => {
    const isLifetime = lic.license_type === 'lifetime';
    const expText = isLifetime 
      ? '♾️ Selamanya' 
      : (lic.valid_until ? new Date(lic.valid_until).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) : '-');

    const statusClass = lic.status === 'active' ? 'active' : (lic.status === 'suspended' ? 'suspended' : 'expired');
    const statusLabel = lic.status === 'active' ? 'Aktif' : (lic.status === 'suspended' ? 'Ditangguhkan' : 'Kedaluwarsa');

    return `
      <tr>
        <td>
          <div class="key-badge">
            <span>${lic.license_key}</span>
            <button class="copy-btn" onclick="copyText('${lic.license_key}', 'Key')" title="Salin License Key">📋</button>
          </div>
        </td>
        <td>
          <div style="font-weight: 600;">${escapeHtml(lic.client_name)}</div>
          <div style="font-size: 11px; color: var(--text-muted);">
            ${lic.client_email ? `📧 ${escapeHtml(lic.client_email)}` : ''} 
            ${lic.client_phone ? `📱 ${escapeHtml(lic.client_phone)}` : ''}
          </div>
        </td>
        <td>
          <span style="font-size: 12px; font-weight: 600; color: ${isLifetime ? '#818cf8' : '#38bdf8'};">
            ${isLifetime ? 'Lifetime' : 'Tahunan'}
          </span>
        </td>
        <td>
          <button class="device-badge" onclick="viewDevices(${lic.id}, '${lic.license_key}')" title="Klik untuk kelola perangkat">
            💻 ${lic.active_devices_count} / ${lic.max_activations} PC
          </button>
        </td>
        <td>
          <span style="font-size: 12px;">${expText}</span>
        </td>
        <td>
          <span class="status-badge ${statusClass}">
            ● ${statusLabel}
          </span>
        </td>
        <td style="text-align: right;">
          <div style="display: inline-flex; gap: 6px;">
            ${lic.client_email ? `
              <button class="btn btn-primary btn-sm" onclick="sendLicenseEmail('${lic.license_key}', '${escapeHtml(lic.client_name).replace(/'/g, "\\'")}', '${escapeHtml(lic.client_email).replace(/'/g, "\\'")}')" title="Kirim Lisensi via Email">
                📧
              </button>
            ` : ''}
            <button class="btn btn-secondary btn-sm" onclick="toggleStatus(${lic.id}, '${lic.status}')" title="${lic.status === 'active' ? 'Tangguhkan lisensi' : 'Aktifkan lisensi'}">
              ${lic.status === 'active' ? '⏸️' : '▶️'}
            </button>
            <button class="btn btn-danger btn-sm" onclick="deleteLicense(${lic.id})" title="Hapus lisensi">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Copy to Clipboard
window.copyText = function(text, label = 'Teks') {
  navigator.clipboard.writeText(text).then(() => {
    showToast(`${label} disalin ke clipboard! 📋`);
  });
};

// Send License via Email (From Table)
window.sendLicenseEmail = function(key, name, email) {
  if (!email || email === 'null' || email === 'undefined') {
    showToast('Klien ini tidak memiliki alamat email yang valid.', 'error');
    return;
  }
  const subject = encodeURIComponent('Lisensi CalendarQ Anda');
  const mailBody = encodeURIComponent(`Halo ${name},\n\nTerima kasih telah menggunakan CalendarQ.\n\nBerikut adalah License Key Anda:\n${key}\n\nCara Aktivasi:\n1. Buka aplikasi CalendarQ\n2. Buka Pengaturan (⚙️) > Lisensi\n3. Masukkan key di atas dan klik Aktifkan.\n\nSalam,\nAdmin CalendarQ`);
  window.open(`mailto:${email}?subject=${subject}&body=${mailBody}`, '_blank');
};

// Toggle License Status
window.toggleStatus = async function(id, currentStatus) {
  const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
  const confirmMsg = nextStatus === 'suspended' 
    ? 'Tangguhkan lisensi ini? Aplikasi klien tidak akan bisa menggunakannya.'
    : 'Aktifkan kembali lisensi ini?';
  if (!confirm(confirmMsg)) return;

  const res = await apiFetch(`/api/admin/licenses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: nextStatus })
  });

  if (res && res.ok) {
    showToast(`Status lisensi berhasil diubah menjadi ${nextStatus}.`);
    loadDashboardData();
  } else {
    showToast(res?.data?.error || 'Gagal mengubah status.', 'error');
  }
};

// Delete License
window.deleteLicense = async function(id) {
  if (!confirm('Yakin ingin menghapus lisensi ini secara permanen? Riwayat aktivasi akan ikut terhapus.')) return;

  const res = await apiFetch(`/api/admin/licenses/${id}`, { method: 'DELETE' });
  if (res && res.ok) {
    showToast('Lisensi berhasil dihapus.');
    loadDashboardData();
  } else {
    showToast(res?.data?.error || 'Gagal menghapus lisensi.', 'error');
  }
};

// View & Manage Devices Modal
window.viewDevices = async function(licenseId, key) {
  activeViewingLicenseId = licenseId;
  document.getElementById('deviceModalKey').textContent = key;
  const listContainer = document.getElementById('devicesList');
  listContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">Memuat data perangkat...</div>';
  openModal('devicesModal');

  const res = await apiFetch(`/api/admin/licenses/${licenseId}/activations`);
  if (!res || !res.ok) {
    listContainer.innerHTML = '<div style="color: var(--danger); font-size: 13px;">Gagal memuat daftar perangkat.</div>';
    return;
  }

  const { activations } = res.data;
  if (!activations || activations.length === 0) {
    listContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 13px; padding: 10px 0;">Belum ada perangkat yang mengaktifkan key ini.</div>';
    return;
  }

  listContainer.innerHTML = activations.map(act => `
    <div class="device-item">
      <div>
        <div class="device-name">💻 ${escapeHtml(act.machine_name || 'PC / Laptop')} (${escapeHtml(act.os_platform || 'Windows')})</div>
        <div style="font-size: 12px; color: var(--text-primary); font-weight: 600; margin: 2px 0;">
          👤 ${escapeHtml(act.user_name || 'Pemakai')} ${act.user_email ? `<span style="font-weight: 400; color: var(--text-muted);">(📧 ${escapeHtml(act.user_email)})</span>` : ''}
        </div>
        <div class="device-sub">
          ID: <code>${act.machine_id.slice(0, 16)}...</code> • 
          Aktif: ${new Date(act.activated_at).toLocaleDateString('id-ID')} • 
          Terakhir Online: ${new Date(act.last_seen_at).toLocaleDateString('id-ID')}
        </div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="resetDevice(${act.id})" title="Reset slot PC ini">
        Reset Slot 🔄
      </button>
    </div>
  `).join('');
};

window.resetDevice = async function(activationId) {
  if (!confirm('Lepas aktivasi perangkat ini? Slot akan kosong dan bisa digunakan di komputer lain.')) return;

  const res = await apiFetch(`/api/admin/activations/${activationId}`, { method: 'DELETE' });
  if (res && res.ok) {
    showToast('Slot perangkat berhasil direset!');
    if (activeViewingLicenseId) {
      const lic = currentLicenses.find(l => l.id === activeViewingLicenseId);
      viewDevices(activeViewingLicenseId, lic ? lic.license_key : '');
    }
    loadDashboardData();
  } else {
    showToast(res?.data?.error || 'Gagal mereset perangkat.', 'error');
  }
};

// ────────────────── Event Listeners ──────────────────

// Login Form Submit
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  const res = await apiFetch('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });

  if (res && res.ok && res.data.success) {
    token = res.data.token;
    localStorage.setItem('cq_admin_token', token);
    document.getElementById('adminUsername').textContent = res.data.username;
    showToast('Berhasil masuk! Selamat datang.');
    showDashboardView();
    loadDashboardData();
  } else {
    showToast(res?.data?.error || 'Login gagal. Periksa kembali username/password.', 'error');
  }
});

// Logout Button
document.getElementById('btnLogout').addEventListener('click', () => {
  if (confirm('Keluar dari Admin Dashboard?')) {
    handleLogout();
  }
});

// Create License Form Submit
document.getElementById('btnOpenCreateModal').addEventListener('click', () => {
  document.getElementById('createLicenseForm').reset();
  document.getElementById('durationWrap').style.display = 'none';
  document.getElementById('newCustomKey').value = generateClientKey('CQ');
  openModal('createModal');
});

document.getElementById('btnRegenerateKey').addEventListener('click', () => {
  document.getElementById('newCustomKey').value = generateClientKey('CQ');
});

document.getElementById('newLicenseType').addEventListener('change', (e) => {
  const isAnnual = e.target.value === 'annual';
  document.getElementById('durationWrap').style.display = isAnnual ? 'block' : 'none';
});

document.getElementById('createLicenseForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    client_name: document.getElementById('newClientName').value.trim(),
    client_email: document.getElementById('newClientEmail').value.trim(),
    client_phone: document.getElementById('newClientPhone').value.trim(),
    license_type: document.getElementById('newLicenseType').value,
    duration_months: document.getElementById('newDuration').value,
    max_activations: document.getElementById('newMaxActivations').value,
    custom_key: document.getElementById('newCustomKey').value.trim(),
    notes: document.getElementById('newNotes').value.trim(),
  };

  const res = await apiFetch('/api/admin/licenses', {
    method: 'POST',
    body: JSON.stringify(body)
  });

  if (res && res.ok && res.data.success) {
    showToast('Lisensi baru berhasil diterbitkan! ✨');
    closeModal('createModal');
    loadDashboardData();

    // Show Success Modal
    const newKey = res.data.license?.license_key || res.data.license?.key || '';
    const clientEmail = body.client_email;
    const clientName = body.client_name;
    
    document.getElementById('successClientName').textContent = clientName;
    document.getElementById('successLicenseKey').textContent = newKey;
    
    window.copySuccessKey = () => copyText(newKey, 'License Key');
    
    const btnEmail = document.getElementById('btnEmailSuccessKey');
    if (clientEmail) {
      btnEmail.style.display = 'inline-flex';
      btnEmail.onclick = () => {
        const subject = encodeURIComponent('Lisensi CalendarQ Anda');
        const mailBody = encodeURIComponent(`Halo ${clientName},\n\nTerima kasih telah membeli lisensi CalendarQ.\n\nBerikut adalah License Key Anda:\n${newKey}\n\nCara Aktivasi:\n1. Buka aplikasi CalendarQ\n2. Buka Pengaturan (⚙️) > Lisensi\n3. Masukkan key di atas dan klik Aktifkan.\n\nSalam,\nAdmin CalendarQ`);
        window.open(`mailto:${clientEmail}?subject=${subject}&body=${mailBody}`, '_blank');
      };
    } else {
      btnEmail.style.display = 'none';
    }
    
    openModal('successModal');
  } else {
    showToast(res?.data?.error || 'Gagal membuat lisensi.', 'error');
  }
});

// Change Password Modal
document.getElementById('btnChangePass').addEventListener('click', () => {
  document.getElementById('changePassForm').reset();
  openModal('passwordModal');
});

document.getElementById('changePassForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const current_password = document.getElementById('curPass').value;
  const new_password = document.getElementById('newPass').value;

  const res = await apiFetch('/api/admin/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password, new_password })
  });

  if (res && res.ok && res.data.success) {
    showToast('Password admin berhasil diubah! Silakan login ulang.');
    closeModal('passwordModal');
    handleLogout();
  } else {
    showToast(res?.data?.error || 'Gagal mengubah password.', 'error');
  }
});

// ────────────────── Batch License Generator ──────────────────
let lastBatchKeys = [];

document.getElementById('btnOpenBatchModal').addEventListener('click', () => {
  document.getElementById('batchLicenseForm').reset();
  document.getElementById('batchDurationWrap').style.display = 'none';
  document.getElementById('batchResultWrap').style.display = 'none';
  document.getElementById('btnSubmitBatch').style.display = 'inline-flex';
  lastBatchKeys = [];
  openModal('batchModal');
});

document.getElementById('batchLicenseType').addEventListener('change', (e) => {
  const isAnnual = e.target.value === 'annual';
  document.getElementById('batchDurationWrap').style.display = isAnnual ? 'block' : 'none';
});

document.getElementById('batchLicenseForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    count: document.getElementById('batchCount').value,
    name_prefix: document.getElementById('batchPrefix').value.trim(),
    license_type: document.getElementById('batchLicenseType').value,
    duration_months: document.getElementById('batchDuration').value,
    max_activations: document.getElementById('batchMaxPc').value,
    notes: document.getElementById('batchNotes').value.trim(),
  };

  const btn = document.getElementById('btnSubmitBatch');
  btn.disabled = true;
  btn.textContent = 'Memproses... ⏳';

  const res = await apiFetch('/api/admin/licenses/batch', {
    method: 'POST',
    body: JSON.stringify(body)
  });

  btn.disabled = false;
  btn.textContent = 'Mulai Generate ⚡';

  if (res && res.ok && res.data.success) {
    lastBatchKeys = res.data.licenses || [];
    document.getElementById('batchResultCount').textContent = lastBatchKeys.length;
    document.getElementById('batchResultArea').value = lastBatchKeys.map(k => `${k.key}\t(${k.clientName})`).join('\n');
    document.getElementById('batchResultWrap').style.display = 'block';
    showToast(`Berhasil generate ${lastBatchKeys.length} license keys! 🎉`);
    loadDashboardData();
  } else {
    showToast(res?.data?.error || 'Gagal generate batch lisensi.', 'error');
  }
});

document.getElementById('btnCopyAllBatch').addEventListener('click', () => {
  const text = document.getElementById('batchResultArea').value;
  if (!text) return;
  copyText(text, 'Daftar Key');
});

document.getElementById('btnDownloadBatch').addEventListener('click', () => {
  if (!lastBatchKeys.length) return;
  const content = [
    `CALENDARQ LICENSE KEYS (${lastBatchKeys.length} Keys)`,
    `Dibuat: ${new Date().toLocaleString('id-ID')}`,
    '--------------------------------------------------',
    ...lastBatchKeys.map(k => `${k.key}\t(${k.clientName})`),
    '--------------------------------------------------'
  ].join('\n');

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `calendarq-keys-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('File TXT berhasil diunduh! 💾');
});

// Search & Filter Debounce
let searchTimeout = null;
document.getElementById('searchInput').addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(loadLicenses, 300);
});

document.getElementById('statusFilter').addEventListener('change', loadLicenses);
document.getElementById('btnRefresh').addEventListener('click', loadDashboardData);

// ────────────────── Tab Switching ──────────────────
window.switchTab = function(tab) {
  const btnLicenses = document.getElementById('tabBtnLicenses');
  const btnOrders = document.getElementById('tabBtnOrders');
  const btnUsers = document.getElementById('tabBtnUsers');
  const btnSettings = document.getElementById('tabBtnSettings');

  const viewLicenses = document.getElementById('viewLicenses');
  const viewOrders = document.getElementById('viewOrders');
  const viewUsers = document.getElementById('viewUsers');
  const viewSettings = document.getElementById('viewSettings');

  if (tab === 'licenses') {
    btnLicenses.classList.add('active');
    btnOrders.classList.remove('active');
    btnUsers.classList.remove('active');
    btnSettings.classList.remove('active');
    viewLicenses.style.display = 'block';
    viewOrders.style.display = 'none';
    viewUsers.style.display = 'none';
    viewSettings.style.display = 'none';
    loadLicenses();
  } else if (tab === 'users') {
    btnUsers.classList.add('active');
    btnLicenses.classList.remove('active');
    btnOrders.classList.remove('active');
    btnSettings.classList.remove('active');
    viewUsers.style.display = 'block';
    viewLicenses.style.display = 'none';
    viewOrders.style.display = 'none';
    viewSettings.style.display = 'none';
    loadUsers();
  } else if (tab === 'orders') {
    btnOrders.classList.add('active');
    btnLicenses.classList.remove('active');
    btnUsers.classList.remove('active');
    btnSettings.classList.remove('active');
    viewOrders.style.display = 'block';
    viewLicenses.style.display = 'none';
    viewUsers.style.display = 'none';
    viewSettings.style.display = 'none';
    loadOrders();
  } else if (tab === 'settings') {
    btnSettings.classList.add('active');
    btnLicenses.classList.remove('active');
    btnOrders.classList.remove('active');
    btnUsers.classList.remove('active');
    viewSettings.style.display = 'block';
    viewLicenses.style.display = 'none';
    viewUsers.style.display = 'none';
    viewOrders.style.display = 'none';
    loadSettings();
  }
};

async function loadUsers() {
  const search = document.getElementById('userSearchInput').value.trim();
  const status = document.getElementById('userStatusFilter').value;
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (status) params.set('status', status);

  const res = await apiFetch(`/api/admin/users?${params.toString()}`);
  const tbody = document.getElementById('userTableBody');

  if (!res || !res.ok) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger);">Gagal memuat data pemakai.</td></tr>`;
    return;
  }

  const users = res.data.users || [];
  if (document.getElementById('tabUserCount')) {
    document.getElementById('tabUserCount').textContent = users.length;
  }

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">Belum ada pemakai yang terdaftar.</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => {
    let statusBadge = '';
    if (u.computed_status === 'active') {
      statusBadge = '<span class="status-badge active">● Berlisensi</span>';
    } else if (u.computed_status === 'trial') {
      statusBadge = `<span class="status-badge" style="background: rgba(99, 102, 241, 0.15); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.3);">⏳ Trial (${u.days_left} hr)</span>`;
    } else {
      statusBadge = '<span class="status-badge expired">⚠️ Trial Habis</span>';
    }

    const keyDisplay = u.license_key
      ? `<div class="key-badge"><span>${u.license_key}</span><button class="copy-btn" onclick="copyText('${u.license_key}', 'Key')">📋</button></div>`
      : `<span style="font-size: 11px; color: var(--text-muted);">Masa Trial</span>`;

    const lastActive = new Date(u.last_active_at).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });

    return `
      <tr>
        <td>
          <div style="font-weight: 700; font-size: 14px;">${escapeHtml(u.name)}</div>
          <div style="font-size: 11px; color: var(--text-muted);">ID: ${escapeHtml(u.machine_id.slice(0, 12))}...</div>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span>📧 ${escapeHtml(u.email)}</span>
            <button class="copy-btn" onclick="copyText('${u.email}', 'Email')" title="Salin Email">📋</button>
          </div>
        </td>
        <td>
          <div style="font-size: 12px; font-weight: 600;">💻 ${escapeHtml(u.machine_name || 'PC')}</div>
          <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(u.os_platform || 'Windows')}</div>
        </td>
        <td>${statusBadge}</td>
        <td>${keyDisplay}</td>
        <td>
          <span style="font-size: 12px;">${lastActive}</span>
        </td>
        <td style="text-align: right;">
          <div style="display: inline-flex; gap: 6px;">
            ${(u.computed_status === 'trial' || u.computed_status === 'expired') ? `
              <button class="btn btn-primary btn-sm" onclick="upgradeUser('${escapeHtml(u.name).replace(/'/g, "\\'")}', '${escapeHtml(u.email).replace(/'/g, "\\'")}')" title="Buat Lisensi untuk Pemakai Ini">
                Upgrade 🚀
              </button>
            ` : ''}
            <button class="btn btn-danger btn-sm" onclick="deleteUserRecord(${u.id})" title="Hapus pemakai ini">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.deleteUserRecord = async function(id) {
  if (!confirm('Hapus data pemakai ini dari database server?')) return;
  const res = await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
  if (res && res.ok) {
    showToast('Data pemakai berhasil dihapus.');
    loadUsers();
    loadStats();
  } else {
    showToast(res?.data?.error || 'Gagal menghapus pemakai.', 'error');
  }
};

window.upgradeUser = function(name, email) {
  document.getElementById('createLicenseForm').reset();
  document.getElementById('durationWrap').style.display = 'none';
  document.getElementById('newClientName').value = name || '';
  document.getElementById('newClientEmail').value = email || '';
  document.getElementById('newCustomKey').value = generateClientKey('CQ');
  openModal('createModal');
};

// Users search & filter listeners
let userSearchTimeout = null;
document.getElementById('userSearchInput').addEventListener('input', () => {
  clearTimeout(userSearchTimeout);
  userSearchTimeout = setTimeout(loadUsers, 300);
});

document.getElementById('userStatusFilter').addEventListener('change', loadUsers);
document.getElementById('btnRefreshUsers').addEventListener('click', loadUsers);

// Export CSV handler
document.getElementById('btnExportUsersCsv').addEventListener('click', async () => {
  try {
    const res = await fetch(`${API_BASE}/api/admin/users/export`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Gagal export CSV');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calendarq-users-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data pemakai berhasil diekspor ke CSV! 📥');
  } catch (err) {
    showToast('Gagal mengunduh file CSV.', 'error');
  }
});

// ────────────────── Orders Management ──────────────────
async function loadOrders() {
  const res = await apiFetch('/api/admin/orders');
  const tbody = document.getElementById('orderTableBody');

  if (!res || !res.ok) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--danger);">Gagal memuat pesanan.</td></tr>`;
    return;
  }

  const orders = res.data.orders || [];
  
  // Update badge
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  document.getElementById('tabOrderCount').textContent = pendingCount;
  
  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">Belum ada pesanan masuk.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(o => {
    const isPending = o.status === 'pending';
    const statusLabel = isPending ? '⏳ Menunggu' : (o.status === 'approved' ? '✅ Diterima' : '❌ Ditolak');
    const statusClass = isPending ? 'suspended' : (o.status === 'approved' ? 'active' : 'expired');
    const pkgName = o.package_id === 'annual' ? 'Tahunan' : 'Lifetime';
    
    return `
      <tr>
        <td>${new Date(o.created_at).toLocaleString('id-ID')}</td>
        <td>
          <div style="font-weight: 600;">${escapeHtml(o.client_name)}</div>
          <div style="font-size: 11px; color: var(--text-muted);">📧 ${escapeHtml(o.client_email)}</div>
        </td>
        <td><span style="font-size: 12px; font-weight: 600; color: #818cf8;">${pkgName}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="viewProof(${o.id})" title="Lihat Bukti Transfer">🖼️ Lihat Bukti</button>
        </td>
        <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
        <td style="text-align: right;">
          ${isPending ? `
            <div style="display: inline-flex; gap: 6px;">
              <button class="btn btn-primary btn-sm" onclick="approveOrder(${o.id})" title="Terima & Buat Lisensi">✅ Terima</button>
              <button class="btn btn-danger btn-sm" onclick="rejectOrder(${o.id})" title="Tolak Pesanan">❌ Tolak</button>
            </div>
          ` : '-'}
        </td>
      </tr>
    `;
  }).join('');
}

window.viewProof = async function(orderId) {
  openModal('proofModal');
  document.getElementById('proofModalImg').src = '';
  document.getElementById('proofModalImg').alt = 'Memuat...';
  
  const res = await apiFetch(`/api/admin/orders/${orderId}/proof`);
  if (res && res.ok && res.data.proof_image) {
    document.getElementById('proofModalImg').src = res.data.proof_image;
  } else {
    document.getElementById('proofModalImg').alt = 'Gagal memuat gambar';
  }
};

window.approveOrder = async function(orderId) {
  if (!confirm('Terima pesanan ini? Lisensi akan otomatis dibuat.')) return;
  
  const res = await apiFetch(`/api/admin/orders/${orderId}/approve`, { method: 'POST' });
  if (res && res.ok && res.data.success) {
    showToast('Pesanan diterima! Lisensi berhasil dibuat.');
    loadDashboardData();
    
    // Auto-open email
    const { license_key, client_name, client_email } = res.data;
    sendLicenseEmail(license_key, client_name, client_email);
  } else {
    showToast(res?.data?.error || 'Gagal menerima pesanan.', 'error');
  }
};

window.rejectOrder = async function(orderId) {
  if (!confirm('Tolak pesanan ini?')) return;
  
  const res = await apiFetch(`/api/admin/orders/${orderId}/reject`, { method: 'POST' });
  if (res && res.ok) {
    showToast('Pesanan ditolak.');
    loadDashboardData();
  } else {
    showToast(res?.data?.error || 'Gagal menolak pesanan.', 'error');
  }
};

document.getElementById('btnRefreshOrders').addEventListener('click', loadOrders);

// ────────────────── System Settings ──────────────────
async function loadSettings() {
  const res = await apiFetch('/api/admin/settings');
  if (res && res.ok && res.data.success) {
    const s = res.data.settings || {};
    document.getElementById('setAdminEmail').value = s.admin_email || '';
    document.getElementById('setBankName').value = s.bank_name || '';
    document.getElementById('setBankAccount').value = s.bank_account || '';
    document.getElementById('setBankOwner').value = s.bank_owner || '';
    document.getElementById('setLatestVersion').value = s.latest_version || '';
    document.getElementById('setUpdateLink').value = s.update_link || '';
    document.getElementById('setAnnouncement').value = s.announcement || '';
    document.getElementById('setPriceAnnual').value = s.price_annual || '50000';
    document.getElementById('setPriceLifetime').value = s.price_lifetime || '150000';
  } else {
    showToast('Gagal memuat pengaturan sistem.', 'error');
  }
}

document.getElementById('settingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    admin_email: document.getElementById('setAdminEmail').value.trim(),
    bank_name: document.getElementById('setBankName').value.trim(),
    bank_account: document.getElementById('setBankAccount').value.trim(),
    bank_owner: document.getElementById('setBankOwner').value.trim(),
    latest_version: document.getElementById('setLatestVersion').value.trim(),
    update_link: document.getElementById('setUpdateLink').value.trim(),
    announcement: document.getElementById('setAnnouncement').value.trim(),
    price_annual: document.getElementById('setPriceAnnual').value.trim(),
    price_lifetime: document.getElementById('setPriceLifetime').value.trim()
  };

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Menyimpan... ⏳';

  const res = await apiFetch('/api/admin/settings', {
    method: 'PATCH',
    body: JSON.stringify(body)
  });

  btn.disabled = false;
  btn.textContent = '💾 Simpan Pengaturan';

  if (res && res.ok && res.data.success) {
    showToast('Pengaturan sistem berhasil disimpan! ✅');
  } else {
    showToast(res?.data?.error || 'Gagal menyimpan pengaturan.', 'error');
  }
});

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Start app
initAuth();
