import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

async function createContractsAndSLA() {
  const client = new Client({
    connectionString: 'postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk'
  });

  try {
    await client.connect();
    console.log('🔗 Conectado ao banco de dados');

    const sqlScript = fs.readFileSync(path.join(process.cwd(), 'create-contracts-sla.sql'), 'utf8');
    
    await client.query(sqlScript);
    console.log('✅ Tabelas de contratos e SLA criadas com sucesso!');
    console.log('📄 Contratos de exemplo inseridos');
    console.log('📋 Regras de SLA configuradas');
    
    // Verificar se os dados foram inseridos
    const contracts = await client.query('SELECT * FROM contracts');
    console.log(`📊 ${contracts.rows.length} contratos criados:`);
    contracts.rows.forEach(contract => {
      console.log(`   - ${contract.name} (${contract.monthly_hours}h/mês)`);
    });
    
    const slaRules = await client.query('SELECT * FROM sla_rules');
    console.log(`⏱️ ${slaRules.rows.length} regras de SLA configuradas`);
    
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
  } finally {
    await client.end();
  }
}

createContractsAndSLA();
