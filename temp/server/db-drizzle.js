"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.queryClient = void 0;
exports.testConnection = testConnection;
exports.closeConnection = closeConnection;
const postgres_js_1 = require("drizzle-orm/postgres-js");
const postgres_1 = __importDefault(require("postgres"));
const dotenv_1 = require("dotenv");
const schema = __importStar(require("@shared/drizzle-schema"));
// Carrega as variáveis de ambiente
(0, dotenv_1.config)();
// URL de conexão PostgreSQL
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
}
// Configurar conexão PostgreSQL
exports.queryClient = (0, postgres_1.default)(DATABASE_URL);
// Criar instância do Drizzle
exports.db = (0, postgres_js_1.drizzle)(exports.queryClient, { schema });
// Testar conexão
async function testConnection() {
    try {
        // Teste simples de conexão
        await (0, exports.queryClient) `SELECT 1 as test`;
        console.log('✅ Conectado ao PostgreSQL com sucesso!');
        return true;
    }
    catch (error) {
        console.error('❌ Erro ao conectar ao PostgreSQL:', error);
        return false;
    }
}
// Fechar conexão
async function closeConnection() {
    await exports.queryClient.end();
}
