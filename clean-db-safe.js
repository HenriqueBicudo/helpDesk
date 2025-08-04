const { db } = require('./server/db-drizzle');
const schema = require('./shared/drizzle-schema');
const { sql, eq, isNull, or, inArray } = require('drizzle-orm');

async function cleanDatabaseSafe() {
  try {
    console.log('🧹 Iniciando limpeza segura da base de dados...\n');
    
    // 1. Limpar interações de tickets (não tem dependências)
    console.log('💬 Limpando interações antigas...');
    await db.delete(schema.ticketInteractions);
    console.log(`   ✅ Removidas todas as interações`);
    
    // 2. Primeiro identificar tickets a manter (10 mais recentes)
    console.log('📋 Identificando tickets a manter...');
    const recentTickets = await db
      .select({ 
        id: schema.tickets.id,
        assigneeId: schema.tickets.assigneeId,
        requesterId: schema.tickets.requesterId 
      })
      .from(schema.tickets)
      .orderBy(sql`${schema.tickets.createdAt} DESC`)
      .limit(10);
    
    console.log(`   ℹ️ Tickets a manter: ${recentTickets.length}`);
    
    // 3. Identificar usuários e clientes que são referenciados pelos tickets mantidos
    const usedUserIds = new Set();
    const usedRequesterIds = new Set();
    
    recentTickets.forEach(ticket => {
      if (ticket.assigneeId) usedUserIds.add(ticket.assigneeId);
      if (ticket.requesterId) usedRequesterIds.add(ticket.requesterId);
    });
    
    // Adicionar usuários essenciais do sistema
    const essentialUsers = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(sql`${schema.users.username} IN ('admin', 'ana.silva', 'carlos.santos', 'maria.oliveira', 'lucia.ferreira')`);
    
    essentialUsers.forEach(user => usedUserIds.add(user.id));
    
    console.log(`   ℹ️ Usuários a manter: ${usedUserIds.size}`);
    console.log(`   ℹ️ Clientes a manter: ${usedRequesterIds.size + 2}`); // +2 para manter alguns extras
    
    // 4. Remover tickets antigos primeiro (isso libera as referências)
    const ticketIds = recentTickets.map(t => t.id);
    if (ticketIds.length > 0) {
      await db.delete(schema.tickets)
        .where(sql`${schema.tickets.id} NOT IN (${sql.join(ticketIds.map(id => sql`${id}`), sql`, `)})`);
      console.log(`   ✅ Removidos tickets antigos, mantidos ${ticketIds.length}`);
    }
    
    // 5. Agora remover usuários não utilizados
    const userIdsArray = Array.from(usedUserIds);
    if (userIdsArray.length > 0) {
      await db.delete(schema.users)
        .where(sql`${schema.users.id} NOT IN (${sql.join(userIdsArray.map(id => sql`${id}`), sql`, `)})`);
      console.log(`   ✅ Mantidos ${userIdsArray.length} usuários`);
    }
    
    // 6. Remover clientes não utilizados (mantendo alguns extras)
    const requesterIdsArray = Array.from(usedRequesterIds);
    const extraRequesters = await db
      .select({ id: schema.requesters.id })
      .from(schema.requesters)
      .limit(5);
    
    // Combinar IDs usados + extras
    const allRequesterIds = [...requesterIdsArray, ...extraRequesters.map(r => r.id)];
    const uniqueRequesterIds = [...new Set(allRequesterIds)];
    
    if (uniqueRequesterIds.length > 0) {
      await db.delete(schema.requesters)
        .where(sql`${schema.requesters.id} NOT IN (${sql.join(uniqueRequesterIds.map(id => sql`${id}`), sql`, `)})`);
      console.log(`   ✅ Mantidos ${uniqueRequesterIds.length} clientes`);
    }
    
    // 7. Análise final
    console.log('\n📊 Estado final da base:');
    
    const finalTickets = await db.select({ count: sql`count(*)`.as('count') }).from(schema.tickets);
    console.log(`📋 Tickets: ${finalTickets[0].count}`);
    
    const finalUsers = await db.select({ count: sql`count(*)`.as('count') }).from(schema.users);
    console.log(`👥 Usuários: ${finalUsers[0].count}`);
    
    const finalRequesters = await db.select({ count: sql`count(*)`.as('count') }).from(schema.requesters);
    console.log(`🏢 Clientes: ${finalRequesters[0].count}`);
    
    const finalInteractions = await db.select({ count: sql`count(*)`.as('count') }).from(schema.ticketInteractions);
    console.log(`💬 Interações: ${finalInteractions[0].count}`);
    
    const finalTemplates = await db.select({ count: sql`count(*)`.as('count') }).from(schema.emailTemplates);
    console.log(`📧 Templates: ${finalTemplates[0].count}`);
    
    console.log('\n✨ Limpeza segura concluída! Base otimizada para desenvolvimento.');
    console.log('💾 A base agora contém apenas dados essenciais para testes.');
    
  } catch (error) {
    console.error('❌ Erro durante limpeza:', error);
  }
  process.exit(0);
}

cleanDatabaseSafe();
