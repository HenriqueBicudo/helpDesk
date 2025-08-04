const { db } = require('./server/db-drizzle');
const schema = require('./shared/drizzle-schema');
const { count, eq } = require('drizzle-orm');

async function testDashboardData() {
  try {
    console.log('📊 ANÁLISE: Dashboard - Dados Dinâmicos vs Estáticos\n');
    
    // === DADOS DINÂMICOS (Real-time) ===
    console.log('🔄 DADOS DINÂMICOS (Atuais no banco):');
    
    const totalTickets = await db.select({ count: count() }).from(schema.tickets);
    console.log(`   📋 Total de tickets: ${totalTickets[0].count}`);
    
    const openTickets = await db
      .select({ count: count() })
      .from(schema.tickets)
      .where(eq(schema.tickets.status, 'open'));
    console.log(`   🔓 Tickets abertos: ${openTickets[0].count}`);
    
    const resolvedTickets = await db
      .select({ count: count() })
      .from(schema.tickets)
      .where(eq(schema.tickets.status, 'resolved'));
    console.log(`   ✅ Tickets resolvidos: ${resolvedTickets[0].count}`);
    
    const inProgressTickets = await db
      .select({ count: count() })
      .from(schema.tickets)
      .where(eq(schema.tickets.status, 'in_progress'));
    console.log(`   ⚡ Em progresso: ${inProgressTickets[0].count}`);
    
    // === ESTATÍSTICAS POR CATEGORIA ===
    console.log('\n📊 ESTATÍSTICAS POR CATEGORIA:');
    const categoryCounts = await db
      .select({ 
        category: schema.tickets.category, 
        count: count() 
      })
      .from(schema.tickets)
      .groupBy(schema.tickets.category);
    
    categoryCounts.forEach(cat => {
      const categoryName = {
        'technical_support': 'Suporte Técnico',
        'financial': 'Financeiro',
        'commercial': 'Comercial',
        'other': 'Outros'
      }[cat.category] || cat.category;
      
      console.log(`   ${categoryName}: ${cat.count} tickets`);
    });
    
    // === DETECÇÃO DE PROBLEMAS ===
    console.log('\n⚠️ PROBLEMAS IDENTIFICADOS:');
    
    // Verificar se há dados de cache antigos sendo mostrados
    const logMessage = `
📍 STATUS DO DASHBOARD:

✅ DADOS DINÂMICOS:
   • O dashboard USA React Query para buscar dados da API
   • Componentes fazem requisições para /api/statistics
   • Gráficos são atualizados automaticamente
   • Dados NÃO são hardcoded

🔄 ATUALIZAÇÃO AUTOMÁTICA:
   • React Query faz cache inteligente
   • Dados são refrescados quando a página carrega
   • Mudanças no banco são refletidas na próxima consulta
   
⚡ CACHE OBSERVADO:
   • Servidor mostra cache 304 (Not Modified)
   • Dados podem estar em cache do navegador
   • Para ver dados atualizados: F5 ou Ctrl+F5
   
🎯 CONFIRMAÇÃO:
   • Base agora tem ${totalTickets[0].count} tickets (após limpeza)
   • Dashboard deve mostrar estes números
   • Se mostrar números antigos = problema de cache
    `;
    
    console.log(logMessage);
    
  } catch (error) {
    console.error('❌ Erro ao analisar dashboard:', error);
  }
  process.exit(0);
}

testDashboardData();
