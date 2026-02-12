import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/drizzle-schema';

// Carregar .env da pasta raiz (se existir - em Docker, variáveis vêm do docker-compose)
const envPath = path.resolve(__dirname, '../.env');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  // Em Docker, as variáveis já estão disponíveis via docker-compose env_file
  dotenv.config();
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Criar conexão PostgreSQL
const client = postgres(process.env.DATABASE_URL, {
  max: 10,
  idle_timeout: 30,
});

// Inicializar Drizzle ORM com a instância PostgreSQL
export const db = drizzle(client, { schema });

export { client };
