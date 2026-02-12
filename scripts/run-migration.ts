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
    // Em Docker, process.cwd() pode ser /app/server, então procuramos no diretório pai também
    const possiblePaths = [
      join(process.cwd(), 'migrations'),
      join(process.cwd(), '..', 'migrations'),
    ];
    
    let migrationsDir = possiblePaths[0];
    const fs = await import('fs/promises');
    
    // Encontrar o diretório de migrações correto
    for (const testPath of possiblePaths) {
      try {
        await fs.access(testPath);
        migrationsDir = testPath;
        break;
      } catch {
        continue;
      }
    }
    
    // Encontrar o arquivo que começa com o número
    const files = await fs.readdir(migrationsDir);
    const targetFile = files.find(f => f.startsWith(migrationNumber));
    
    if (!targetFile) {
      console.error(`❌ Migração ${migrationNumber} não encontrada em ${migrationsDir}`);
      process.exit(1);
    }
    
    console.log(`📝 Executando migração: ${targetFile}\n`);
    
    const migrationPath = join(migrationsDir, targetFile);
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
