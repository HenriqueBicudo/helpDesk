import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
const { Pool } = pg;
import { readFileSync } from 'fs';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || "postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk"
});

const db = drizzle(pool);

async function runMigration() {
  try {
    const migration = readFileSync('./migrations/0025_add_team_id_to_services.sql', 'utf8');
    await pool.query(migration);
    console.log('Migration 0025 aplicada com sucesso!');
  } catch (error) {
    console.error('Erro ao aplicar migration:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
