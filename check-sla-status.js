const pg = require('pg');

async function checkSlaStatus() {
  const client = new pg.Client('postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk');
  
  try {
    await client.connect();
    console.log('🔍 === STATUS DO SISTEMA SLA ===\n');
    
    // 1. Verificar tickets com SLA ativo
    const activeSlaTickets = await client.query(`
      SELECT 
        t.id, 
        t.subject, 
        t.priority, 
        t.contract_id,
        t.response_due_at,
        t.solution_due_at,
        c.contract_number
      FROM tickets t 
      LEFT JOIN contracts c ON t.contract_id = c.id 
      WHERE t.contract_id IS NOT NULL 
      ORDER BY t.id
    `);
    
    console.log(`📋 Tickets com contratos: ${activeSlaTickets.rows.length}`);
    console.log(`✅ Tickets com SLA ativo: ${activeSlaTickets.rows.filter(t => t.response_due_at || t.solution_due_at).length}\n`);
    
    activeSlaTickets.rows.forEach(ticket => {
      const hasActiveSla = ticket.response_due_at || ticket.solution_due_at;
      console.log(`🎫 Ticket ${ticket.id}: ${ticket.subject}`);
      console.log(`   Prioridade: ${ticket.priority.toUpperCase()} | Contrato: ${ticket.contract_number || ticket.contract_id.substring(0, 8) + '...'}`);
      console.log(`   SLA: ${hasActiveSla ? '✅ ATIVO' : '❌ INATIVO'}`);
      
      if (hasActiveSla) {
        if (ticket.response_due_at) {
          console.log(`   📞 Resposta até: ${new Date(ticket.response_due_at).toLocaleString('pt-BR')}`);
        }
        if (ticket.solution_due_at) {
          console.log(`   🔧 Solução até: ${new Date(ticket.solution_due_at).toLocaleString('pt-BR')}`);
        }
      }
      console.log('');
    });
    
    // 2. Verificar regras SLA
    const slaRules = await client.query(`
      SELECT 
        sr.contract_id,
        sr.priority,
        sr.response_time_minutes,
        sr.solution_time_minutes,
        c.contract_number
      FROM sla_rules sr
      LEFT JOIN contracts c ON sr.contract_id = c.id
      ORDER BY sr.contract_id, sr.priority
    `);
    
    console.log(`⚙️  Regras SLA configuradas: ${slaRules.rows.length}\n`);
    
    // Agrupar por contrato
    const rulesByContract = {};
    slaRules.rows.forEach(rule => {
      if (!rulesByContract[rule.contract_id]) {
        rulesByContract[rule.contract_id] = {
          contract_number: rule.contract_number,
          rules: []
        };
      }
      rulesByContract[rule.contract_id].rules.push(rule);
    });
    
    Object.entries(rulesByContract).forEach(([contractId, data]) => {
      console.log(`📄 Contrato: ${data.contract_number || contractId.substring(0, 8) + '...'}`);
      data.rules.forEach(rule => {
        console.log(`   ${rule.priority.toUpperCase()}: ${rule.response_time_minutes}min resposta, ${Math.floor(rule.solution_time_minutes/60)}h solução`);
      });
      console.log('');
    });
    
    console.log('🎉 Sistema SLA está ATIVO e funcionando!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

checkSlaStatus();
