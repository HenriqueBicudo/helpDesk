import { db } from './server/db-drizzle';
import * as schema from './shared/drizzle-schema';

async function seedData() {
  console.log('🌱 Populando banco de dados com dados de exemplo...');
  
  try {
    // 1. Criar usuários (agentes e administradores)
    console.log('👥 Criando usuários...');
    
    const users = await db.insert(schema.users).values([
      {
        username: 'ana.silva',
        password: 'senha123',
        fullName: 'Ana Silva',
        email: 'ana.silva@helpdesk.com',
        role: 'agent',
        avatarInitials: 'AS'
      },
      {
        username: 'carlos.santos',
        password: 'senha123',
        fullName: 'Carlos Santos',
        email: 'carlos.santos@helpdesk.com',
        role: 'agent',
        avatarInitials: 'CS'
      },
      {
        username: 'maria.oliveira',
        password: 'senha123',
        fullName: 'Maria Oliveira',
        email: 'maria.oliveira@helpdesk.com',
        role: 'manager',
        avatarInitials: 'MO'
      },
      {
        username: 'pedro.costa',
        password: 'senha123',
        fullName: 'Pedro Costa',
        email: 'pedro.costa@helpdesk.com',
        role: 'agent',
        avatarInitials: 'PC'
      },
      {
        username: 'lucia.ferreira',
        password: 'senha123',
        fullName: 'Lúcia Ferreira',
        email: 'lucia.ferreira@helpdesk.com',
        role: 'admin',
        avatarInitials: 'LF'
      }
    ]).returning();

    console.log(`✅ ${users.length} usuários criados!`);

    // 2. Criar solicitantes (clientes)
    console.log('🏢 Criando clientes...');
    
    const requesters = await db.insert(schema.requesters).values([
      {
        fullName: 'Roberto Almeida',
        email: 'roberto.almeida@empresa-a.com',
        company: 'Empresa A Ltda',
        avatarInitials: 'RA'
      },
      {
        fullName: 'Fernanda Lima',
        email: 'fernanda.lima@empresa-b.com',
        company: 'Empresa B S.A.',
        avatarInitials: 'FL'
      },
      {
        fullName: 'Marcos Pereira',
        email: 'marcos.pereira@empresa-c.com',
        company: 'Empresa C Corp',
        avatarInitials: 'MP'
      },
      {
        fullName: 'Julia Rodrigues',
        email: 'julia.rodrigues@empresa-d.com',
        company: 'Empresa D Tech',
        avatarInitials: 'JR'
      },
      {
        fullName: 'Antonio Souza',
        email: 'antonio.souza@empresa-e.com',
        company: 'Empresa E Solutions',
        avatarInitials: 'AS'
      },
      {
        fullName: 'Camila Martins',
        email: 'camila.martins@empresa-f.com',
        company: 'Empresa F Digital',
        avatarInitials: 'CM'
      },
      {
        fullName: 'Rafael Dias',
        email: 'rafael.dias@freelancer.com',
        company: 'Freelancer',
        avatarInitials: 'RD'
      },
      {
        fullName: 'Beatriz Castro',
        email: 'beatriz.castro@startup-x.com',
        company: 'Startup X',
        avatarInitials: 'BC'
      }
    ]).returning();

    console.log(`✅ ${requesters.length} clientes criados!`);

    // 3. Criar tickets variados
    console.log('🎫 Criando tickets...');
    
    const tickets = await db.insert(schema.tickets).values([
      {
        subject: 'Sistema não carrega após login',
        description: 'Após fazer login, a tela fica em branco e não carrega o dashboard principal. Já tentei limpar cache.',
        status: 'open',
        priority: 'high',
        category: 'technical_support',
        requesterId: requesters[0].id,
        assigneeId: users[0].id
      },
      {
        subject: 'Erro de pagamento na fatura',
        description: 'Há uma cobrança duplicada na minha fatura do mês passado. Preciso de ajuda para resolver.',
        status: 'in_progress',
        priority: 'medium',
        category: 'financial',
        requesterId: requesters[1].id,
        assigneeId: users[1].id
      },
      {
        subject: 'Solicitação de novo usuário',
        description: 'Precisamos adicionar um novo funcionário ao sistema. Nome: João Silva, Email: joao.silva@empresa-a.com',
        status: 'pending',
        priority: 'low',
        category: 'commercial',
        requesterId: requesters[0].id,
        assigneeId: users[2].id
      },
      {
        subject: 'Relatórios não exportando',
        description: 'Quando tento exportar relatórios em PDF, aparece mensagem de erro "Falha na geração do arquivo".',
        status: 'resolved',
        priority: 'medium',
        category: 'technical_support',
        requesterId: requesters[2].id,
        assigneeId: users[0].id
      },
      {
        subject: 'Lentidão no sistema',
        description: 'O sistema está muito lento, principalmente na parte de relatórios. Demora mais de 2 minutos para carregar.',
        status: 'open',
        priority: 'high',
        category: 'technical_support',
        requesterId: requesters[3].id,
        assigneeId: users[3].id
      },
      {
        subject: 'Alteração de plano',
        description: 'Gostaria de fazer upgrade do plano básico para o plano premium. Quais são os custos?',
        status: 'open',
        priority: 'medium',
        category: 'commercial',
        requesterId: requesters[4].id
      },
      {
        subject: 'Problema na integração com API',
        description: 'A integração com nossa API externa parou de funcionar desde ontem. Erro 500 interno.',
        status: 'in_progress',
        priority: 'critical',
        category: 'technical_support',
        requesterId: requesters[5].id,
        assigneeId: users[4].id
      },
      {
        subject: 'Treinamento para nova funcionalidade',
        description: 'Nosso time precisa de treinamento sobre as novas funcionalidades lançadas.',
        status: 'pending',
        priority: 'low',
        category: 'other',
        requesterId: requesters[6].id,
        assigneeId: users[2].id
      },
      {
        subject: 'Erro ao fazer upload de arquivos',
        description: 'Não consigo fazer upload de arquivos maiores que 5MB. Aparece erro de timeout.',
        status: 'open',
        priority: 'medium',
        category: 'technical_support',
        requesterId: requesters[7].id,
        assigneeId: users[1].id
      },
      {
        subject: 'Cobrança indevida',
        description: 'Fui cobrado por um serviço que cancelei no mês passado. Preciso de reembolso.',
        status: 'closed',
        priority: 'high',
        category: 'financial',
        requesterId: requesters[1].id,
        assigneeId: users[1].id
      },
      {
        subject: 'Reset de senha não funciona',
        description: 'O link de reset de senha não está chegando no meu email. Já verifiquei spam.',
        status: 'resolved',
        priority: 'medium',
        category: 'technical_support',
        requesterId: requesters[3].id,
        assigneeId: users[0].id
      },
      {
        subject: 'Consulta sobre recursos disponíveis',
        description: 'Gostaria de saber quais recursos estão disponíveis no meu plano atual.',
        status: 'open',
        priority: 'low',
        category: 'commercial',
        requesterId: requesters[5].id
      }
    ]).returning();

    console.log(`✅ ${tickets.length} tickets criados!`);

    // 4. Criar templates de email
    console.log('📧 Criando templates de email...');
    
    const emailTemplates = await db.insert(schema.emailTemplates).values([
      {
        name: 'Novo Ticket Criado',
        type: 'new_ticket',
        subject: 'Seu ticket #{ticketId} foi criado com sucesso',
        body: `
Olá {requesterName},

Seu ticket foi criado com sucesso!

Detalhes do ticket:
- ID: #{ticketId}
- Assunto: {subject}
- Prioridade: {priority}
- Status: {status}

Acompanhe o progresso através do portal de atendimento.

Atenciosamente,
Equipe de Suporte
        `,
        isDefault: true,
        isActive: true
      },
      {
        name: 'Ticket Atribuído',
        type: 'ticket_assignment',
        subject: 'Ticket #{ticketId} foi atribuído para você',
        body: `
Olá {assigneeName},

Um novo ticket foi atribuído para você:

- ID: #{ticketId}
- Assunto: {subject}
- Cliente: {requesterName}
- Prioridade: {priority}
- Criado em: {createdAt}

Acesse o sistema para mais detalhes.

Atenciosamente,
Sistema HelpDesk
        `,
        isDefault: true,
        isActive: true
      },
      {
        name: 'Ticket Resolvido',
        type: 'ticket_resolution',
        subject: 'Seu ticket #{ticketId} foi resolvido',
        body: `
Olá {requesterName},

Temos o prazer de informar que seu ticket foi resolvido!

Detalhes:
- ID: #{ticketId}
- Assunto: {subject}
- Resolvido por: {assigneeName}
- Data de resolução: {resolvedAt}

Se você ainda tiver problemas, não hesite em entrar em contato.

Atenciosamente,
Equipe de Suporte
        `,
        isDefault: true,
        isActive: true
      },
      {
        name: 'Boas-vindas Usuário',
        type: 'welcome_user',
        subject: 'Bem-vindo ao Sistema HelpDesk!',
        body: `
Olá {userName},

Seja bem-vindo ao nosso sistema de suporte!

Suas credenciais de acesso:
- Usuário: {username}
- Email: {email}

Você pode acessar o sistema em: http://localhost:5000

Atenciosamente,
Equipe HelpDesk
        `,
        isDefault: true,
        isActive: true
      }
    ]).returning();

    console.log(`✅ ${emailTemplates.length} templates de email criados!`);

    // 5. Resumo final
    console.log('\n📊 Resumo dos dados criados:');
    console.log(`👥 Usuários: ${users.length + 1} (incluindo admin existente)`);
    console.log(`🏢 Clientes: ${requesters.length + 1} (incluindo João Silva existente)`);
    console.log(`🎫 Tickets: ${tickets.length + 1} (incluindo ticket existente)`);
    console.log(`📧 Templates: ${emailTemplates.length}`);
    
    console.log('\n🎉 População do banco concluída com sucesso!');
    console.log('🌐 Acesse: http://localhost:5000');
    console.log('🔑 Login: admin / admin123');

  } catch (error) {
    console.error('❌ Erro ao popular banco:', error);
  }
}

// Configurar DATABASE_URL se não estiver definida
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk';
}

seedData().catch(console.error);
