const { db } = require('./server/db-drizzle');
const schema = require('./shared/drizzle-schema');
const { sql } = require('drizzle-orm');

async function cleanDatabase() {
  try {
    console.log('🧹 Iniciando limpeza da base de dados...\n');
    
    // 1. Limpar interações de tickets (são muitas e serão recriadas)
    console.log('💬 Limpando interações antigas...');
    const deletedInteractions = await db.delete(schema.ticketInteractions);
    console.log(`   ✅ Removidas todas as interações`);
    
    // 2. Manter apenas alguns tickets para teste (10 mais recentes)
    console.log('📋 Mantendo apenas 10 tickets mais recentes...');
    
    // Primeiro buscar os IDs dos 10 tickets mais recentes
    const recentTickets = await db
      .select({ id: schema.tickets.id })
      .from(schema.tickets)
      .orderBy(sql`${schema.tickets.createdAt} DESC`)
      .limit(10);
    
    const recentIds = recentTickets.map(t => t.id);
    
    // Deletar tickets que não estão na lista dos 10 mais recentes
    if (recentIds.length > 0) {
      await db.delete(schema.tickets)
        .where(sql`${schema.tickets.id} NOT IN (${sql.join(recentIds.map(id => sql`${id}`), sql`, `)})`);
      console.log(`   ✅ Mantidos apenas ${recentIds.length} tickets recentes`);
    }
    
    // 3. Manter apenas 5 usuários essenciais
    console.log('👥 Mantendo apenas usuários essenciais...');
    const essentialUsers = await db
      .select({ id: schema.users.id, username: schema.users.username })
      .from(schema.users)
      .where(sql`${schema.users.username} IN ('admin', 'ana.silva', 'carlos.santos', 'maria.oliveira', 'lucia.ferreira')`)
      .limit(5);
    
    const essentialUserIds = essentialUsers.map(u => u.id);
    
    if (essentialUserIds.length > 0) {
      await db.delete(schema.users)
        .where(sql`${schema.users.id} NOT IN (${sql.join(essentialUserIds.map(id => sql`${id}`), sql`, `)})`);
      console.log(`   ✅ Mantidos ${essentialUserIds.length} usuários essenciais`);
    }
    
    // 4. Manter apenas 5 clientes
    console.log('🏢 Mantendo apenas 5 clientes...');
    const essentialRequesters = await db
      .select({ id: schema.requesters.id })
      .from(schema.requesters)
      .limit(5);
    
    const essentialRequesterIds = essentialRequesters.map(r => r.id);
    
    if (essentialRequesterIds.length > 0) {
      await db.delete(schema.requesters)
        .where(sql`${schema.requesters.id} NOT IN (${sql.join(essentialRequesterIds.map(id => sql`${id}`), sql`, `)})`);
      console.log(`   ✅ Mantidos ${essentialRequesterIds.length} clientes`);
    }
    
    // 5. Análise final
    console.log('\n📊 Estado final da base:');
    
    const finalTickets = await db.select({ count: sql`count(*)`.as('count') }).from(schema.tickets);
    console.log(`📋 Tickets: ${finalTickets[0].count}`);
    
    const finalUsers = await db.select({ count: sql`count(*)`.as('count') }).from(schema.users);
    console.log(`👥 Usuários: ${finalUsers[0].count}`);
    
    const finalRequesters = await db.select({ count: sql`count(*)`.as('count') }).from(schema.requesters);
    console.log(`🏢 Clientes: ${finalRequesters[0].count}`);
    
    const finalInteractions = await db.select({ count: sql`count(*)`.as('count') }).from(schema.ticketInteractions);
    console.log(`💬 Interações: ${finalInteractions[0].count}`);
    
    console.log('\n✨ Limpeza concluída! Base otimizada para desenvolvimento.');
    
  } catch (error) {
    console.error('❌ Erro durante limpeza:', error);
  }
  process.exit(0);
}

cleanDatabase();
