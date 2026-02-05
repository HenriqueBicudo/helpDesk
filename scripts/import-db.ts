import path from 'path';
import dotenv from 'dotenv';
import { db } from '../server/db-postgres';
import * as schema from '../shared/drizzle-schema';
import fs from 'fs/promises';

// Carregar variáveis de ambiente da raiz
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function importDatabase() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('❌ Erro: É necessário especificar o arquivo de exportação');
    console.log('\nUso: npm run db:import <caminho-do-arquivo>');
    console.log('Exemplo: npm run db:import backups/database-export-2026-02-05.json');
    process.exit(1);
  }

  const importFilePath = path.resolve(process.cwd(), args[0]);

  console.log('📥 Iniciando importação do banco de dados...');
  console.log(`📁 Arquivo: ${importFilePath}\n`);

  try {
    // Verificar se o arquivo existe
    await fs.access(importFilePath);
    
    // Ler arquivo
    const fileContent = await fs.readFile(importFilePath, 'utf-8');
    const importData = JSON.parse(fileContent);

    console.log('📊 Informações do arquivo:');
    console.log(`   Versão: ${importData.version}`);
    console.log(`   Data da exportação: ${new Date(importData.exportDate).toLocaleString('pt-BR')}`);
    console.log('');

    // Confirmar antes de importar
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const confirmed = await new Promise<boolean>((resolve) => {
      readline.question('⚠️  Deseja continuar com a importação? Digite "SIM" para confirmar: ', (answer: string) => {
        readline.close();
        resolve(answer.trim().toUpperCase() === 'SIM');
      });
    });

    if (!confirmed) {
      console.log('\n❌ Importação cancelada pelo usuário.');
      process.exit(0);
    }

    console.log('\n🚀 Iniciando importação...\n');

    await db.transaction(async (tx) => {
      // 1. Importar empresas
      if (importData.companies && importData.companies.length > 0) {
        console.log('📦 Importando empresas...');
        for (const company of importData.companies) {
          const { id, ...companyData } = company;
          await tx.insert(schema.companies).values(companyData).onConflictDoNothing();
        }
        console.log(`   ✅ ${importData.companies.length} empresas importadas`);
      }

      // 2. Importar equipes
      if (importData.teams && importData.teams.length > 0) {
        console.log('👥 Importando equipes...');
        for (const team of importData.teams) {
          const { id, ...teamData } = team;
          await tx.insert(schema.teams).values(teamData).onConflictDoNothing();
        }
        console.log(`   ✅ ${importData.teams.length} equipes importadas`);
      }

      // 3. Importar serviços
      if (importData.services && importData.services.length > 0) {
        console.log('🔧 Importando serviços...');
        for (const service of importData.services) {
          const { id, ...serviceData } = service;
          await tx.insert(schema.services).values(serviceData).onConflictDoNothing();
        }
        console.log(`   ✅ ${importData.services.length} serviços importados`);
      }

      // 4. Importar usuários (aviso sobre senhas)
      if (importData.users && importData.users.length > 0) {
        console.log('👤 Importando usuários...');
        console.log('   ⚠️  ATENÇÃO: As senhas não foram exportadas por segurança.');
        console.log('   💡 Você precisará redefinir as senhas dos usuários manualmente.');
        // Não importa usuários com senhas redacted
        let importedUsers = 0;
        for (const user of importData.users) {
          if (user.password !== '***REDACTED***') {
            const { id, ...userData } = user;
            await tx.insert(schema.users).values(userData).onConflictDoNothing();
            importedUsers++;
          }
        }
        console.log(`   ⚠️  ${importedUsers} de ${importData.users.length} usuários importados (senhas omitidas)`);
      }

      // 5. Importar solicitantes
      if (importData.requesters && importData.requesters.length > 0) {
        console.log('📋 Importando solicitantes...');
        for (const requester of importData.requesters) {
          const { id, ...requesterData } = requester;
          await tx.insert(schema.requesters).values(requesterData).onConflictDoNothing();
        }
        console.log(`   ✅ ${importData.requesters.length} solicitantes importados`);
      }

      // 6. Importar tags
      if (importData.tags && importData.tags.length > 0) {
        console.log('🏷️  Importando tags...');
        for (const tag of importData.tags) {
          const { id, ...tagData } = tag;
          await tx.insert(schema.tags).values(tagData).onConflictDoNothing();
        }
        console.log(`   ✅ ${importData.tags.length} tags importadas`);
      }

      // 7. Importar tickets
      if (importData.tickets && importData.tickets.length > 0) {
        console.log('🎫 Importando tickets...');
        for (const ticket of importData.tickets) {
          const { id, ...ticketData } = ticket;
          await tx.insert(schema.tickets).values(ticketData).onConflictDoNothing();
        }
        console.log(`   ✅ ${importData.tickets.length} tickets importados`);
      }

      // 8. Importar interações
      if (importData.ticketInteractions && importData.ticketInteractions.length > 0) {
        console.log('💬 Importando interações...');
        for (const interaction of importData.ticketInteractions) {
          const { id, ...interactionData } = interaction;
          await tx.insert(schema.ticketInteractions).values(interactionData).onConflictDoNothing();
        }
        console.log(`   ✅ ${importData.ticketInteractions.length} interações importadas`);
      }

      // 9. Importar relação ticket-tags
      if (importData.ticketTags && importData.ticketTags.length > 0) {
        console.log('🔗 Importando relações ticket-tags...');
        for (const ticketTag of importData.ticketTags) {
          const { id, ...ticketTagData } = ticketTag;
          await tx.insert(schema.ticketTags).values(ticketTagData).onConflictDoNothing();
        }
        console.log(`   ✅ ${importData.ticketTags.length} relações importadas`);
      }

      // 10. Importar templates
      if (importData.responseTemplates && importData.responseTemplates.length > 0) {
        console.log('📝 Importando templates de resposta...');
        for (const template of importData.responseTemplates) {
          const { id, ...templateData } = template;
          await tx.insert(schema.responseTemplates).values(templateData).onConflictDoNothing();
        }
        console.log(`   ✅ ${importData.responseTemplates.length} templates importados`);
      }

      // 11. Importar artigos
      if (importData.knowledgeArticles && importData.knowledgeArticles.length > 0) {
        console.log('📚 Importando base de conhecimento...');
        for (const article of importData.knowledgeArticles) {
          const { id, ...articleData } = article;
          await tx.insert(schema.knowledgeArticles).values(articleData).onConflictDoNothing();
        }
        console.log(`   ✅ ${importData.knowledgeArticles.length} artigos importados`);
      }

      // 12. Importar comentários
      if (importData.knowledgeComments && importData.knowledgeComments.length > 0) {
        console.log('💭 Importando comentários...');
        for (const comment of importData.knowledgeComments) {
          const { id, ...commentData } = comment;
          await tx.insert(schema.knowledgeComments).values(commentData).onConflictDoNothing();
        }
        console.log(`   ✅ ${importData.knowledgeComments.length} comentários importados`);
      }

      // 13. Importar automações
      if (importData.automationTriggers && importData.automationTriggers.length > 0) {
        console.log('⚙️  Importando gatilhos de automação...');
        for (const trigger of importData.automationTriggers) {
          const { id, ...triggerData } = trigger;
          await tx.insert(schema.automationTriggers).values(triggerData).onConflictDoNothing();
        }
        console.log(`   ✅ ${importData.automationTriggers.length} gatilhos importados`);
      }

      // 14. Importar configurações
      if (importData.systemSettings && importData.systemSettings.length > 0) {
        console.log('🔧 Importando configurações do sistema...');
        for (const setting of importData.systemSettings) {
          const { id, ...settingData } = setting;
          await tx.insert(schema.systemSettings).values(settingData).onConflictDoNothing();
        }
        console.log(`   ✅ ${importData.systemSettings.length} configurações importadas`);
      }
    });

    console.log('\n✨ Importação concluída com sucesso!');
    console.log('\n⚠️  ATENÇÃO:');
    console.log('   - As senhas dos usuários NÃO foram importadas por segurança');
    console.log('   - Execute a seed ou redefina as senhas manualmente');
    console.log('   - Verifique se todos os dados foram importados corretamente');

  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.error(`\n❌ Erro: Arquivo não encontrado: ${importFilePath}`);
    } else if (error instanceof SyntaxError) {
      console.error('\n❌ Erro: Arquivo JSON inválido');
    } else {
      console.error('\n❌ Erro ao importar banco de dados:', error);
    }
    process.exit(1);
  }
}

importDatabase()
  .then(() => {
    console.log('\n✅ Processo concluído!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Erro fatal:', err);
    process.exit(1);
  });
