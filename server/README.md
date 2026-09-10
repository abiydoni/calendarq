# CalendarQ Self-Hosted License Server & Admin Dashboard

Server lisensi mandiri untuk aplikasi desktop **CalendarQ**. Dibuat dengan arsitektur super ringan (Zero-Config SQLite, native Node.js), siap dideploy ke server VPS Linux (Ubuntu / Debian / AlmaLinux) atau Windows Server.

---

## Fitur Utama

1. **Admin Web Dashboard Modern**:
   - Tampilan dark-mode elegan & responsif.
   - Statistik lisensi (Total, Aktif, Perangkat Terhubung, Expired/Suspended).
   - Pembuatan License Key otomatis (`CQ-XXXX-XXXX-XXXX`) atau custom.
   - Manajemen perangkat (lihat nama PC/laptop yang aktif, reset slot perangkat jika klien ganti PC).
   - Penangguhan (*suspend*) dan pencabutan (*revoke*) lisensi dalam 1 klik.
2. **API Lisensi untuk Client Electron**:
   - `POST /api/license/activate` — Aktivasi perangkat baru (cek kuota max PC).
   - `POST /api/license/validate` — Verifikasi status online berkala (heartbeat).
   - `POST /api/license/deactivate` — Nonaktifkan perangkat agar slot bisa dipindah.
3. **Database SQLite Terintegrasi**:
   - Tidak perlu install database engine terpisah (MySQL/PostgreSQL).
   - Database otomatis tersimpan di `data/licenses.db`.
   - Backup semudah menyalin file `.db`.

---

## Cara Menjalankan Secara Lokal (Pengujian)

1. Jalankan server:
   ```bash
   node server.js
   ```
2. Buka browser:
   - Dashboard: [http://localhost:3001](http://localhost:3001)
   - Login default:
     - **Username**: `admin`
     - **Password**: `admin123`
3. Jangan lupa ubah password Anda di tombol **"Ganti Password"** setelah login!

---

## Generator Key (CLI Terminal & Web Dashboard)

Anda memiliki 2 cara mudah untuk membuat license key:

### Opsi 1: Lewat Web Admin Dashboard (Browser)
- Buka `http://localhost:3001` (atau URL server Anda).
- Klik **"+ Buat Lisensi Baru"** untuk 1 lisensi.
- Klik **"📦 Generate Massal (Batch)"** untuk membuat 5, 10, 50 key sekaligus (bisa langsung salin semua atau unduh file `.txt`).

### Opsi 2: Lewat Command Line (Terminal / CLI)
Cocok jika Anda sedang SSH ke server dan ingin cepat membuat key tanpa membuka browser:
```bash
# Buat 1 key cepat (otomatis menyertakan template pesan WhatsApp siap kirim ke pembeli):
node generate-key.js --name "Bpk. Budi Santoso" --phone "08123456789"

# Buat lisensi tahunan (12 bulan):
node generate-key.js --name "PT Maju Jaya" --type annual --months 12

# Generate banyak key sekaligus (Batch/Massal):
node generate-key.js --batch 10 --name "Promo Shopee" --export keys.txt
```

---

## Panduan Deployment ke Server VPS Pribadi (Ubuntu / Debian)

### 1. Upload Folder `server/` ke VPS Anda
Anda bisa menggunakan SCP, SFTP, Git, atau rsync:
```bash
# Contoh upload via rsync:
rsync -avz server/ user@IP_SERVER_ANDA:/var/www/calendarq-license/
```

### 2. Jalankan dengan PM2 (Background Daemon)
Pastikan Node.js (v20 atau v22 LTS) sudah terinstall di VPS.
```bash
cd /var/www/calendarq-license

# Install PM2 jika belum ada
npm install -g pm2

# Jalankan server
pm2 start ecosystem.config.cjs

# Simpan agar otomatis hidup saat server reboot
pm2 save
pm2 startup
```

### 3. Konfigurasi Nginx Reverse Proxy & SSL (HTTPS)
Sangat direkomendasikan menghubungkan server ke subdomain Anda (contoh: `license.domainanda.com`).

Buat file konfigurasi Nginx:
```bash
sudo nano /etc/nginx/sites-available/license.domainanda.com
```

Isi dengan konfigurasi berikut:
```nginx
server {
    server_name license.domainanda.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Aktifkan konfigurasi dan pasang SSL gratis dari Let's Encrypt:
```bash
sudo ln -s /etc/nginx/sites-available/license.domainanda.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Pasang SSL Certbot
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d license.domainanda.com
```

Selesai! Sekarang server lisensi Anda berjalan aman di `https://license.domainanda.com`.

---

## Menghubungkan ke Aplikasi Desktop CalendarQ

Pada file `electron/license.js` di aplikasi CalendarQ, cukup ubah nilai `DEFAULT_LICENSE_SERVER`:
```javascript
const DEFAULT_LICENSE_SERVER = 'https://license.domainanda.com';
```
Aplikasi pengguna akan otomatis memvalidasi lisensi ke server pribadi Anda!

---

## Backup Data
File database tersimpan di:
`/var/www/calendarq-license/data/licenses.db`

Untuk backup rutin, cukup jadwalkan cron job menyalin file tersebut ke folder backup atau Google Drive/S3.
