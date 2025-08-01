"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = void 0;
// Import storage implementations
const postgres_storage_1 = require("./postgres-storage");
// Choose storage implementation based on environment
const dbType = process.env.DB_TYPE || 'postgres';
let storage;
switch (dbType) {
    case 'postgres':
        console.log('Using PostgreSQL storage');
        exports.storage = storage = new postgres_storage_1.PostgresStorage();
        break;
    default:
        console.log('Using PostgreSQL storage (default)');
        exports.storage = storage = new postgres_storage_1.PostgresStorage();
}
