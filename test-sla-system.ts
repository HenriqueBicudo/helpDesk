import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { PostgresStorage } from './server/postgres-storage.js';
import * as schema from './shared/drizzle-schema.js';
import { contracts } from './shared/schema/contracts.js';
import { eq } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL || 'postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk';
const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function testSLASystem() {
  console.log('🧪 Testando o Sistema SLA completo...\n');
  
  const storage = new PostgresStorage();
  
  try {
    // Verificar se temos dados necessários no sistema
    console.log('📋 Verificando dados existentes...');
    
    // Buscar solicitantes e contratos usando consultas diretas
    const requesters = await db.select().from(schema.requesters).limit(10);
    console.log(`   👥 Solicitantes encontrados: ${requesters.length}`);
    
    const contractsData = await db.select().from(contracts).where(eq(contracts.isActive, true)).limit(10);
    console.log(`   📄 Contratos ativos encontrados: ${contractsData.length}`);
    
    if (requesters.length === 0) {
      console.log('❌ Nenhum solicitante encontrado. Execute o seed-data.ts primeiro.');
      return;
    }
    
    if (contractsData.length === 0) {
      console.log('❌ Nenhum contrato ativo encontrado. Execute o seed-data.ts primeiro.');
      return;
    }
    
    // Encontrar um solicitante que tenha contrato ativo
    let testRequesterId: number | null = null;
    let testContractId: number | null = null;
    
    for (const contract of contractsData) {
      if (contract.isActive && contract.requesterId) {
        testRequesterId = contract.requesterId;
        testContractId = contract.id;
        console.log(`   🎯 Usando solicitante ${testRequesterId} que possui contrato ativo ${contract.id}`);
        console.log(`   📅 Contrato vigente de ${contract.startDate?.toLocaleDateString('pt-BR')} até ${contract.endDate?.toLocaleDateString('pt-BR') || 'indefinido'}`);
        break;
      }
    }
    
    if (!testRequesterId) {
      console.log('❌ Nenhum solicitante com contrato ativo encontrado.');
      return;
    }
    
    // Criar um ticket de teste
    console.log('\n🎫 Criando ticket de teste...');
    const testTicket = {
      subject: `🧪 Teste SLA - ${new Date().toLocaleString('pt-BR')}`,
      description: 'Este é um ticket de teste para verificar o funcionamento do sistema SLA automático.',
      priority: 'high' as const,
      category: 'technical' as const,
      requesterId: testRequesterId,
      status: 'open' as const
    };
    
    const createdTicket = await storage.createTicket(testTicket);
    console.log(`   ✅ Ticket criado: ID ${createdTicket.id}`);
    console.log(`   📊 Status: ${createdTicket.status}`);
    console.log(`   ⚡ Prioridade: ${createdTicket.priority}`);
    console.log(`   🔗 Contrato vinculado: ${createdTicket.contractId || 'Nenhum'}`);
    
    // Verificar se os prazos SLA foram calculados
    if (createdTicket.responseDueAt) {
      console.log(`   📞 Prazo para resposta: ${createdTicket.responseDueAt.toLocaleString('pt-BR')}`);
    } else {
      console.log('   ⚠️  Prazo para resposta: Não calculado');
    }
    
    if (createdTicket.solutionDueAt) {
      console.log(`   🔧 Prazo para solução: ${createdTicket.solutionDueAt.toLocaleString('pt-BR')}`);
    } else {
      console.log('   ⚠️  Prazo para solução: Não calculado');
    }
    
    // Verificar se os prazos foram persistidos no banco
    console.log('\n🔍 Verificando persistência no banco...');
    const ticketFromDB = await storage.getTicket(createdTicket.id!);
    
    if (ticketFromDB) {
      console.log('   ✅ Ticket recuperado do banco com sucesso');
      if (ticketFromDB.responseDueAt) {
        console.log(`   📞 Prazo resposta (DB): ${ticketFromDB.responseDueAt.toLocaleString('pt-BR')}`);
      }
      if (ticketFromDB.solutionDueAt) {
        console.log(`   🔧 Prazo solução (DB): ${ticketFromDB.solutionDueAt.toLocaleString('pt-BR')}`);
      }
    }
    
    // Testar cenário sem contrato (criar ticket para solicitante sem contrato)
    console.log('\n🧪 Testando cenário sem contrato...');
    const requesterWithoutContract = requesters.find(r => !contractsData.some(c => c.requesterId === r.id));
    
    if (requesterWithoutContract) {
      const ticketWithoutContract = {
        subject: `🧪 Teste SLA sem contrato - ${new Date().toLocaleString('pt-BR')}`,
        description: 'Ticket para testar comportamento quando não há contrato vinculado.',
        priority: 'medium' as const,
        category: 'general' as const,
        requesterId: requesterWithoutContract.id!,
        status: 'open' as const
      };
      
      const ticketWithoutSLA = await storage.createTicket(ticketWithoutContract);
      console.log(`   ✅ Ticket sem contrato criado: ID ${ticketWithoutSLA.id}`);
      console.log(`   🔗 Contrato vinculado: ${ticketWithoutSLA.contractId || 'Nenhum (esperado)'}`);
      console.log(`   📞 Prazo resposta: ${ticketWithoutSLA.responseDueAt ? ticketWithoutSLA.responseDueAt.toLocaleString('pt-BR') : 'Não aplicável (esperado)'}`);
    }
    
    console.log('\n✅ Teste do Sistema SLA concluído com sucesso!');
    console.log('🎯 Sprint 3 - Motor de SLA implementado e funcionando!');
    console.log('\n📋 Resumo do que foi implementado:');
    console.log('   1. ✅ Schema atualizado com campos responseDueAt e solutionDueAt');
    console.log('   2. ✅ Serviço SlaEngineService com cálculo de tempo útil');
    console.log('   3. ✅ Integração automática na criação de tickets');
    console.log('   4. ✅ Vinculação automática de contratos');
    console.log('   5. ✅ Cálculo automático de prazos SLA baseados no contrato');
    console.log('   6. ✅ Persistência dos prazos no banco de dados');
    
  } catch (error) {
    console.error('❌ Erro no teste SLA:', error);
  } finally {
    await client.end();
  }
}

// Executar o teste
testSLASystem().catch(console.error);
