import path from 'path';
import dotenv from 'dotenv';
import { sql } from 'drizzle-orm';
import { db, client } from '../server/db-postgres';

// Carregar variáveis de ambiente da raiz
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function resetDatabase() {
  console.log('⚠️  ATENÇÃO: Este script irá APAGAR TODOS OS DADOS do banco de dados!\n');
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const confirmed = await new Promise<boolean>((resolve) => {
    readline.question('Tem certeza que deseja continuar? Digite "SIM" para confirmar: ', (answer: string) => {
      readline.close();
      resolve(answer.trim().toUpperCase() === 'SIM');
    });
  });

  if (!confirmed) {
    console.log('\n❌ Operação cancelada pelo usuário.');
    process.exit(0);
  }

  console.log('\n🗑️  Iniciando reset do banco de dados...\n');

  try {
    // Lista de todas as tabelas na ordem correta para deletar (respeitando foreign keys)
    const tables = [
      'ticket_cc',
      'ticket_requesters',
      'ticket_tags',
      'linked_tickets',
      'attachments',
      'ticket_interactions',
      'tickets',
      'requester_notes',
      'requesters',
      'knowledge_comments',
      'knowledge_articles',
      'automation_triggers',
      'response_templates',
      'system_settings',
      'tags',
      'ticket_status_config',
      'user_teams',
      'team_categories',
      'sla_breach_logs',
      'ticket_sla_tracking',
      'sla_rules',
      'contract_sla_rules',
      'sla_templates',
      'calendar_holidays',
      'sla_calendars',
      'contracts',
      'services',
      'users',
      'teams',
      'companies'
    ];

    console.log('🧹 Limpando tabelas...');
    
    for (const table of tables) {
      try {
        await db.execute(sql.raw(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`));
        console.log(`   ✅ ${table}`);
      } catch (error: any) {
        // Ignora erros de tabelas que não existem
        if (!error.message.includes('does not exist')) {
          console.log(`   ⚠️  ${table} - ${error.message}`);
        }
      }
    }

    console.log('\n✨ Banco de dados limpo com sucesso!');
    console.log('\n💡 Próximos passos:');
    console.log('   1. Execute "npm run seed" para popular o banco com dados de exemplo');
    console.log('   2. Ou importe seus dados de produção');
    
  } catch (error) {
    console.error('\n❌ Erro ao resetar banco de dados:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

resetDatabase()
  .then(() => {
    console.log('\n✅ Operação concluída!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Erro fatal:', err);
    process.exit(1);
  });
