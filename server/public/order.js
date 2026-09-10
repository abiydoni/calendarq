const API_BASE = window.location.origin;

let selectedPackage = 'annual';
let base64Proof = null;

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

// Format Rupiah
function formatRupiah(number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
}

// Load Settings (Prices & Bank)
async function init() {
  try {
    const res = await fetch(`${API_BASE}/api/public/settings`);
    const { settings } = await res.json();
    
    document.getElementById('loading').style.display = 'none';
    document.getElementById('orderForm').style.display = 'block';
    
    // Render Bank
    const bankWrap = document.getElementById('bankWrap');
    if (settings.bank_account) {
      bankWrap.innerHTML = `
        <h3>💳 Transfer Pembayaran ke:</h3>
        <div class="account">${settings.bank_name || 'BANK'} ${settings.bank_account}</div>
        <div style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">a/n ${settings.bank_owner || '-'}</div>
      `;
    } else {
      bankWrap.innerHTML = `
        <h3>💳 Metode Pembayaran</h3>
        <div style="font-size: 13px; color: var(--text-secondary);">Silakan hubungi Admin untuk informasi rekening.</div>
      `;
    }
    
    // Render Packages
    const annualPrice = settings.price_annual || '50000';
    const lifetimePrice = settings.price_lifetime || '150000';
    
    const packagesWrap = document.getElementById('packagesWrap');
    packagesWrap.innerHTML = `
      <div class="pkg-card selected" id="pkg-annual" onclick="selectPackage('annual')">
        <div class="pkg-name">Paket Tahunan (1 Tahun)</div>
        <div class="pkg-price">${formatRupiah(annualPrice)}</div>
        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 6px;">Masa aktif 1 tahun, bisa digunakan untuk 2 perangkat PC.</div>
      </div>
      <div class="pkg-card" id="pkg-lifetime" onclick="selectPackage('lifetime')">
        <div class="pkg-name">Paket Selamanya (Lifetime)</div>
        <div class="pkg-price">${formatRupiah(lifetimePrice)}</div>
        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 6px;">Masa aktif seumur hidup, bisa digunakan untuk 2 perangkat PC.</div>
      </div>
    `;
    
  } catch (err) {
    document.getElementById('loading').textContent = 'Gagal memuat data. Silakan refresh halaman.';
  }
}

// Select Package
window.selectPackage = function(id) {
  selectedPackage = id;
  document.getElementById('pkg-annual').classList.remove('selected');
  document.getElementById('pkg-lifetime').classList.remove('selected');
  document.getElementById(`pkg-${id}`).classList.add('selected');
};

// Handle Image Upload & Compression
document.getElementById('proofFile').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  if (!file.type.startsWith('image/')) {
    showToast('File harus berupa gambar', 'error');
    this.value = '';
    return;
  }
  
  if (file.size > 5 * 1024 * 1024) {
    showToast('Ukuran gambar maksimal 5MB', 'error');
    this.value = '';
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(event) {
    const img = new Image();
    img.onload = function() {
      // Compress using Canvas
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 800;
      let width = img.width;
      let height = img.height;
      
      if (width > MAX_WIDTH) {
        height = Math.floor(height * (MAX_WIDTH / width));
        width = MAX_WIDTH;
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      base64Proof = canvas.toDataURL('image/jpeg', 0.7);
      
      const preview = document.getElementById('previewImg');
      preview.src = base64Proof;
      preview.style.display = 'block';
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

// Submit Order
document.getElementById('orderForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!base64Proof) {
    showToast('Silakan unggah bukti transfer terlebih dahulu.', 'error');
    return;
  }
  
  const body = {
    client_name: document.getElementById('clientName').value,
    client_email: document.getElementById('clientEmail').value,
    package_id: selectedPackage,
    proof_image: base64Proof
  };
  
  const btn = document.getElementById('btnSubmit');
  btn.disabled = true;
  btn.textContent = 'Mengirim... ⏳';
  
  try {
    const res = await fetch(`${API_BASE}/api/public/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    
    if (res.ok && data.success) {
      document.getElementById('orderWrap').style.display = 'none';
      document.getElementById('successWrap').style.display = 'block';
    } else {
      showToast(data.error || 'Gagal mengirim pesanan.', 'error');
      btn.disabled = false;
      btn.textContent = 'Kirim Pemesanan 🚀';
    }
  } catch (err) {
    showToast('Terjadi kesalahan jaringan.', 'error');
    btn.disabled = false;
    btn.textContent = 'Kirim Pemesanan 🚀';
  }
});

// Init
init();
