import { db } from './server/db-drizzle';
import { users, requesters, tickets, emailTemplates } from './shared/drizzle-schema';

async function generateMoreData() {
  console.log('🔄 Gerando mais dados para o sistema...');

  try {
    // Mais usuários/agentes
    const newUsers = await db.insert(users).values([
      {
        username: 'joao.santos',
        password: '$2b$10$dLb02mxWNxYH1a.3.vJ4Ueg3gJA0i4KTZJ6z8wHvGFrV8k8Y9fxKq', // password123
        fullName: 'João dos Santos',
        email: 'joao.santos@helpdesk.com',
        role: 'agent',
        avatarInitials: 'JS'
      },
      {
        username: 'laura.mendes',
        password: '$2b$10$dLb02mxWNxYH1a.3.vJ4Ueg3gJA0i4KTZJ6z8wHvGFrV8k8Y9fxKq', // password123
        fullName: 'Laura Mendes',
        email: 'laura.mendes@helpdesk.com',
        role: 'agent',
        avatarInitials: 'LM'
      },
      {
        username: 'ricardo.silva',
        password: '$2b$10$dLb02mxWNxYH1a.3.vJ4Ueg3gJA0i4KTZJ6z8wHvGFrV8k8Y9fxKq', // password123
        fullName: 'Ricardo Silva',
        email: 'ricardo.silva@helpdesk.com',
        role: 'manager',
        avatarInitials: 'RS'
      },
      {
        username: 'isabela.costa',
        password: '$2b$10$dLb02mxWNxYH1a.3.vJ4Ueg3gJA0i4KTZJ6z8wHvGFrV8k8Y9fxKq', // password123
        fullName: 'Isabela Costa',
        email: 'isabela.costa@helpdesk.com',
        role: 'agent',
        avatarInitials: 'IC'
      },
      {
        username: 'guilherme.nunes',
        password: '$2b$10$dLb02mxWNxYH1a.3.vJ4Ueg3gJA0i4KTZJ6z8wHvGFrV8k8Y9fxKq', // password123
        fullName: 'Guilherme Nunes',
        email: 'guilherme.nunes@helpdesk.com',
        role: 'agent',
        avatarInitials: 'GN'
      }
    ]).returning({ id: users.id });

    console.log(`✅ ${newUsers.length} novos usuários criados!`);

    // Mais clientes
    const newRequesters = await db.insert(requesters).values([
      {
        fullName: 'Amanda Santos',
        email: 'amanda.santos@empresag.com',
        company: 'Empresa G Logística',
        avatarInitials: 'AS'
      },
      {
        fullName: 'Diego Fernandes',
        email: 'diego.fernandes@empresah.com',
        company: 'Empresa H Consultoria',
        avatarInitials: 'DF'
      },
      {
        fullName: 'Patrícia Lima',
        email: 'patricia.lima@empresai.com',
        company: 'Empresa I Educação',
        avatarInitials: 'PL'
      },
      {
        fullName: 'Bruno Carvalho',
        email: 'bruno.carvalho@empresaj.com',
        company: 'Empresa J Saúde',
        avatarInitials: 'BC'
      },
      {
        fullName: 'Natália Rocha',
        email: 'natalia.rocha@startupz.com',
        company: 'Startup Z',
        avatarInitials: 'NR'
      },
      {
        fullName: 'André Moreira',
        email: 'andre.moreira@empresak.com',
        company: 'Empresa K Energia',
        avatarInitials: 'AM'
      },
      {
        fullName: 'Vanessa Torres',
        email: 'vanessa.torres@empresal.com',
        company: 'Empresa L Turismo',
        avatarInitials: 'VT'
      },
      {
        fullName: 'Thiago Barbosa',
        email: 'thiago.barbosa@freelancer.com',
        company: 'Freelancer TI',
        avatarInitials: 'TB'
      },
      {
        fullName: 'Priscila Alves',
        email: 'priscila.alves@empresam.com',
        company: 'Empresa M Varejo',
        avatarInitials: 'PA'
      },
      {
        fullName: 'Leonardo Gomes',
        email: 'leonardo.gomes@empresan.com',
        company: 'Empresa N Indústria',
        avatarInitials: 'LG'
      }
    ]).returning({ id: requesters.id });

    console.log(`✅ ${newRequesters.length} novos clientes criados!`);

    // Buscar todos os usuários e clientes para gerar tickets
    const allUsers = await db.select({ id: users.id }).from(users);
    const allRequesters = await db.select({ id: requesters.id }).from(requesters);

    // Função para selecionar item aleatório
    const randomItem = (array: any[]) => array[Math.floor(Math.random() * array.length)];

    // Mais tickets com variedade
    const ticketData = [
      {
        subject: 'Sistema lento durante horário de pico',
        description: 'O sistema fica extremamente lento entre 14h e 16h, dificultando o trabalho da equipe.',
        status: 'open' as const,
        priority: 'high' as const,
        category: 'technical_support' as const
      },
      {
        subject: 'Erro ao processar pagamento via PIX',
        description: 'Clientes relatam erro ao tentar finalizar compras usando PIX como forma de pagamento.',
        status: 'in_progress' as const,
        priority: 'critical' as const,
        category: 'financial' as const
      },
      {
        subject: 'Solicitação de desconto para contrato anual',
        description: 'Gostaríamos de negociar um desconto para renovação antecipada do contrato por mais um ano.',
        status: 'pending' as const,
        priority: 'medium' as const,
        category: 'commercial' as const
      },
      {
        subject: 'Backup automático não está funcionando',
        description: 'O sistema de backup automático parou de funcionar há 3 dias. Preciso de uma solução urgente.',
        status: 'open' as const,
        priority: 'high' as const,
        category: 'technical_support' as const
      },
      {
        subject: 'Integração com API externa falhando',
        description: 'A integração com a API do fornecedor X está retornando erro 500 constantemente.',
        status: 'in_progress' as const,
        priority: 'high' as const,
        category: 'technical_support' as const
      },
      {
        subject: 'Solicitação de nova funcionalidade - Relatórios',
        description: 'Precisamos de um módulo de relatórios personalizados para análise de vendas.',
        status: 'open' as const,
        priority: 'medium' as const,
        category: 'commercial' as const
      },
      {
        subject: 'Problema com certificado SSL',
        description: 'O certificado SSL do site expirou e está causando alertas de segurança nos navegadores.',
        status: 'resolved' as const,
        priority: 'critical' as const,
        category: 'technical_support' as const
      },
      {
        subject: 'Cobrança duplicada na fatura',
        description: 'Identificamos uma cobrança duplicada na fatura do mês passado. Solicitamos estorno.',
        status: 'pending' as const,
        priority: 'medium' as const,
        category: 'financial' as const
      },
      {
        subject: 'Treinamento para nova equipe',
        description: 'Contratamos 5 novos funcionários e precisamos de treinamento no sistema.',
        status: 'open' as const,
        priority: 'low' as const,
        category: 'other' as const
      },
      {
        subject: 'Migração de dados do sistema antigo',
        description: 'Precisamos migrar dados históricos do sistema antigo para o novo. Como proceder?',
        status: 'in_progress' as const,
        priority: 'medium' as const,
        category: 'technical_support' as const
      },
      {
        subject: 'Dashboard não carrega no Internet Explorer',
        description: 'O dashboard principal não carrega quando acessado pelo Internet Explorer 11.',
        status: 'resolved' as const,
        priority: 'low' as const,
        category: 'technical_support' as const
      },
      {
        subject: 'Proposta de parceria comercial',
        description: 'Gostaríamos de discutir uma proposta de parceria para distribuição dos seus produtos.',
        status: 'open' as const,
        priority: 'medium' as const,
        category: 'commercial' as const
      },
      {
        subject: 'Falha na sincronização de dados',
        description: 'Os dados não estão sincronizando entre o aplicativo mobile e a plataforma web.',
        status: 'open' as const,
        priority: 'high' as const,
        category: 'technical_support' as const
      },
      {
        subject: 'Reembolso de taxa de cancelamento',
        description: 'Cancelamos o serviço dentro do prazo de carência e solicitamos reembolso da taxa.',
        status: 'pending' as const,
        priority: 'medium' as const,
        category: 'financial' as const
      },
      {
        subject: 'Configuração de SMTP para emails',
        description: 'Preciso de ajuda para configurar o servidor SMTP para envio de emails automáticos.',
        status: 'closed' as const,
        priority: 'low' as const,
        category: 'technical_support' as const
      },
      {
        subject: 'Customização da interface para nossa marca',
        description: 'Gostaríamos de customizar as cores e logo da interface para nossa identidade visual.',
        status: 'open' as const,
        priority: 'low' as const,
        category: 'commercial' as const
      },
      {
        subject: 'Erro 404 em páginas específicas',
        description: 'Algumas páginas do sistema estão retornando erro 404, principalmente as de relatórios.',
        status: 'in_progress' as const,
        priority: 'medium' as const,
        category: 'technical_support' as const
      },
      {
        subject: 'Auditoria de segurança - Relatório',
        description: 'Solicitamos um relatório completo da última auditoria de segurança realizada.',
        status: 'resolved' as const,
        priority: 'high' as const,
        category: 'other' as const
      },
      {
        subject: 'Problema com upload de arquivos grandes',
        description: 'Não conseguimos fazer upload de arquivos maiores que 10MB. Limite pode ser aumentado?',
        status: 'open' as const,
        priority: 'medium' as const,
        category: 'technical_support' as const
      },
      {
        subject: 'Negociação de prazo para pagamento',
        description: 'Devido a questões financeiras temporárias, solicitamos extensão do prazo de pagamento.',
        status: 'pending' as const,
        priority: 'high' as const,
        category: 'financial' as const
      }
    ];

    const newTickets: any[] = [];
    for (const ticket of ticketData) {
      const requester = randomItem(allRequesters);
      const assignee = randomItem(allUsers);
      
      newTickets.push({
        ...ticket,
        requesterId: requester.id,
        assigneeId: assignee.id
      });
    }

    const createdTickets = await db.insert(tickets).values(newTickets as any).returning({ id: tickets.id });
    console.log(`✅ ${createdTickets.length} novos tickets criados!`);

    // Mais templates de email
    const newEmailTemplates = await db.insert(emailTemplates).values([
      {
        name: 'Ticket Escalado',
        type: 'ticket_escalation',
        subject: 'Seu ticket #{{ticket_id}} foi escalado',
        body: `Olá {{customer_name}},

Informamos que seu ticket #{{ticket_id}} - "{{ticket_subject}}" foi escalado para nossa equipe especializada devido à sua prioridade.

Um supervisor entrará em contato em breve para resolver sua solicitação.

Atenciosamente,
Equipe de Suporte`
      },
      {
        name: 'SLA em Risco',
        type: 'sla_breach',
        subject: 'URGENTE: Ticket #{{ticket_id}} próximo do vencimento do SLA',
        body: `ALERTA: O ticket #{{ticket_id}} está próximo do vencimento do SLA.

Detalhes:
- Cliente: {{customer_name}}
- Assunto: {{ticket_subject}}
- Prioridade: {{priority}}
- Tempo restante: {{time_remaining}}

Ação imediata necessária!`
      },
      {
        name: 'Pesquisa de Satisfação',
        type: 'satisfaction_survey',
        subject: 'Como foi nossa ajuda? Avalie nosso atendimento',
        body: `Olá {{customer_name}},

Seu ticket #{{ticket_id}} foi resolvido com sucesso!

Gostaríamos de saber sua opinião sobre nosso atendimento. Sua avaliação nos ajuda a melhorar continuamente.

⭐ Avalie nosso atendimento: {{survey_link}}

Muito obrigado!
Equipe de Suporte`
      }
    ]).returning({ id: emailTemplates.id });

    console.log(`✅ ${newEmailTemplates.length} novos templates de email criados!`);

    console.log('\n🎉 Geração de dados adiccionais concluída com sucesso!');
    console.log('\n📊 Resumo final:');
    console.log(`- ${newUsers.length} novos usuários/agentes`);
    console.log(`- ${newRequesters.length} novos clientes`);
    console.log(`- ${createdTickets.length} novos tickets`);
    console.log(`- ${newEmailTemplates.length} novos templates de email`);

  } catch (error) {
    console.error('❌ Erro ao gerar dados:', error);
  }
}

generateMoreData();
