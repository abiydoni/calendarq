#!/usr/bin/env node

/**
 * CalendarQ CLI License Key Generator
 * ──────────────────────────────────
 * Digunakan untuk membuat license key langsung dari terminal/command prompt.
 * Mendukung pembuatan single key (dengan format pesan WhatsApp) atau batch (massal).
 *
 * Contoh penggunaan:
 *   node generate-key.js
 *   node generate-key.js --name "Bpk. Budi Santoso" --phone "08123456789" --type lifetime
 *   node generate-key.js --batch 10 --name "Promo Shopee" --type lifetime
 *   node generate-key.js --batch 5 --type annual --months 12 --export keys.txt
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from './db.js';
import { generateKey } from './routes/adminRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple CLI argument parser
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    name: '',
    email: '',
    phone: '',
    type: 'lifetime', // 'lifetime' | 'annual'
    months: 12,
    pc: 2,
    batch: 1,
    notes: '',
    customKey: '',
    exportFile: '',
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--name' || arg === '-n') options.name = args[++i];
    else if (arg === '--email' || arg === '-e') options.email = args[++i];
    else if (arg === '--phone' || arg === '-p') options.phone = args[++i];
    else if (arg === '--type' || arg === '-t') options.type = args[++i] === 'annual' ? 'annual' : 'lifetime';
    else if (arg === '--months' || arg === '-m') options.months = parseInt(args[++i], 10) || 12;
    else if (arg === '--pc') options.pc = parseInt(args[++i], 10) || 2;
    else if (arg === '--batch' || arg === '-b') options.batch = parseInt(args[++i], 10) || 1;
    else if (arg === '--notes') options.notes = args[++i];
    else if (arg === '--key' || arg === '-k') options.customKey = args[++i];
    else if (arg === '--export') options.exportFile = args[++i];
    else if (arg === '--help' || arg === '-h') options.help = true;
  }
  return options;
}

const opts = parseArgs();

if (opts.help) {
  console.log(`
📆 CalendarQ License Key Generator CLI
──────────────────────────────────────
Penggunaan:
  node generate-key.js [options]

Opsi:
  -n, --name <nama>       Nama klien / instansi (Default: "Klien CalendarQ")
  -p, --phone <nomor>     Nomor WhatsApp klien (opsional)
  -e, --email <email>     Email klien (opsional)
  -t, --type <tipe>       Tipe lisensi: 'lifetime' atau 'annual' (Default: lifetime)
  -m, --months <jumlah>   Durasi bulan jika annual (Default: 12)
      --pc <jumlah>       Batas jumlah komputer (Default: 2)
  -b, --batch <jumlah>    Generate banyak key sekaligus (contoh: --batch 10)
  -k, --key <custom_key>  Gunakan key kustom tertentu
      --export <file.txt> Simpan daftar key yang di-generate ke file teks
  -h, --help              Tampilkan bantuan ini

Contoh:
  node generate-key.js --name "Ahmad Fauzi" --phone "0812345678"
  node generate-key.js --batch 5 --name "Voucher Ramadhan" --export keys.txt
`);
  process.exit(0);
}

const isBatch = opts.batch > 1;
const now = Date.now();
let validUntil = null;

if (opts.type === 'annual') {
  const expDate = new Date();
  expDate.setMonth(expDate.getMonth() + (opts.months || 12));
  validUntil = expDate.getTime();
}

console.log('\n======================================================');
console.log(`🔑 CalendarQ License Generator`);
console.log(`   Mode:        ${isBatch ? `BATCH (${opts.batch} Keys)` : 'SINGLE KEY'}`);
console.log(`   Tipe:        ${opts.type.toUpperCase()}${opts.type === 'annual' ? ` (${opts.months} Bulan)` : ' (Selamanya)'}`);
console.log(`   Batas PC:    ${opts.pc} PC per Key`);
console.log('======================================================\n');

const generatedKeys = [];
const insertStmt = db.prepare(`
  INSERT INTO licenses (
    license_key, client_name, client_email, client_phone,
    license_type, status, max_activations, valid_until, notes,
    created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)
`);

db.exec('BEGIN TRANSACTION;');
try {
  for (let i = 0; i < opts.batch; i++) {
    let key;
    if (opts.customKey && !isBatch) {
      key = opts.customKey.trim().toUpperCase();
    } else {
      key = generateKey('CQ');
    }

    const clientName = isBatch
      ? (opts.name ? `${opts.name} #${i + 1}` : `Batch #${i + 1}`)
      : (opts.name || 'Pelanggan CalendarQ');

    insertStmt.run(
      key,
      clientName,
      opts.email || null,
      opts.phone || null,
      opts.type,
      opts.pc,
      validUntil,
      opts.notes || (isBatch ? `Batch Generated (${opts.batch} keys)` : 'CLI Generated'),
      now,
      now
    );

    generatedKeys.push({ key, clientName });
  }
  db.exec('COMMIT;');
} catch (err) {
  db.exec('ROLLBACK;');
  console.error('❌ Gagal membuat lisensi:', err.message);
  process.exit(1);
}

// OUTPUT RESULTS
if (isBatch) {
  console.log(`✅ Berhasil membuat ${generatedKeys.length} License Key:\n`);
  generatedKeys.forEach((item, idx) => {
    console.log(` [${String(idx + 1).padStart(2, '0')}] ${item.key}  →  ${item.clientName}`);
  });

  // Export to file if requested
  if (opts.exportFile) {
    const exportContent = [
      `CALENDARQ LICENSE KEYS (${generatedKeys.length} Keys)`,
      `Dibuat: ${new Date().toLocaleString('id-ID')}`,
      `Tipe: ${opts.type.toUpperCase()} | Batas: ${opts.pc} PC`,
      '--------------------------------------------------',
      ...generatedKeys.map(k => `${k.key}\t(${k.clientName})`),
      '--------------------------------------------------'
    ].join('\n');

    const outPath = path.resolve(process.cwd(), opts.exportFile);
    fs.writeFileSync(outPath, exportContent, 'utf-8');
    console.log(`\n💾 Daftar key telah diekspor ke: ${outPath}`);
  }
} else {
  const single = generatedKeys[0];
  console.log(`✅ Lisensi Baru Berhasil Dibuat!\n`);
  console.log(`   🔑 LICENSE KEY : \x1b[1m\x1b[32m${single.key}\x1b[0m`);
  console.log(`   👤 Klien       : ${single.clientName}`);
  if (opts.phone) console.log(`   📱 WhatsApp    : ${opts.phone}`);
  if (opts.email) console.log(`   📧 Email       : ${opts.email}`);
  console.log(`   💻 Kuota       : Maksimal ${opts.pc} Perangkat PC/Laptop`);
  console.log(`   ⏳ Masa Aktif  : ${opts.type === 'lifetime' ? 'Selamanya (Lifetime)' : `${opts.months} Bulan`}\n`);

  console.log('──────────────────────────────────────────────────────');
  console.log('📱 TEMPLATE PESAN WHATSAPP (SIAP SALIN & KIRIM):');
  console.log('──────────────────────────────────────────────────────');
  console.log(`Halo Kak ${single.clientName.replace('Pelanggan CalendarQ', '') || ''},
Terima kasih atas pembelian CalendarQ! ✨

Berikut detail lisensi Anda:
🔑 License Key: *${single.key}*
💻 Kuota: Maksimal *${opts.pc} Komputer/Laptop*
⏳ Masa Aktif: *${opts.type === 'lifetime' ? 'Lifetime (Selamanya)' : `${opts.months} Bulan`}*

*Cara Aktivasi:*
1. Buka aplikasi CalendarQ di PC Anda.
2. Klik ikon Pengaturan ⚙️ di pojok kanan atas.
3. Pilih menu "Lisensi", lalu masukkan License Key di atas.
4. Klik tombol "Aktifkan".

Jika ada kendala atau ingin memindahkan ke laptop lain, silakan hubungi kami. Selamat beraktivitas! 📆`);
  console.log('──────────────────────────────────────────────────────\n');
}
