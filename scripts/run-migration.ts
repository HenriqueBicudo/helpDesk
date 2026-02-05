// Script para aplicar migrações SQL
import dotenv from 'dotenv';
import path from 'path';
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

// Carregar .env da pasta raiz
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL não encontrada no .env');
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL);

async function runMigration(migrationNumber: string) {
  try {
    const migrationFile = join(process.cwd(), 'migrations', `${migrationNumber}_*.sql`);
    
    // Encontrar o arquivo que começa com o número
    const fs = await import('fs/promises');
    const files = await fs.readdir(join(process.cwd(), 'migrations'));
    const targetFile = files.find(f => f.startsWith(migrationNumber));
    
    if (!targetFile) {
      console.error(`❌ Migração ${migrationNumber} não encontrada`);
      process.exit(1);
    }
    
    console.log(`📝 Executando migração: ${targetFile}\n`);
    
    const migrationPath = join(process.cwd(), 'migrations', targetFile);
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    // Executar a migração
    await sql.unsafe(migrationSQL);
    
    console.log('✅ Migração executada com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao executar migração:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

const migrationNumber = process.argv[2];
if (!migrationNumber) {
  console.error('❌ Uso: node --loader ts-node/esm scripts/run-migration.ts <numero>');
  console.error('   Exemplo: node --loader ts-node/esm scripts/run-migration.ts 0022');
  process.exit(1);
}

runMigration(migrationNumber);
