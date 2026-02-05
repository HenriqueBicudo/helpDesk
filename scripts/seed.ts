import path from 'path';
import dotenv from 'dotenv';
import { eq } from 'drizzle-orm';
import { db } from '../server/db-postgres';
import * as schema from '../shared/drizzle-schema';
import { hashPassword } from '../server/auth';

// Carregar variáveis de ambiente da raiz
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function upsertCompany(tx: any, company: any) {
  const existing = await tx.select().from(schema.companies).where(eq(schema.companies.email, company.email));
  if (existing && existing.length > 0) return existing[0];
  const res = await tx.insert(schema.companies).values(company).returning();
  return res[0];
}

async function upsertTeam(tx: any, team: any) {
  const existing = await tx.select().from(schema.teams).where(eq(schema.teams.name, team.name));
  if (existing && existing.length > 0) return existing[0];
  const res = await tx.insert(schema.teams).values(team).returning();
  return res[0];
}

async function upsertUser(tx: any, user: any) {
  const existing = await tx.select().from(schema.users).where(eq(schema.users.username, user.username));
  if (existing && existing.length > 0) return existing[0];
  const res = await tx.insert(schema.users).values(user).returning();
  return res[0];
}

async function upsertRequester(tx: any, requester: any) {
  const existing = await tx.select().from(schema.requesters).where(eq(schema.requesters.email, requester.email));
  if (existing && existing.length > 0) return existing[0];
  const res = await tx.insert(schema.requesters).values(requester).returning();
  return res[0];
}

async function upsertService(tx: any, service: any) {
  const existing = await tx.select().from(schema.services).where(eq(schema.services.name, service.name));
  if (existing && existing.length > 0) return existing[0];
  const res = await tx.insert(schema.services).values(service).returning();
  return res[0];
}

async function upsertTicket(tx: any, ticket: any) {
  const exists = await tx.select().from(schema.tickets).where(eq(schema.tickets.subject, ticket.subject));
  if (exists && exists.length > 0) return exists[0];
  const res = await tx.insert(schema.tickets).values(ticket).returning();
  return res[0];
}

async function upsertTag(tx: any, tag: any) {
  const existing = await tx.select().from(schema.tags).where(eq(schema.tags.name, tag.name));
  if (existing && existing.length > 0) return existing[0];
  const res = await tx.insert(schema.tags).values(tag).returning();
  return res[0];
}

async function upsertResponseTemplate(tx: any, template: any) {
  const existing = await tx.select().from(schema.responseTemplates).where(eq(schema.responseTemplates.name, template.name));
  if (existing && existing.length > 0) return existing[0];
  const res = await tx.insert(schema.responseTemplates).values(template).returning();
  return res[0];
}

async function upsertKnowledgeArticle(tx: any, article: any) {
  const existing = await tx.select().from(schema.knowledgeArticles).where(eq(schema.knowledgeArticles.title, article.title));
  if (existing && existing.length > 0) return existing[0];
  const res = await tx.insert(schema.knowledgeArticles).values(article).returning();
  return res[0];
}

async function runSeed() {
  console.log('🌱 Iniciando seed completa do banco de dados...\n');

  await db.transaction(async (tx) => {
    // ===== 1) EMPRESAS =====
    console.log('📦 Criando empresas...');
    const companies = [
      await upsertCompany(tx, {
        name: 'Acme Corp',
        cnpj: '12.345.678/0001-90',
        email: 'contact@acme.example',
        phone: '(11) 3333-4444',
        address: 'Av. Paulista, 1000 - São Paulo, SP',
        isActive: true,
        hasActiveContract: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      await upsertCompany(tx, {
        name: 'Tech Solutions Ltda',
        cnpj: '98.765.432/0001-10',
        email: 'contato@techsolutions.example',
        phone: '(11) 2222-3333',
        address: 'Rua da Consolação, 500 - São Paulo, SP',
        isActive: true,
        hasActiveContract: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      await upsertCompany(tx, {
        name: 'Inovação Digital',
        cnpj: '11.222.333/0001-44',
        email: 'info@inovacao.example',
        phone: '(21) 3344-5566',
        address: 'Av. Rio Branco, 200 - Rio de Janeiro, RJ',
        isActive: true,
        hasActiveContract: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ];
    console.log(`✅ ${companies.length} empresas criadas\n`);

    // ===== 2) EQUIPES =====
    console.log('👥 Criando equipes...');
    const teams = [
      await upsertTeam(tx, {
        name: 'Suporte Técnico',
        description: 'Equipe responsável por suporte técnico e infraestrutura',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      await upsertTeam(tx, {
        name: 'Desenvolvimento',
        description: 'Equipe de desenvolvimento de software',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      await upsertTeam(tx, {
        name: 'Financeiro',
        description: 'Equipe de suporte financeiro',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      await upsertTeam(tx, {
        name: 'Comercial',
        description: 'Equipe comercial e vendas',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ];
    console.log(`✅ ${teams.length} equipes criadas\n`);

    // ===== 3) SERVIÇOS HIERÁRQUICOS =====
    console.log('🔧 Criando serviços hierárquicos...');
    const services = [];
    
    // Serviços principais (sem parent)
    const serviceTI = await upsertService(tx, {
      name: 'Tecnologia da Informação',
      description: 'Serviços relacionados a TI',
      teamId: teams[0].id,
      order: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    services.push(serviceTI);

    const serviceFinanceiro = await upsertService(tx, {
      name: 'Financeiro',
      description: 'Serviços financeiros e contábeis',
      teamId: teams[2].id,
      order: 2,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    services.push(serviceFinanceiro);

    // Subserviços de TI
    const serviceInfraestrutura = await upsertService(tx, {
      name: 'Infraestrutura',
      description: 'Servidores, redes e infraestrutura',
      parentId: serviceTI.id,
      teamId: teams[0].id,
      order: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    services.push(serviceInfraestrutura);

    const serviceSoftware = await upsertService(tx, {
      name: 'Desenvolvimento de Software',
      description: 'Desenvolvimento e manutenção de sistemas',
      parentId: serviceTI.id,
      teamId: teams[1].id,
      order: 2,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    services.push(serviceSoftware);

    // Subserviços de Infraestrutura
    services.push(await upsertService(tx, {
      name: 'Rede e Conectividade',
      description: 'Problemas de rede, VPN, conectividade',
      parentId: serviceInfraestrutura.id,
      order: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    services.push(await upsertService(tx, {
      name: 'Servidores',
      description: 'Gerenciamento de servidores',
      parentId: serviceInfraestrutura.id,
      order: 2,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    console.log(`✅ ${services.length} serviços criados\n`);

    // ===== 4) USUÁRIOS =====
    console.log('👤 Criando usuários...');
    const adminHashed = await hashPassword('admin123');
    const agentHashed = await hashPassword('agent123');
    const managerHashed = await hashPassword('manager123');
    const clientHashed = await hashPassword('client123');

    const users = [];

    // Admin
    users.push(await upsertUser(tx, {
      username: 'admin',
      password: adminHashed,
      fullName: 'Administrador do Sistema',
      email: 'admin@helpdesk.local',
      phone: '(11) 99999-0001',
      role: 'admin',
      avatarInitials: 'AD',
      isActive: true,
      firstLogin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Manager
    users.push(await upsertUser(tx, {
      username: 'manager',
      password: managerHashed,
      fullName: 'Gerente de Helpdesk',
      email: 'manager@helpdesk.local',
      phone: '(11) 99999-0002',
      role: 'helpdesk_manager',
      teamId: teams[0].id,
      avatarInitials: 'GM',
      isActive: true,
      firstLogin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Agentes
    users.push(await upsertUser(tx, {
      username: 'agent1',
      password: agentHashed,
      fullName: 'João Silva',
      email: 'joao.silva@helpdesk.local',
      phone: '(11) 99999-0003',
      role: 'helpdesk_agent',
      teamId: teams[0].id,
      avatarInitials: 'JS',
      isActive: true,
      firstLogin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    users.push(await upsertUser(tx, {
      username: 'agent2',
      password: agentHashed,
      fullName: 'Maria Santos',
      email: 'maria.santos@helpdesk.local',
      phone: '(11) 99999-0004',
      role: 'helpdesk_agent',
      teamId: teams[1].id,
      avatarInitials: 'MS',
      isActive: true,
      firstLogin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    users.push(await upsertUser(tx, {
      username: 'agent3',
      password: agentHashed,
      fullName: 'Pedro Oliveira',
      email: 'pedro.oliveira@helpdesk.local',
      phone: '(11) 99999-0005',
      role: 'helpdesk_agent',
      teamId: teams[2].id,
      avatarInitials: 'PO',
      isActive: true,
      firstLogin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Clientes
    users.push(await upsertUser(tx, {
      username: 'client1',
      password: clientHashed,
      fullName: 'Carlos Ferreira',
      email: 'carlos@acme.example',
      phone: '(11) 98888-0001',
      role: 'client_user',
      company: companies[0].name,
      avatarInitials: 'CF',
      isActive: true,
      firstLogin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    users.push(await upsertUser(tx, {
      username: 'clientmanager1',
      password: clientHashed,
      fullName: 'Ana Costa',
      email: 'ana.costa@acme.example',
      phone: '(11) 98888-0002',
      role: 'client_manager',
      company: companies[0].name,
      avatarInitials: 'AC',
      isActive: true,
      firstLogin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    users.push(await upsertUser(tx, {
      username: 'client2',
      password: clientHashed,
      fullName: 'Roberto Lima',
      email: 'roberto@techsolutions.example',
      phone: '(11) 98888-0003',
      role: 'client_user',
      company: companies[1].name,
      avatarInitials: 'RL',
      isActive: true,
      firstLogin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    console.log(`✅ ${users.length} usuários criados\n`);

    // ===== 5) SOLICITANTES =====
    console.log('📋 Criando solicitantes...');
    const requesters = [
      await upsertRequester(tx, {
        fullName: 'Carlos Ferreira',
        email: 'carlos@acme.example',
        company: companies[0].name,
        avatarInitials: 'CF',
        planType: 'premium',
        monthlyHours: 50,
        usedHours: '12.5',
        resetDate: new Date(),
        createdAt: new Date(),
      }),
      await upsertRequester(tx, {
        fullName: 'Ana Costa',
        email: 'ana.costa@acme.example',
        company: companies[0].name,
        avatarInitials: 'AC',
        planType: 'premium',
        monthlyHours: 50,
        usedHours: '5.0',
        resetDate: new Date(),
        createdAt: new Date(),
      }),
      await upsertRequester(tx, {
        fullName: 'Roberto Lima',
        email: 'roberto@techsolutions.example',
        company: companies[1].name,
        avatarInitials: 'RL',
        planType: 'standard',
        monthlyHours: 30,
        usedHours: '8.0',
        resetDate: new Date(),
        createdAt: new Date(),
      }),
    ];
    console.log(`✅ ${requesters.length} solicitantes criados\n`);

    // ===== 6) TAGS =====
    console.log('🏷️  Criando tags...');
    const tags = [
      await upsertTag(tx, { name: 'urgente', color: '#EF4444', createdAt: new Date() }),
      await upsertTag(tx, { name: 'bug', color: '#F59E0B', createdAt: new Date() }),
      await upsertTag(tx, { name: 'feature', color: '#10B981', createdAt: new Date() }),
      await upsertTag(tx, { name: 'dúvida', color: '#3B82F6', createdAt: new Date() }),
      await upsertTag(tx, { name: 'documentação', color: '#8B5CF6', createdAt: new Date() }),
    ];
    console.log(`✅ ${tags.length} tags criadas\n`);

    // ===== 7) TICKETS =====
    console.log('🎫 Criando tickets...');
    const tickets = [];

    tickets.push(await upsertTicket(tx, {
      subject: 'Sistema lento no módulo de relatórios',
      description: 'O sistema está apresentando lentidão quando geramos relatórios grandes. A tela fica travada por alguns minutos.',
      status: 'open',
      priority: 'high',
      category: 'technical_support',
      requesterId: requesters[0].id,
      assigneeId: users[2].id, // agent1
      companyId: companies[0].id,
      teamId: teams[0].id,
      serviceId: services[1].id,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 dias atrás
      updatedAt: new Date(),
    }));

    tickets.push(await upsertTicket(tx, {
      subject: 'Dúvida sobre faturamento mensal',
      description: 'Gostaria de entender como funciona o cálculo das horas utilizadas no plano premium.',
      status: 'in_progress',
      priority: 'medium',
      category: 'financial',
      requesterId: requesters[1].id,
      assigneeId: users[4].id, // agent3
      companyId: companies[0].id,
      teamId: teams[2].id,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 dias atrás
      updatedAt: new Date(),
    }));

    tickets.push(await upsertTicket(tx, {
      subject: 'Erro ao fazer login no sistema',
      description: 'Quando tento fazer login, recebo a mensagem "Credenciais inválidas" mesmo com a senha correta.',
      status: 'resolved',
      priority: 'critical',
      category: 'technical_support',
      requesterId: requesters[2].id,
      assigneeId: users[2].id, // agent1
      companyId: companies[1].id,
      teamId: teams[0].id,
      serviceId: services[0].id,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 dias atrás
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // resolvido 1 dia atrás
    }));

    tickets.push(await upsertTicket(tx, {
      subject: 'Solicitação de nova funcionalidade',
      description: 'Gostaria de solicitar a implementação de exportação de relatórios em formato Excel.',
      status: 'pending',
      priority: 'low',
      category: 'other',
      requesterId: requesters[0].id,
      assigneeId: users[3].id, // agent2
      companyId: companies[0].id,
      teamId: teams[1].id,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 dias atrás
      updatedAt: new Date(),
    }));

    console.log(`✅ ${tickets.length} tickets criados\n`);

    // ===== 8) INTERAÇÕES NOS TICKETS =====
    console.log('💬 Criando interações...');
    let interactionCount = 0;

    // Interações do ticket 1
    const ticket1Interactions = await tx.select().from(schema.ticketInteractions).where(eq(schema.ticketInteractions.ticketId, tickets[0].id));
    if (!ticket1Interactions || ticket1Interactions.length === 0) {
      await tx.insert(schema.ticketInteractions).values([
        {
          ticketId: tickets[0].id,
          userId: users[2].id,
          type: 'comment',
          content: 'Iniciando análise do problema. Vou verificar os logs do servidor.',
          isInternal: false,
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
        {
          ticketId: tickets[0].id,
          userId: users[2].id,
          type: 'internal_note',
          content: 'Identificado gargalo no banco de dados. Query de relatórios sem índice.',
          isInternal: true,
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
      ]);
      interactionCount += 2;
    }

    // Interações do ticket 2
    const ticket2Interactions = await tx.select().from(schema.ticketInteractions).where(eq(schema.ticketInteractions.ticketId, tickets[1].id));
    if (!ticket2Interactions || ticket2Interactions.length === 0) {
      await tx.insert(schema.ticketInteractions).values([
        {
          ticketId: tickets[1].id,
          userId: users[4].id,
          type: 'comment',
          content: 'O cálculo é feito somando todas as horas registradas nos tickets do mês. Vou enviar um relatório detalhado por email.',
          isInternal: false,
          timeSpent: '0.5',
          createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        },
      ]);
      interactionCount += 1;
    }

    // Interações do ticket 3 (resolvido)
    const ticket3Interactions = await tx.select().from(schema.ticketInteractions).where(eq(schema.ticketInteractions.ticketId, tickets[2].id));
    if (!ticket3Interactions || ticket3Interactions.length === 0) {
      await tx.insert(schema.ticketInteractions).values([
        {
          ticketId: tickets[2].id,
          userId: users[2].id,
          type: 'comment',
          content: 'Identifiquei o problema. Vou resetar sua senha e enviar uma nova por email.',
          isInternal: false,
          timeSpent: '0.25',
          createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        },
        {
          ticketId: tickets[2].id,
          userId: users[2].id,
          type: 'status_change',
          content: 'Status alterado de "Aberto" para "Resolvido"',
          isInternal: false,
          timeSpent: '0.5',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
      ]);
      interactionCount += 2;
    }

    console.log(`✅ ${interactionCount} interações criadas\n`);

    // ===== 9) RELACIONAR TAGS COM TICKETS =====
    console.log('🔗 Relacionando tags com tickets...');
    const existingTicketTags = await tx.select().from(schema.ticketTags);
    if (!existingTicketTags || existingTicketTags.length === 0) {
      await tx.insert(schema.ticketTags).values([
        { ticketId: tickets[0].id, tagId: tags[1].id, createdAt: new Date() }, // bug
        { ticketId: tickets[2].id, tagId: tags[0].id, createdAt: new Date() }, // urgente
        { ticketId: tickets[2].id, tagId: tags[1].id, createdAt: new Date() }, // bug
        { ticketId: tickets[3].id, tagId: tags[2].id, createdAt: new Date() }, // feature
      ]);
      console.log('✅ Tags relacionadas com tickets\n');
    }

    // ===== 10) TEMPLATES DE RESPOSTA =====
    console.log('📝 Criando templates de resposta...');
    await upsertResponseTemplate(tx, {
      name: 'Primeira Resposta - Suporte Técnico',
      category: 'technical_support',
      subject: 'Re: {{ticket.subject}}',
      content: 'Olá {{requester.name}},\n\nRecebemos seu chamado e já estamos trabalhando na solução. Em breve retornaremos com mais informações.\n\nAtenciosamente,\nEquipe de Suporte',
      isActive: true,
      createdBy: users[1].id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await upsertResponseTemplate(tx, {
      name: 'Solicitação de Informações',
      category: 'technical_support',
      content: 'Olá {{requester.name}},\n\nPara darmos continuidade ao seu chamado, precisamos de algumas informações adicionais:\n\n- \n\nAguardamos seu retorno.\n\nAtenciosamente,\nEquipe de Suporte',
      isActive: true,
      createdBy: users[1].id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await upsertResponseTemplate(tx, {
      name: 'Resolução de Chamado',
      category: 'technical_support',
      content: 'Olá {{requester.name}},\n\nSeu chamado foi resolvido. Por favor, confirme se tudo está funcionando corretamente.\n\nCaso o problema persista, não hesite em nos contatar.\n\nAtenciosamente,\nEquipe de Suporte',
      isActive: true,
      createdBy: users[1].id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Templates de resposta criados\n');

    // ===== 11) BASE DE CONHECIMENTO =====
    console.log('📚 Criando artigos da base de conhecimento...');
    const article1 = await upsertKnowledgeArticle(tx, {
      title: 'Como resetar sua senha',
      content: `# Como resetar sua senha

Se você esqueceu sua senha, siga estes passos:

1. Acesse a página de login
2. Clique em "Esqueci minha senha"
3. Digite seu email cadastrado
4. Verifique seu email e clique no link recebido
5. Digite sua nova senha

**Dica:** Use uma senha forte com letras, números e caracteres especiais.`,
      category: 'Primeiros Passos',
      tags: ['senha', 'login', 'segurança'],
      views: 156,
      authorId: users[1].id,
      author: users[1].fullName,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    });

    const article2 = await upsertKnowledgeArticle(tx, {
      title: 'Entendendo os níveis de prioridade',
      content: `# Entendendo os níveis de prioridade

Nosso sistema utiliza 4 níveis de prioridade:

## Crítica
- Sistema completamente indisponível
- Impacto em múltiplos usuários
- Perda de dados

## Alta
- Funcionalidade importante não está funcionando
- Impacto significativo no negócio

## Média
- Problema que afeta o trabalho mas tem solução alternativa
- Funcionalidade secundária com problema

## Baixa
- Melhorias
- Dúvidas gerais
- Problemas cosméticos`,
      category: 'Suporte',
      tags: ['prioridade', 'tickets', 'sla'],
      views: 89,
      authorId: users[1].id,
      author: users[1].fullName,
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    });

    const article3 = await upsertKnowledgeArticle(tx, {
      title: 'Como anexar arquivos em um ticket',
      content: `# Como anexar arquivos em um ticket

Para anexar arquivos ao seu ticket:

1. Abra o ticket desejado
2. Clique no ícone de anexo (📎)
3. Selecione o arquivo do seu computador
4. Aguarde o upload ser concluído

**Tipos de arquivo aceitos:**
- Imagens: JPG, PNG, GIF
- Documentos: PDF, DOC, DOCX, XLS, XLSX
- Outros: TXT, CSV, ZIP

**Tamanho máximo:** 10MB por arquivo`,
      category: 'Tutoriais',
      tags: ['anexo', 'upload', 'arquivos'],
      views: 234,
      authorId: users[2].id,
      author: users[2].fullName,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    });

    console.log('✅ 3 artigos da base de conhecimento criados\n');

    // ===== 12) COMENTÁRIOS NA BASE DE CONHECIMENTO =====
    console.log('💭 Criando comentários...');
    const existingComments = await tx.select().from(schema.knowledgeComments);
    if (!existingComments || existingComments.length === 0) {
      await tx.insert(schema.knowledgeComments).values([
        {
          articleId: article1.id,
          authorId: users[5].id,
          author: users[5].fullName,
          content: 'Muito útil! Consegui resetar minha senha seguindo este tutorial.',
          createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        },
        {
          articleId: article3.id,
          authorId: users[7].id,
          author: users[7].fullName,
          content: 'Seria possível aumentar o tamanho máximo dos arquivos?',
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        },
      ]);
      console.log('✅ 2 comentários criados\n');
    }

    console.log('✨ Seed aplicada com sucesso!\n');
    console.log('📊 Resumo:');
    console.log(`   - ${companies.length} empresas`);
    console.log(`   - ${teams.length} equipes`);
    console.log(`   - ${services.length} serviços`);
    console.log(`   - ${users.length} usuários`);
    console.log(`   - ${requesters.length} solicitantes`);
    console.log(`   - ${tags.length} tags`);
    console.log(`   - ${tickets.length} tickets`);
    console.log(`   - 3 artigos de conhecimento`);
    console.log(`   - 3 templates de resposta`);
    console.log('\n🔐 Credenciais de acesso:');
    console.log('   Admin:    admin / admin123');
    console.log('   Manager:  manager / manager123');
    console.log('   Agente:   agent1 / agent123');
    console.log('   Cliente:  client1 / client123');
  });
}

runSeed()
  .then(() => {
    console.log('\n✅ Seed concluída com sucesso!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Erro ao aplicar seed:', err);
    process.exit(1);
  });
