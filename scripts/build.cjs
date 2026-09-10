// Disable Electron's ASAR virtual filesystem interception
process.noAsar = true;
process.env.ELECTRON_NO_ASAR = '1';

const builder = require('electron-builder');
const path = require('path');

console.log('🚀 Starting CalendarQ packaging with electron-builder...');
console.log('Node version:', process.version);
console.log('Platform:', process.platform, process.arch);
console.log('noAsar flag set:', process.noAsar);

builder.build({
  targets: builder.Platform.WINDOWS.createTarget(['nsis', 'portable']),
  projectDir: path.resolve(__dirname, '..')
})
  .then((result) => {
    console.log('✅ Packaging finished successfully!');
    console.log('Generated installer and binaries:');
    result.forEach((f) => console.log(' - ' + f));
  })
  .catch((err) => {
    console.error('❌ Build error:', err);
    process.exit(1);
  });
