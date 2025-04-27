// Script para iniciar o servidor com armazenamento em memória
// Execute com: node start-local.js

process.env.DB_TYPE = 'memory';

// Require o servidor
require('tsx/cjs/tsm/index.js')('./server/index.ts');