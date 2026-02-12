import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Script para verificar configuração SLA e diagnosticar problemas
 */
async function diagnosticSLA() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL não configurada!');
    process.exit(1);
  }

  const sql = postgres(connectionString);

  try {
    console.log('🔍 DIAGNÓSTICO DO SISTEMA SLA\n');
    console.log('═══════════════════════════════════════════════════════\n');

    // 1. Verificar contratos
    console.log('📋 1. CONTRATOS CADASTRADOS:');
    const contracts = await sql`
      SELECT id, contract_number, type, status, company_id
      FROM contracts
      ORDER BY id
    `;
    
    if (contracts.length === 0) {
      console.log('   ⚠️  Nenhum contrato encontrado!\n');
    } else {
      contracts.forEach(c => {
        console.log(`   • ${c.id} - ${c.contract_number} (${c.type}) - Status: ${c.status}`);
      });
      console.log('');
    }

    // 2. Verificar calendários
    console.log('📅 2. CALENDÁRIOS CADASTRADOS:');
    const calendars = await sql`
      SELECT id, name
      FROM calendars
      ORDER BY id
    `;
    
    if (calendars.length === 0) {
      console.log('   ⚠️  Nenhum calendário encontrado!\n');
    } else {
      calendars.forEach(c => {
        console.log(`   • ID ${c.id}: ${c.name}`);
      });
      console.log('');
    }

    // 3. Verificar regras SLA
    console.log('⚙️  3. REGRAS SLA CADASTRADAS:');
    const slaRules = await sql`
      SELECT 
        sr.id,
        sr.contract_id,
        sr.priority,
        sr.response_time_minutes,
        sr.solution_time_minutes,
        c.contract_number
      FROM sla_rules sr
      LEFT JOIN contracts c ON c.id = sr.contract_id
      ORDER BY sr.contract_id, sr.priority
    `;
    
    if (slaRules.length === 0) {
      console.log('   ⚠️  Nenhuma regra SLA encontrada!\n');
      console.log('   💡 Você precisa criar regras SLA para os contratos.\n');
    } else {
      const byContract = slaRules.reduce((acc: any, rule) => {
        if (!acc[rule.contract_id]) acc[rule.contract_id] = [];
        acc[rule.contract_id].push(rule);
        return acc;
      }, {});

      Object.entries(byContract).forEach(([contractId, rules]: [string, any]) => {
        console.log(`   Contrato: ${contractId} (${rules[0].contract_number || 'N/A'})`);
        rules.forEach((r: any) => {
          console.log(`     • ${r.priority.toUpperCase().padEnd(10)} - Resposta: ${r.response_time_minutes}min | Solução: ${r.solution_time_minutes}min`);
        });
      });
      console.log('');
    }

    // 4. Verificar tickets com contrato
    console.log('🎫 4. TICKETS COM CONTRATO:');
    const ticketsWithContract = await sql`
      SELECT 
        id,
        subject,
        priority,
        contract_id,
        response_due_at,
        solution_due_at,
        created_at
      FROM tickets
      WHERE contract_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    if (ticketsWithContract.length === 0) {
      console.log('   ℹ️  Nenhum ticket com contrato encontrado.\n');
    } else {
      ticketsWithContract.forEach(t => {
        const hasSLA = t.response_due_at && t.solution_due_at;
        const status = hasSLA ? '✅ SLA calculado' : '❌ SLA NÃO calculado';
        console.log(`   • Ticket #${t.id}: ${t.subject.substring(0, 40)}...`);
        console.log(`     Priority: ${t.priority} | Contrato: ${t.contract_id} | ${status}`);
        if (hasSLA) {
          console.log(`     Resposta até: ${t.response_due_at.toLocaleString('pt-BR')}`);
          console.log(`     Solução até: ${t.solution_due_at.toLocaleString('pt-BR')}`);
        }
      });
      console.log('');
    }

    // 5. Verificar se há tickets críticos sem SLA
    console.log('🚨 5. TICKETS CRÍTICOS SEM SLA:');
    const criticalWithoutSLA = await sql`
      SELECT 
        t.id,
        t.subject,
        t.priority,
        t.contract_id,
        t.created_at
      FROM tickets t
      WHERE t.priority = 'critical'
        AND t.contract_id IS NOT NULL
        AND (t.response_due_at IS NULL OR t.solution_due_at IS NULL)
      ORDER BY t.created_at DESC
      LIMIT 5
    `;
    
    if (criticalWithoutSLA.length === 0) {
      console.log('   ✅ Nenhum ticket crítico sem SLA!\n');
    } else {
      console.log(`   ⚠️  ${criticalWithoutSLA.length} ticket(s) crítico(s) sem SLA calculado:\n`);
      criticalWithoutSLA.forEach(t => {
        console.log(`   • Ticket #${t.id}: ${t.subject.substring(0, 50)}...`);
        console.log(`     Contrato: ${t.contract_id} | Criado em: ${t.created_at.toLocaleString('pt-BR')}`);
        
        // Verificar se existe regra SLA para este contrato e prioridade
        const hasRule = slaRules.some(r => 
          r.contract_id === t.contract_id && r.priority === t.priority
        );
        
        if (!hasRule) {
          console.log(`     ❌ NÃO HÁ REGRA SLA para contrato ${t.contract_id} com prioridade ${t.priority}!`);
        } else {
          console.log(`     ✅ Regra SLA existe - SLA deveria ter sido calculado`);
        }
      });
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════\n');
    console.log('📝 RECOMENDAÇÕES:\n');

    if (calendars.length === 0) {
      console.log('1. ⚠️  Criar calendário de atendimento (horário comercial, feriados)');
    }

    if (contracts.length > 0 && slaRules.length === 0) {
      console.log('2. ⚠️  Criar regras SLA para os contratos existentes');
      console.log('   Exemplo:');
      console.log('   POST /api/sla/configurations');
      console.log('   {');
      console.log(`     "contractId": "${contracts[0].id}",`);
      console.log('     "priority": "critical",');
      console.log('     "responseTimeMinutes": 15,');
      console.log('     "solutionTimeMinutes": 240');
      console.log('   }');
    }

    if (criticalWithoutSLA.length > 0) {
      console.log('3. ⚠️  Recalcular SLA dos tickets existentes:');
      console.log('   POST /api/sla/monitor/check');
    }

    console.log('');

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

diagnosticSLA()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });
