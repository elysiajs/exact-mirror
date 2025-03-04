if ('Bun' in globalThis) {
  throw new Error('❌ Use Node.js to run this test!');
}

import { createMirror } from 'exact-mirror';

if (typeof createMirror !== 'function') {
  throw new Error('❌ ESM Node.js failed');
}

console.log('✅ ESM Node.js works!');
