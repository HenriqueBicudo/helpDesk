# 🎨 Guia de Personalização de Tickets - HelpDesk System

## 📊 **CAMPOS BÁSICOS DO TICKET**

### **Campos Obrigatórios:**
```typescript
{
  subject: string,        // Assunto (min 3 chars)
  description: string,    // Descrição (min 10 chars)
  category: TicketCategory,
  requesterId: number    // ID do cliente
}
```

### **Campos Opcionais:**
```typescript
{
  priority: 'low' | 'medium' | 'high' | 'critical',
  status: 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed',
  assigneeId: number,    // ID do agente atribuído
  contractId: number,    // ID do contrato (para SLA)
  responseDueAt: Date,   // Prazo para resposta (auto-calculado)
  solutionDueAt: Date    // Prazo para solução (auto-calculado)
}
```

## 🎯 **EXEMPLOS DE PERSONALIZAÇÃO**

### **1. Ticket de Suporte Técnico Crítico:**
```json
{
  "subject": "Sistema fora do ar - Produção",
  "description": "Aplicação principal não está respondendo desde 14:30",
  "priority": "critical",
  "category": "technical_support",
  "status": "open",
  "assigneeId": 1,
  "contractId": 5
}
```

### **2. Ticket Comercial Simples:**
```json
{
  "subject": "Solicitação de desconto no plano",
  "description": "Cliente gostaria de negociar desconto no plano premium",
  "priority": "low",
  "category": "commercial",
  "status": "open"
}
```

### **3. Ticket Financeiro com Prazo:**
```json
{
  "subject": "Problema no faturamento de janeiro",
  "description": "Cobrança duplicada na fatura do mês 01/2025",
  "priority": "high",
  "category": "financial",
  "status": "in_progress",
  "assigneeId": 3
}
```

## 🔧 **PERSONALIZAÇÕES AVANÇADAS**

### **Custom Fields (Campos Personalizados):**
```typescript
// Usando campo metadata JSON para campos extras
{
  metadata: {
    customFields: {
      severity: 'high',
      affectedUsers: 150,
      serviceLevel: 'production',
      escalationPath: ['manager', 'director'],
      businessImpact: 'revenue_loss',
      estimatedDowntime: '2 hours'
    }
  }
}
```

### **Tags/Labels Personalizadas:**
```typescript
{
  metadata: {
    tags: ['bug', 'ui/ux', 'mobile', 'ios'],
    labels: {
      team: 'frontend',
      sprint: 'sprint-12',
      epic: 'mobile-redesign'
    }
  }
}
```

### **Campos de Negócio:**
```typescript
{
  metadata: {
    business: {
      department: 'IT',
      costCenter: 'CC-001',
      approvalRequired: true,
      budgetCode: 'TECH-2025-Q1',
      vendor: 'Microsoft'
    }
  }
}
```

## 🎨 **TEMPLATES DE TICKET**

### **Template 1: Incidente de Sistema**
```javascript
const systemIncidentTemplate = {
  subject: "[INCIDENTE] {{system}} - {{brief_description}}",
  description: `
**Sistema Afetado:** {{system}}
**Horário do Incidente:** {{timestamp}}
**Usuários Impactados:** {{user_count}}
**Severidade:** {{severity}}
**Descrição:** {{description}}
**Passos para Reproduzir:** {{steps}}
  `,
  priority: "critical",
  category: "technical_support",
  metadata: {
    type: "incident",
    template: "system_incident"
  }
}
```

### **Template 2: Solicitação de Mudança**
```javascript
const changeRequestTemplate = {
  subject: "[MUDANÇA] {{change_type}} - {{brief_description}}",
  description: `
**Tipo de Mudança:** {{change_type}}
**Justificativa:** {{justification}}
**Impacto Esperado:** {{impact}}
**Rollback Plan:** {{rollback}}
**Aprovação Necessária:** {{approval_required}}
  `,
  priority: "medium",
  category: "technical_support",
  metadata: {
    type: "change_request",
    template: "change_request",
    requiresApproval: true
  }
}
```

### **Template 3: Solicitação Comercial**
```javascript
const commercialRequestTemplate = {
  subject: "[COMERCIAL] {{request_type}} - {{client_name}}",
  description: `
**Cliente:** {{client_name}}
**Tipo de Solicitação:** {{request_type}}
**Plano Atual:** {{current_plan}}
**Solicitação:** {{request_details}}
**Urgência:** {{urgency}}
  `,
  priority: "low",
  category: "commercial",
  metadata: {
    type: "commercial_request",
    template: "commercial_request"
  }
}
```

## 🚀 **AUTOMAÇÕES DE PERSONALIZAÇÃO**

### **Auto-Categorização por Palavras-Chave:**
```typescript
const categoryRules = {
  'technical_support': ['erro', 'bug', 'falha', 'sistema', 'api'],
  'financial': ['pagamento', 'fatura', 'cobrança', 'valor'],
  'commercial': ['contrato', 'venda', 'desconto', 'upgrade']
};
```

### **Auto-Priorização:**
```typescript
const priorityRules = {
  'critical': ['produção', 'fora do ar', 'emergência'],
  'high': ['urgente', 'importante', 'cliente vip'],
  'medium': ['normal', 'padrão'],
  'low': ['melhoria', 'sugestão', 'dúvida']
};
```

### **Auto-Atribuição:**
```typescript
const assignmentRules = {
  category: {
    'technical_support': [1, 2, 3], // IDs dos agentes técnicos
    'financial': [4, 5],            // IDs dos agentes financeiros
    'commercial': [6, 7, 8]         // IDs dos agentes comerciais
  },
  priority: {
    'critical': [1, 2], // Apenas agentes seniores
    'high': [1, 2, 3],
    'medium': 'round_robin',
    'low': 'round_robin'
  }
};
```

## 📋 **VALIDAÇÕES PERSONALIZADAS**

### **Validação por Categoria:**
```typescript
const categoryValidations = {
  technical_support: {
    required: ['description', 'steps_to_reproduce'],
    optional: ['error_log', 'environment']
  },
  financial: {
    required: ['invoice_number', 'amount'],
    optional: ['payment_method', 'due_date']
  },
  commercial: {
    required: ['client_company', 'contact_person'],
    optional: ['contract_value', 'renewal_date']
  }
};
```

### **Validação por Prioridade:**
```typescript
const priorityValidations = {
  critical: {
    required: ['business_impact', 'affected_users'],
    autoAssign: true,
    escalationTime: 15 // minutos
  },
  high: {
    required: ['urgency_reason'],
    escalationTime: 60 // minutos
  }
};
```

## 🎯 **COMO IMPLEMENTAR PERSONALIZAÇÃO**

### **1. Via Interface Web:**
- ✅ Formulário de criação de ticket
- ✅ Editor de ticket existente
- ✅ Templates pré-definidos
- ✅ Campos dinâmicos baseados na categoria

### **2. Via API:**
```bash
# Criar ticket personalizado
POST /api/tickets
{
  "subject": "Título personalizado",
  "description": "Descrição detalhada",
  "priority": "high",
  "category": "technical_support",
  "metadata": {
    "customField1": "valor1",
    "tags": ["importante", "cliente-vip"]
  }
}

# Atualizar ticket
PUT /api/tickets/:id
{
  "priority": "critical",
  "metadata": {
    "escalated": true,
    "escalation_reason": "SLA breach"
  }
}
```

### **3. Via Automação:**
```typescript
// Rules engine para automação
const automationRules = [
  {
    trigger: 'ticket_created',
    condition: 'priority === "critical"',
    action: 'auto_assign_senior_agent'
  },
  {
    trigger: 'keyword_detected',
    condition: 'contains("produção")',
    action: 'set_priority_high'
  }
];
```

## 🏆 **MELHORES PRÁTICAS**

### **✅ DO:**
- Use categorias consistentes
- Defina prioridades baseadas em impacto de negócio
- Implemente templates para tipos comuns
- Use automações para reduzir trabalho manual
- Mantenha metadados organizados

### **❌ DON'T:**
- Não crie muitas categorias desnecessárias
- Não ignore validações de campos obrigatórios
- Não misture informações pessoais em metadados
- Não sobrecarregue com campos opcionais demais

---

**🚀 O sistema oferece flexibilidade total para personalizar tickets conforme suas necessidades específicas!**
