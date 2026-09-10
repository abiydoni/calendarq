import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyToken } from './auth.js';
import { handleActivate, handleValidate, handleDeactivate } from './routes/licenseRoutes.js';
import {
  handleAdminLogin,
  handleGetStats,
  handleGetLicenses,
  handleCreateLicense,
  handleUpdateLicense,
  handleDeleteLicense,
  handleGetLicenseActivations,
  handleDeleteActivation,
  handleChangePassword,
  handleBatchCreateLicenses,
  handleGetSettings,
  handleUpdateSettings
} from './routes/adminRoutes.js';
import {
  handleRegisterUser,
  handleUserPing,
  handleGetUsers,
  handleDeleteUser,
  handleExportUsersCsv
} from './routes/userRoutes.js';
import {
  handleCreateOrder,
  handleGetOrders,
  handleGetOrderProof,
  handleApproveOrder,
  handleRejectOrder
} from './routes/orderRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');

const PORT = process.env.PORT || 3001;

// Helper to send JSON response
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

// Helper to parse JSON body
function parseJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      // limit body size to 1MB
      if (body.length > 1024 * 1024) {
        req.destroy();
        resolve(null);
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve(null);
      }
    });
    req.on('error', () => resolve(null));
  });
}

// MIME types for static dashboard files
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
};

function serveStatic(req, res, pathname) {
  let relative = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  const filePath = path.normalize(path.join(publicDir, relative));

  // Prevent directory traversal
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    return fs.createReadStream(filePath).pipe(res);
  }

  // Fallback to index.html for SPA routes
  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return fs.createReadStream(indexPath).pipe(res);
  }

  res.writeHead(404);
  res.end('Not Found');
}

// Main HTTP request listener
const server = http.createServer(async (req, res) => {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  /* ─────────────────── PUBLIC LICENSE APIs (Called by Electron) ─────────────────── */
  if (pathname === '/api/license/activate' && method === 'POST') {
    const body = await parseJsonBody(req);
    if (body === null) return sendJson(res, 400, { success: false, error: 'Invalid JSON body' });
    const result = handleActivate(body);
    return sendJson(res, result.status, result.data);
  }

  if (pathname === '/api/license/validate' && method === 'POST') {
    const body = await parseJsonBody(req);
    if (body === null) return sendJson(res, 400, { valid: false, code: 'INVALID_JSON' });
    const result = handleValidate(body);
    return sendJson(res, result.status, result.data);
  }

  if (pathname === '/api/license/deactivate' && method === 'POST') {
    const body = await parseJsonBody(req);
    if (body === null) return sendJson(res, 400, { success: false, error: 'Invalid JSON body' });
    const result = handleDeactivate(body);
    return sendJson(res, result.status, result.data);
  }

  /* ─────────────────── PUBLIC USER ONBOARDING / PING APIs ─────────────────── */
  if (pathname === '/api/users/register' && method === 'POST') {
    const body = await parseJsonBody(req);
    if (body === null) return sendJson(res, 400, { success: false, error: 'Invalid JSON body' });
    const result = handleRegisterUser(body);
    return sendJson(res, result.status, result.data);
  }

  if (pathname === '/api/users/ping' && method === 'POST') {
    const body = await parseJsonBody(req);
    if (body === null) return sendJson(res, 400, { success: false });
    const result = handleUserPing(body);
    return sendJson(res, result.status, result.data);
  }

  /* ─────────────────── PUBLIC SETTINGS APIs ─────────────────── */
  if (pathname === '/api/public/settings' && method === 'GET') {
    const result = handleGetSettings();
    return sendJson(res, result.status, result.data);
  }

  /* ─────────────────── PUBLIC ORDERS APIs ─────────────────── */
  if (pathname === '/api/public/orders' && method === 'POST') {
    const body = await parseJsonBody(req);
    if (body === null) return sendJson(res, 400, { success: false, error: 'Invalid JSON body' });
    const result = handleCreateOrder(body);
    return sendJson(res, result.status, result.data);
  }

  /* ─────────────────── PUBLIC ADMIN LOGIN ─────────────────── */
  if (pathname === '/api/admin/login' && method === 'POST') {
    const body = await parseJsonBody(req);
    if (body === null) return sendJson(res, 400, { success: false, error: 'Invalid JSON body' });
    const result = handleAdminLogin(body);
    return sendJson(res, result.status, result.data);
  }

  /* ─────────────────── PROTECTED ADMIN APIs ─────────────────── */
  if (pathname.startsWith('/api/admin/')) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const adminUser = verifyToken(token);

    if (!adminUser) {
      return sendJson(res, 401, { success: false, error: 'Sesi login tidak valid atau telah kedaluwarsa.' });
    }

    // GET /api/admin/me
    if (pathname === '/api/admin/me' && method === 'GET') {
      return sendJson(res, 200, { success: true, user: adminUser });
    }

    // GET /api/admin/stats
    if (pathname === '/api/admin/stats' && method === 'GET') {
      const result = handleGetStats();
      return sendJson(res, result.status, result.data);
    }

    // GET /api/admin/licenses
    if (pathname === '/api/admin/licenses' && method === 'GET') {
      const query = Object.fromEntries(parsedUrl.searchParams);
      const result = handleGetLicenses(query);
      return sendJson(res, result.status, result.data);
    }

    // POST /api/admin/licenses (Create Single)
    if (pathname === '/api/admin/licenses' && method === 'POST') {
      const body = await parseJsonBody(req);
      if (body === null) return sendJson(res, 400, { success: false, error: 'Invalid JSON body' });
      const result = handleCreateLicense(body);
      return sendJson(res, result.status, result.data);
    }

    // POST /api/admin/licenses/batch (Create Multiple)
    if (pathname === '/api/admin/licenses/batch' && method === 'POST') {
      const body = await parseJsonBody(req);
      if (body === null) return sendJson(res, 400, { success: false, error: 'Invalid JSON body' });
      const result = handleBatchCreateLicenses(body);
      return sendJson(res, result.status, result.data);
    }

    // Match /api/admin/licenses/:id/activations
    const activationsMatch = pathname.match(/^\/api\/admin\/licenses\/(\d+)\/activations$/);
    if (activationsMatch && method === 'GET') {
      const licenseId = activationsMatch[1];
      const result = handleGetLicenseActivations(licenseId);
      return sendJson(res, result.status, result.data);
    }

    // Match /api/admin/licenses/:id (PATCH or DELETE)
    const licenseMatch = pathname.match(/^\/api\/admin\/licenses\/(\d+)$/);
    if (licenseMatch) {
      const licenseId = licenseMatch[1];
      if (method === 'PATCH') {
        const body = await parseJsonBody(req);
        if (body === null) return sendJson(res, 400, { success: false, error: 'Invalid JSON body' });
        const result = handleUpdateLicense(licenseId, body);
        return sendJson(res, result.status, result.data);
      }
      if (method === 'DELETE') {
        const result = handleDeleteLicense(licenseId);
        return sendJson(res, result.status, result.data);
      }
    }

    // Match /api/admin/activations/:id (DELETE / Reset slot)
    const activationMatch = pathname.match(/^\/api\/admin\/activations\/(\d+)$/);
    if (activationMatch && method === 'DELETE') {
      const activationId = activationMatch[1];
      const result = handleDeleteActivation(activationId);
      return sendJson(res, result.status, result.data);
    }

    // POST /api/admin/change-password
    if (pathname === '/api/admin/change-password' && method === 'POST') {
      const body = await parseJsonBody(req);
      if (body === null) return sendJson(res, 400, { success: false, error: 'Invalid JSON body' });
      const result = handleChangePassword(adminUser.id, body);
      return sendJson(res, result.status, result.data);
    }

    // GET /api/admin/settings
    if (pathname === '/api/admin/settings' && method === 'GET') {
      const result = handleGetSettings();
      return sendJson(res, result.status, result.data);
    }

    // PATCH /api/admin/settings
    if (pathname === '/api/admin/settings' && method === 'PATCH') {
      const body = await parseJsonBody(req);
      if (body === null) return sendJson(res, 400, { success: false, error: 'Invalid JSON body' });
      const result = handleUpdateSettings(body);
      return sendJson(res, result.status, result.data);
    }

    /* ── Admin Orders Management ── */
    if (pathname === '/api/admin/orders' && method === 'GET') {
      const query = Object.fromEntries(parsedUrl.searchParams);
      const result = handleGetOrders(query);
      return sendJson(res, result.status, result.data);
    }
    
    const orderProofMatch = pathname.match(/^\/api\/admin\/orders\/(\d+)\/proof$/);
    if (orderProofMatch && method === 'GET') {
      const orderId = orderProofMatch[1];
      const result = handleGetOrderProof(orderId);
      return sendJson(res, result.status, result.data);
    }

    const orderApproveMatch = pathname.match(/^\/api\/admin\/orders\/(\d+)\/approve$/);
    if (orderApproveMatch && method === 'POST') {
      const orderId = orderApproveMatch[1];
      const result = handleApproveOrder(orderId);
      return sendJson(res, result.status, result.data);
    }

    const orderRejectMatch = pathname.match(/^\/api\/admin\/orders\/(\d+)\/reject$/);
    if (orderRejectMatch && method === 'POST') {
      const orderId = orderRejectMatch[1];
      const result = handleRejectOrder(orderId);
      return sendJson(res, result.status, result.data);
    }

    /* ── Admin User Management ── */
    // GET /api/admin/users
    if (pathname === '/api/admin/users' && method === 'GET') {
      const query = Object.fromEntries(parsedUrl.searchParams);
      const result = handleGetUsers(query);
      return sendJson(res, result.status, result.data);
    }

    // GET /api/admin/users/export (CSV)
    if (pathname === '/api/admin/users/export' && method === 'GET') {
      const result = handleExportUsersCsv();
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="calendarq-users.csv"',
        'Access-Control-Allow-Origin': '*'
      });
      return res.end(result.data);
    }

    // DELETE /api/admin/users/:id
    const userMatch = pathname.match(/^\/api\/admin\/users\/(\d+)$/);
    if (userMatch && method === 'DELETE') {
      const userId = userMatch[1];
      const result = handleDeleteUser(userId);
      return sendJson(res, result.status, result.data);
    }

    return sendJson(res, 404, { success: false, error: 'Endpoint admin tidak ditemukan.' });
  }

  /* ─────────────────── STATIC ADMIN DASHBOARD WEB ─────────────────── */
  return serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 CalendarQ License Server running on port ${PORT}`);
  console.log(`🌐 Admin Dashboard: http://localhost:${PORT}`);
  console.log(`🔑 License API:     http://localhost:${PORT}/api/license`);
  console.log(`======================================================\n`);
});

export default server;
