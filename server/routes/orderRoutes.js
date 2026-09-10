import db from '../db.js';
import { generateKey } from './adminRoutes.js';

export function handleCreateOrder(body) {
  const { client_name, client_email, package_id, proof_image } = body || {};

  if (!client_name || !client_email || !package_id || !proof_image) {
    return { status: 400, data: { success: false, error: 'Data tidak lengkap. Mohon isi semua field dan unggah bukti transfer.' } };
  }

  try {
    const now = Date.now();
    const result = db.prepare(`
      INSERT INTO orders (client_name, client_email, package_id, proof_image, status, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `).run(client_name.trim(), client_email.trim(), package_id, proof_image, now);

    return { status: 201, data: { success: true, message: 'Pesanan berhasil dikirim. Kami akan memprosesnya segera.' } };
  } catch (err) {
    return { status: 500, data: { success: false, error: 'Gagal menyimpan pesanan: ' + err.message } };
  }
}

export function handleGetOrders(query) {
  const status = query.status || '';
  let sql = 'SELECT id, client_name, client_email, package_id, status, created_at FROM orders';
  const params = [];
  
  if (status) {
    sql += ' WHERE status = ?';
    params.push(status);
  }
  
  sql += ' ORDER BY created_at DESC';
  
  try {
    const orders = db.prepare(sql).all(...params);
    return { status: 200, data: { success: true, orders } };
  } catch (err) {
    return { status: 500, data: { success: false, error: 'Gagal mengambil data pesanan.' } };
  }
}

export function handleGetOrderProof(id) {
  const orderId = parseInt(id, 10);
  try {
    const order = db.prepare('SELECT proof_image FROM orders WHERE id = ?').get(orderId);
    if (!order) return { status: 404, data: { success: false, error: 'Pesanan tidak ditemukan' } };
    return { status: 200, data: { success: true, proof_image: order.proof_image } };
  } catch (err) {
    return { status: 500, data: { success: false, error: 'Gagal mengambil gambar.' } };
  }
}

export function handleApproveOrder(id) {
  const orderId = parseInt(id, 10);
  
  db.exec('BEGIN TRANSACTION;');
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order) throw new Error('Pesanan tidak ditemukan');
    if (order.status !== 'pending') throw new Error('Pesanan sudah diproses sebelumnya');

    // Generate License
    let license_type = 'lifetime';
    let valid_until = null;
    
    if (order.package_id === 'annual') {
      license_type = 'annual';
      const expDate = new Date();
      expDate.setFullYear(expDate.getFullYear() + 1); // 1 Year
      valid_until = expDate.getTime();
    }

    const key = generateKey();
    const now = Date.now();

    const result = db.prepare(`
      INSERT INTO licenses (
        license_key, client_name, client_email,
        license_type, status, max_activations, valid_until, notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'active', 2, ?, ?, ?, ?)
    `).run(
      key,
      order.client_name,
      order.client_email,
      license_type,
      valid_until,
      'Web Order #' + orderId,
      now,
      now
    );

    // Update order status
    db.prepare("UPDATE orders SET status = 'approved' WHERE id = ?").run(orderId);
    
    db.exec('COMMIT;');
    
    return { status: 200, data: { success: true, message: 'Pesanan diterima dan lisensi berhasil dibuat.', license_key: key, client_name: order.client_name, client_email: order.client_email } };
  } catch (err) {
    db.exec('ROLLBACK;');
    return { status: 500, data: { success: false, error: err.message } };
  }
}

export function handleRejectOrder(id) {
  const orderId = parseInt(id, 10);
  try {
    const result = db.prepare("UPDATE orders SET status = 'rejected' WHERE id = ?").run(orderId);
    if (result.changes === 0) return { status: 404, data: { success: false, error: 'Pesanan tidak ditemukan' } };
    return { status: 200, data: { success: true, message: 'Pesanan ditolak.' } };
  } catch (err) {
    return { status: 500, data: { success: false, error: 'Gagal menolak pesanan.' } };
  }
}
