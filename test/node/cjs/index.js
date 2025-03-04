if ('Bun' in globalThis) {
  throw new Error('❌ Use Node.js to run this test!');
}

const { createMirror } = require('exact-mirror');

if (typeof createMirror !== 'function') {
  throw new Error('❌ CommonJS Node.js failed');
}

console.log('✅ CommonJS Node.js works!');
