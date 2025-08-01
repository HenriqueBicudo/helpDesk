import { db, testConnection, closeConnection } from './server/db-drizzle';
import { users, tickets, requesters, systemSettings, emailTemplates } from './shared/drizzle-schema';

async function testDatabase() {
  console.log('🔍 Testando conexão com o banco de dados...\n');

  // Teste de conectividade
  const connected = await testConnection();
  if (!connected) {
    console.log('❌ Falha na conexão com o banco de dados');
    process.exit(1);
  }

  try {
    // Teste de consulta nas principais tabelas
    console.log('📋 Testando consultas nas tabelas...\n');

    // Contar registros nas tabelas principais
    const userCount = await db.select().from(users).then(rows => rows.length);
    console.log(`👥 Usuários: ${userCount} registros`);

    const requesterCount = await db.select().from(requesters).then(rows => rows.length);
    console.log(`🏢 Solicitantes: ${requesterCount} registros`);

    const ticketCount = await db.select().from(tickets).then(rows => rows.length);
    console.log(`🎫 Tickets: ${ticketCount} registros`);

    const templateCount = await db.select().from(emailTemplates).then(rows => rows.length);
    console.log(`📧 Templates de Email: ${templateCount} registros`);

    const settingsCount = await db.select().from(systemSettings).then(rows => rows.length);
    console.log(`⚙️ Configurações: ${settingsCount} registros`);

    console.log('\n✅ Banco de dados funcionando corretamente!');

  } catch (error) {
    console.error('❌ Erro ao consultar tabelas:', error);
  } finally {
    await closeConnection();
    console.log('\n🔌 Conexão fechada');
  }
}

testDatabase().catch(console.error);
