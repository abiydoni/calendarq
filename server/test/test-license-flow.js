import assert from 'node:assert';
import { handleActivate, handleValidate, handleDeactivate } from '../routes/licenseRoutes.js';
import {
  handleAdminLogin,
  handleGetStats,
  handleGetLicenses,
  handleCreateLicense,
  handleUpdateLicense,
  handleDeleteLicense,
  handleGetLicenseActivations,
  handleDeleteActivation
} from '../routes/adminRoutes.js';
import {
  handleRegisterUser,
  handleGetUsers,
  handleExportUsersCsv
} from '../routes/userRoutes.js';

console.log('🧪 Running CalendarQ License Flow Tests...\n');

// 1. Admin Login
console.log('Test 1: Admin Login with default credentials...');
const loginRes = handleAdminLogin({ username: 'admin', password: 'admin123' });
assert.strictEqual(loginRes.status, 200);
assert.ok(loginRes.data.token, 'Token should be returned');
console.log('✅ Admin login succeeded. Token generated.');

// 2. Create New License
console.log('\nTest 2: Create a new Lifetime License for "PT Maju Bersama" (max 2 PC)...');
const createRes = handleCreateLicense({
  client_name: 'PT Maju Bersama',
  client_email: 'finance@majubersama.com',
  client_phone: '08123456789',
  license_type: 'lifetime',
  max_activations: 2,
  notes: 'Invoice #INV-2026-001'
});
assert.strictEqual(createRes.status, 201);
const license = createRes.data.license;
assert.ok(license.license_key.startsWith('CQ-'));
assert.strictEqual(license.max_activations, 2);
console.log(`✅ License created: Key=${license.license_key}, ID=${license.id}`);

// 3. Activate First PC
console.log('\nTest 3: Activate PC 1 (DESKTOP-OFFICE)...');
const act1 = handleActivate({
  key: license.license_key,
  machineId: 'MACHINE_HASH_001_OFFICE',
  machineName: 'DESKTOP-OFFICE',
  platform: 'win32'
});
assert.strictEqual(act1.status, 200);
assert.strictEqual(act1.data.success, true);
console.log('✅ PC 1 activation succeeded.');

// 4. Validate First PC
console.log('\nTest 4: Validate PC 1 heartbeat...');
const val1 = handleValidate({
  key: license.license_key,
  machineId: 'MACHINE_HASH_001_OFFICE'
});
assert.strictEqual(val1.status, 200);
assert.strictEqual(val1.data.valid, true);
assert.strictEqual(val1.data.status, 'active');
console.log('✅ PC 1 validation valid and active.');

// 5. Activate Second PC
console.log('\nTest 5: Activate PC 2 (LAPTOP-TRAVEL)...');
const act2 = handleActivate({
  key: license.license_key,
  machineId: 'MACHINE_HASH_002_LAPTOP',
  machineName: 'LAPTOP-TRAVEL',
  platform: 'win32'
});
assert.strictEqual(act2.status, 200);
assert.strictEqual(act2.data.success, true);
console.log('✅ PC 2 activation succeeded (2/2 slots used).');

// 6. Attempt Activate Third PC (Must exceed limit)
console.log('\nTest 6: Attempt activate PC 3 (HOME-PC) — should be rejected...');
const act3 = handleActivate({
  key: license.license_key,
  machineId: 'MACHINE_HASH_003_HOME',
  machineName: 'HOME-PC',
  platform: 'win32'
});
assert.strictEqual(act3.status, 403);
assert.strictEqual(act3.data.code, 'TOO_MANY_MACHINES');
console.log('✅ PC 3 was properly rejected due to device limit (max 2 PC).');

// 7. Check Activations List in Admin
console.log('\nTest 7: Admin check activations list...');
const actListRes = handleGetLicenseActivations(license.id);
assert.strictEqual(actListRes.status, 200);
assert.strictEqual(actListRes.data.activations.length, 2);
console.log(`✅ Admin retrieved 2 registered devices.`);

// 8. Deactivate PC 1 (User frees up slot)
console.log('\nTest 8: Deactivate PC 1 to free up slot...');
const deactRes = handleDeactivate({
  key: license.license_key,
  machineId: 'MACHINE_HASH_001_OFFICE'
});
assert.strictEqual(deactRes.status, 200);
assert.strictEqual(deactRes.data.success, true);

// Check that slot is now free
const actListAfter = handleGetLicenseActivations(license.id);
assert.strictEqual(actListAfter.data.activations.length, 1);
console.log('✅ PC 1 deactivated, active devices now: 1/2.');

// 9. Now Activate PC 3 (Should now succeed)
console.log('\nTest 9: Re-attempt activate PC 3 on freed slot...');
const act3Retry = handleActivate({
  key: license.license_key,
  machineId: 'MACHINE_HASH_003_HOME',
  machineName: 'HOME-PC',
  platform: 'win32'
});
assert.strictEqual(act3Retry.status, 200);
assert.strictEqual(act3Retry.data.success, true);
console.log('✅ PC 3 successfully activated on the freed slot.');

// 10. Admin Suspends the License
console.log('\nTest 10: Admin suspends license...');
const updateRes = handleUpdateLicense(license.id, { status: 'suspended' });
assert.strictEqual(updateRes.status, 200);
assert.strictEqual(updateRes.data.license.status, 'suspended');

// Validate PC 2 while suspended -> should fail
const valSuspended = handleValidate({
  key: license.license_key,
  machineId: 'MACHINE_HASH_002_LAPTOP'
});
assert.strictEqual(valSuspended.status, 403);
assert.strictEqual(valSuspended.data.code, 'SUSPENDED');
console.log('✅ Suspended license properly rejected on heartbeat check.');

// 11. Admin Reactivates the License
console.log('\nTest 11: Admin reactivates license...');
handleUpdateLicense(license.id, { status: 'active' });
const valReactivated = handleValidate({
  key: license.license_key,
  machineId: 'MACHINE_HASH_002_LAPTOP'
});
assert.strictEqual(valReactivated.status, 200);
assert.strictEqual(valReactivated.data.valid, true);
console.log('✅ Reactivated license passes validation again.');

// 12. Check Stats
console.log('\nTest 12: Check dashboard stats...');
const statsRes = handleGetStats();
assert.strictEqual(statsRes.status, 200);
assert.ok(statsRes.data.totalLicenses >= 1);
console.log(`✅ Stats retrieved: Total=${statsRes.data.totalLicenses}, Activations=${statsRes.data.totalActivations}`);

// Clean up test license
handleDeleteLicense(license.id);
console.log('\n🧹 Test license cleaned up.');

// 13. User Registration on First Install
console.log('\nTest 13: Register new user on first install (mandatory email)...');
const testMachineId = 'PC_HENDRA_' + Date.now();
const regRes = handleRegisterUser({
  name: 'Bpk. Hendra Gunawan',
  email: 'hendra.gunawan@gmail.com',
  machineId: testMachineId,
  machineName: 'DESKTOP-HENDRA',
  platform: 'win32'
});
assert.strictEqual(regRes.status, 201);
assert.strictEqual(regRes.data.success, true);
assert.strictEqual(regRes.data.user.email, 'hendra.gunawan@gmail.com');
console.log('✅ User registered successfully for 14-day trial.');

// 14. Invalid Email Rejection
console.log('\nTest 14: User registration with invalid email should be rejected...');
const regInvalid = handleRegisterUser({
  name: 'No Email User',
  email: 'not-an-email',
  machineId: 'PC_INVALID_EMAIL'
});
assert.strictEqual(regInvalid.status, 400);
assert.strictEqual(regInvalid.data.success, false);
console.log('✅ Invalid email properly rejected.');

// 15. Admin User Listing & CSV Export
console.log('\nTest 15: Admin retrieve user list and export CSV...');
const usersList = handleGetUsers();
assert.strictEqual(usersList.status, 200);
assert.ok(usersList.data.users.length >= 1);
const csvRes = handleExportUsersCsv();
assert.strictEqual(csvRes.status, 200);
assert.ok(csvRes.data.includes('hendra.gunawan@gmail.com'));
console.log(`✅ User list retrieved (${usersList.data.users.length} users) and CSV export verified.`);

console.log('\n🎉 ALL 15 TESTS PASSED SUCCESSFULLY! 🚀\n');
