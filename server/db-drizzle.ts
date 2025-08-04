import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';
import * as schema from '@shared/drizzle-schema';
import path from 'path';

// Carrega as variáveis de ambiente do arquivo .env na raiz do projeto
config({ path: path.resolve(__dirname, '../.env') });

// URL de conexão PostgreSQL
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Configurar conexão PostgreSQL
export const queryClient = postgres(DATABASE_URL);

// Criar instância do Drizzle
export const db = drizzle(queryClient, { schema });

// Testar conexão
export async function testConnection() {
  try {
    // Teste simples de conexão
    await queryClient`SELECT 1 as test`;
    console.log('✅ Conectado ao PostgreSQL com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar ao PostgreSQL:', error);
    return false;
  }
}

// Fechar conexão
export async function closeConnection() {
  await queryClient.end();
}
