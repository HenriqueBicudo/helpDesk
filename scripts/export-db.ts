import path from 'path';
import dotenv from 'dotenv';
import { db } from '../server/db-postgres';
import * as schema from '../shared/drizzle-schema';
import fs from 'fs/promises';

// Carregar variáveis de ambiente da raiz
dotenv.config({ path: path.resolve(__dirname, '../.env') });

interface ExportData {
  version: string;
  exportDate: string;
  companies: any[];
  teams: any[];
  services: any[];
  users: any[];
  requesters: any[];
  tags: any[];
  tickets: any[];
  ticketInteractions: any[];
  ticketTags: any[];
  responseTemplates: any[];
  knowledgeArticles: any[];
  knowledgeComments: any[];
  automationTriggers: any[];
  systemSettings: any[];
}

async function exportDatabase() {
  console.log('📦 Iniciando exportação do banco de dados...\n');

  try {
    const exportData: ExportData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      companies: [],
      teams: [],
      services: [],
      users: [],
      requesters: [],
      tags: [],
      tickets: [],
      ticketInteractions: [],
      ticketTags: [],
      responseTemplates: [],
      knowledgeArticles: [],
      knowledgeComments: [],
      automationTriggers: [],
      systemSettings: [],
    };

    // Exportar empresas
    console.log('📦 Exportando empresas...');
    exportData.companies = await db.select().from(schema.companies);
    console.log(`   ✅ ${exportData.companies.length} empresas exportadas`);

    // Exportar equipes
    console.log('👥 Exportando equipes...');
    exportData.teams = await db.select().from(schema.teams);
    console.log(`   ✅ ${exportData.teams.length} equipes exportadas`);

    // Exportar serviços
    console.log('🔧 Exportando serviços...');
    exportData.services = await db.select().from(schema.services);
    console.log(`   ✅ ${exportData.services.length} serviços exportados`);

    // Exportar usuários (sem senhas por segurança)
    console.log('👤 Exportando usuários...');
    const users = await db.select().from(schema.users);
    exportData.users = users.map(user => ({
      ...user,
      password: '***REDACTED***', // Não exporta senhas
    }));
    console.log(`   ✅ ${exportData.users.length} usuários exportados (senhas omitidas)`);

    // Exportar solicitantes
    console.log('📋 Exportando solicitantes...');
    exportData.requesters = await db.select().from(schema.requesters);
    console.log(`   ✅ ${exportData.requesters.length} solicitantes exportados`);

    // Exportar tags
    console.log('🏷️  Exportando tags...');
    exportData.tags = await db.select().from(schema.tags);
    console.log(`   ✅ ${exportData.tags.length} tags exportadas`);

    // Exportar tickets
    console.log('🎫 Exportando tickets...');
    exportData.tickets = await db.select().from(schema.tickets);
    console.log(`   ✅ ${exportData.tickets.length} tickets exportados`);

    // Exportar interações
    console.log('💬 Exportando interações...');
    exportData.ticketInteractions = await db.select().from(schema.ticketInteractions);
    console.log(`   ✅ ${exportData.ticketInteractions.length} interações exportadas`);

    // Exportar relação ticket-tags
    console.log('🔗 Exportando relações ticket-tags...');
    exportData.ticketTags = await db.select().from(schema.ticketTags);
    console.log(`   ✅ ${exportData.ticketTags.length} relações exportadas`);

    // Exportar templates de resposta
    console.log('📝 Exportando templates de resposta...');
    exportData.responseTemplates = await db.select().from(schema.responseTemplates);
    console.log(`   ✅ ${exportData.responseTemplates.length} templates exportados`);

    // Exportar artigos de conhecimento
    console.log('📚 Exportando base de conhecimento...');
    exportData.knowledgeArticles = await db.select().from(schema.knowledgeArticles);
    console.log(`   ✅ ${exportData.knowledgeArticles.length} artigos exportados`);

    // Exportar comentários
    console.log('💭 Exportando comentários...');
    exportData.knowledgeComments = await db.select().from(schema.knowledgeComments);
    console.log(`   ✅ ${exportData.knowledgeComments.length} comentários exportados`);

    // Exportar automations
    console.log('⚙️  Exportando gatilhos de automação...');
    exportData.automationTriggers = await db.select().from(schema.automationTriggers);
    console.log(`   ✅ ${exportData.automationTriggers.length} gatilhos exportados`);

    // Exportar configurações do sistema
    console.log('🔧 Exportando configurações do sistema...');
    exportData.systemSettings = await db.select().from(schema.systemSettings);
    console.log(`   ✅ ${exportData.systemSettings.length} configurações exportadas`);

    // Salvar arquivo JSON
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `database-export-${timestamp}.json`;
    const filepath = path.resolve(__dirname, '..', 'backups', filename);

    // Criar pasta backups se não existir
    const backupsDir = path.resolve(__dirname, '..', 'backups');
    await fs.mkdir(backupsDir, { recursive: true });

    await fs.writeFile(filepath, JSON.stringify(exportData, null, 2), 'utf-8');

    console.log('\n✨ Exportação concluída com sucesso!');
    console.log(`📁 Arquivo salvo em: ${filepath}`);
    console.log(`📊 Tamanho do arquivo: ${(await fs.stat(filepath)).size / 1024} KB`);

    console.log('\n📋 Resumo da exportação:');
    console.log(`   - ${exportData.companies.length} empresas`);
    console.log(`   - ${exportData.teams.length} equipes`);
    console.log(`   - ${exportData.services.length} serviços`);
    console.log(`   - ${exportData.users.length} usuários`);
    console.log(`   - ${exportData.requesters.length} solicitantes`);
    console.log(`   - ${exportData.tags.length} tags`);
    console.log(`   - ${exportData.tickets.length} tickets`);
    console.log(`   - ${exportData.ticketInteractions.length} interações`);
    console.log(`   - ${exportData.knowledgeArticles.length} artigos de conhecimento`);
    console.log(`   - ${exportData.automationTriggers.length} automações`);

    console.log('\n💡 Para importar em outro ambiente:');
    console.log(`   1. Copie o arquivo ${filename} para o outro computador`);
    console.log('   2. Execute: npm run db:import backups/' + filename);

  } catch (error) {
    console.error('\n❌ Erro ao exportar banco de dados:', error);
    process.exit(1);
  }
}

exportDatabase()
  .then(() => {
    console.log('\n✅ Processo concluído!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Erro fatal:', err);
    process.exit(1);
  });
