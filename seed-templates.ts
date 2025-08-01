import { db } from './server/db-drizzle';
import { responseTemplates } from './shared/drizzle-schema';

async function seedTemplates() {
  console.log('📝 Populando templates de resposta...');
  
  try {
    const templates = await db.insert(responseTemplates).values([
      // Templates para Suporte Técnico
      {
        name: 'Problema de Login - Primeira Resposta',
        category: 'technical_support',
        subject: 'Re: {{ticket_subject}}',
        content: `Olá {{customer_name}},

Obrigado por entrar em contato conosco.

Recebemos sua solicitação sobre problemas de login e nossa equipe já está trabalhando para resolver a questão.

**Primeira verificação:**
- Confirme se está usando o email correto: {{customer_email}}
- Tente usar a opção "Esqueci minha senha"
- Limpe o cache do seu navegador
- Tente acessar em modo anônimo/privado

Se o problema persistir, favor informar:
1. Navegador utilizado e versão
2. Sistema operacional
3. Horário da última tentativa de acesso
4. Mensagem de erro exata (se houver)

Retornaremos em breve com uma solução.

Atenciosamente,
{{agent_name}}
Equipe de Suporte Técnico`,
        isActive: true
      },
      {
        name: 'Sistema Lento - Investigação',
        category: 'technical_support',
        subject: 'Re: {{ticket_subject}} - Investigando Performance',
        content: `Olá {{customer_name}},

Entendemos sua preocupação com a lentidão do sistema e já iniciamos uma investigação detalhada.

**Informações que precisamos:**
- Quantos usuários estão conectados simultaneamente?
- Em que horários a lentidão é mais perceptível?
- Quais módulos específicos estão mais lentos?
- Há relatórios ou operações pesadas sendo executadas?

**Verificações em andamento:**
✓ Análise dos logs do servidor
✓ Monitoramento de recursos
✓ Verificação de consultas SQL
⏳ Análise de tráfego de rede

Estimativa de resolução: 2-4 horas úteis.

Manteremos você informado do progresso.

Atenciosamente,
{{agent_name}}
Equipe de Suporte Técnico`,
        isActive: true
      },
      {
        name: 'Erro 500 - Análise Técnica',
        category: 'technical_support',
        subject: 'Re: {{ticket_subject}} - Análise do Erro 500',
        content: `Olá {{customer_name}},

Identificamos o erro HTTP 500 reportado e nossa equipe técnica está investigando.

**Status da Investigação:**
🔍 Logs do servidor analisados
🔍 Verificação de integridade do banco
🔍 Análise de dependências
🔍 Teste de conectividade

**Ação Imediata:**
Para contornar temporariamente o problema:
1. Aguarde 5 minutos e tente novamente
2. Use Ctrl+F5 para forçar atualização
3. Se persistir, acesse via: {{backup_url}}

**Prazo estimado:** Resolução definitiva em até 6 horas.

Atualizaremos este ticket assim que tivermos mais informações.

Atenciosamente,
{{agent_name}}
Equipe de Suporte Técnico`,
        isActive: true
      },

      // Templates para Financeiro
      {
        name: 'Cobrança Duplicada - Verificação',
        category: 'financial',
        subject: 'Re: {{ticket_subject}} - Verificação de Cobrança',
        content: `Olá {{customer_name}},

Recebemos sua solicitação sobre cobrança duplicada e já iniciamos a verificação.

**Dados para análise:**
- Conta: {{customer_email}}
- Período: {{billing_period}}
- Valor reportado: R$ {{amount}}

**Próximos passos:**
1. ✓ Verificação no sistema financeiro
2. ⏳ Análise do histórico de transações  
3. ⏳ Conferência com o gateway de pagamento
4. ⏳ Processo de estorno (se confirmado)

**Prazo:** Análise completa em até 2 dias úteis.

Se confirmada a duplicação, o estorno será processado automaticamente na próxima fatura ou via PIX, conforme sua preferência.

Atenciosamente,
{{agent_name}}
Departamento Financeiro`,
        isActive: true
      },
      {
        name: 'Alteração de Plano - Confirmação',
        category: 'financial',
        subject: 'Re: {{ticket_subject}} - Alteração de Plano',
        content: `Olá {{customer_name}},

Recebemos sua solicitação para alteração de plano.

**Plano Atual:** {{current_plan}}
**Plano Solicitado:** {{requested_plan}}
**Diferença de Valor:** R$ {{price_difference}}/mês

**Benefícios do novo plano:**
✓ {{benefit_1}}
✓ {{benefit_2}}  
✓ {{benefit_3}}
✓ Suporte prioritário

**Próximos passos:**
1. Confirmação de alteração
2. Ajuste proporcional na próxima fatura
3. Ativação dos novos recursos
4. Envio de nova documentação

A alteração entrará em vigor imediatamente após sua confirmação.

Confirma a alteração?

Atenciosamente,
{{agent_name}}
Departamento Comercial`,
        isActive: true
      },

      // Templates para Comercial
      {
        name: 'Solicitação de Novo Usuário',
        category: 'commercial',
        subject: 'Re: {{ticket_subject}} - Adição de Usuário',
        content: `Olá {{customer_name}},

Recebemos sua solicitação para adição de novo usuário.

**Dados informados:**
- Nome: {{new_user_name}}
- Email: {{new_user_email}}
- Perfil: {{user_role}}

**Verificação do plano:**
- Plano atual: {{current_plan}}
- Usuários inclusos: {{included_users}}
- Usuários ativos: {{active_users}}
- Disponível: {{available_slots}}

{{#if_additional_cost}}
**Custo adicional:** R$ {{additional_cost}}/mês
{{/if_additional_cost}}

**Próximos passos:**
1. ✓ Criação da conta
2. ⏳ Configuração de permissões
3. ⏳ Envio de credenciais
4. ⏳ Email de boas-vindas

O usuário será criado nas próximas 2 horas úteis.

Atenciosamente,
{{agent_name}}
Equipe Comercial`,
        isActive: true
      },
      {
        name: 'Treinamento - Agendamento',
        category: 'commercial',
        subject: 'Re: {{ticket_subject}} - Agendamento de Treinamento',
        content: `Olá {{customer_name}},

Ficamos felizes em saber do interesse em treinamento para sua equipe!

**Opções de treinamento:**
🎯 **Básico** (2h): Navegação e funcionalidades principais
🎯 **Intermediário** (4h): Relatórios e configurações
🎯 **Avançado** (6h): Customizações e integrações
🎯 **Personalizado**: Conforme suas necessidades

**Modalidades:**
- Online (via Teams/Zoom)
- Presencial (mediante agendamento)
- Material gravado + sessão tira-dúvidas

**Participantes informados:** {{participant_count}} pessoas

**Próximos passos:**
1. Escolha da modalidade e nível
2. Definição de data/horário
3. Envio de convites
4. Preparação de material personalizado

Retorne com suas preferências para agendarmos.

Atenciosamente,
{{agent_name}}
Equipe de Treinamento`,
        isActive: true
      },

      // Templates Gerais
      {
        name: 'Primeira Resposta - Geral',
        category: 'other',
        subject: 'Re: {{ticket_subject}} - Recebemos sua solicitação',
        content: `Olá {{customer_name}},

Obrigado por entrar em contato conosco!

Recebemos sua solicitação (Ticket #{{ticket_id}}) e nossa equipe já está analisando sua questão.

**Detalhes do ticket:**
- Assunto: {{ticket_subject}}
- Prioridade: {{priority}}
- Categoria: {{category}}
- Responsável: {{agent_name}}

**Expectativa de resposta:**
- Crítica: até 2 horas
- Alta: até 4 horas  
- Média: até 8 horas
- Baixa: até 24 horas

Você receberá atualizações por email sempre que houver progresso.

Em caso de urgência, ligue para: (11) 99999-9999

Atenciosamente,
{{agent_name}}
Equipe de Suporte`,
        isActive: true
      },
      {
        name: 'Ticket Resolvido - Confirmação',
        category: 'other',
        subject: 'Re: {{ticket_subject}} - Ticket Resolvido',
        content: `Olá {{customer_name}},

Temos o prazer de informar que seu ticket #{{ticket_id}} foi resolvido!

**Resumo da solução:**
{{resolution_summary}}

**Tempo total:** {{resolution_time}}
**Resolvido por:** {{agent_name}}

**Verificação:**
Por favor, confirme se a solução atendeu completamente sua necessidade:
- ✅ Problema totalmente resolvido
- ⚠️ Problema parcialmente resolvido  
- ❌ Problema ainda persiste

**Avaliação:**
Sua opinião é muito importante! Avalie nosso atendimento:
⭐⭐⭐⭐⭐ [Link da pesquisa: {{survey_link}}]

Se precisar de mais alguma coisa, não hesite em nos contatar.

Atenciosamente,
{{agent_name}}
Equipe de Suporte`,
        isActive: true
      }
    ]).returning();

    console.log(`✅ ${templates.length} templates de resposta criados!`);
    
    // Listar templates criados
    console.log('\n📋 Templates criados:');
    templates.forEach(template => {
      console.log(`- ${template.name} (${template.category})`);
    });

  } catch (error) {
    console.error('❌ Erro ao criar templates:', error);
  }
}

// Configurar DATABASE_URL se não estiver definida
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk';
}

seedTemplates().catch(console.error);
