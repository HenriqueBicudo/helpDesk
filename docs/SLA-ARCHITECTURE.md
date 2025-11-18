# Arquitetura do Sistema SLA

## 📋 Visão Geral

O sistema de SLA (Service Level Agreement) do HelpDesk é responsável por calcular, monitorar e gerenciar os prazos de resposta e solução de tickets com base em regras definidas por contrato e prioridade.

## 🏗️ Componentes Principais

### 1. **SLA Service** (`server/services/sla.service.ts`)
**Responsabilidade:** CRUD de configurações/regras de SLA

**Métodos principais:**
- `getAllConfigurations(filters?)` - Lista todas as regras SLA com filtros opcionais
- `getByContractId(contractId)` - Busca regras de um contrato específico
- `getById(id)` - Busca uma regra por ID
- `findByContractAndPriority(contractId, priority)` - Busca regra específica (usado pelo Engine)
- `create(data)` - Cria nova regra SLA
- `update(id, data)` - Atualiza regra existente
- `delete(id)` - Remove regra SLA
- `count()` - Conta total de regras no sistema

**Schema da Tabela `sla_rules`:**
```typescript
{
  id: number;                    // ID autoincremental
  contractId: number;            // Referência ao contrato
  priority: string;              // 'low' | 'medium' | 'high' | 'urgent' | 'critical'
  responseTimeMinutes: number;   // Tempo máximo para primeira resposta
  solutionTimeMinutes: number;   // Tempo máximo para resolução completa
  createdAt: Date;
}
```

---

### 2. **SLA Engine Service** (`server/services/slaEngine.service.ts`)
**Responsabilidade:** Motor de cálculo de prazos de SLA

**Métodos principais:**
- `calculateDeadlines(ticketId)` - Calcula prazos de resposta e solução
- `calculateAndApplyDeadlines(ticketId)` - Calcula e salva no banco
- `updateTicketDeadlines(ticketId, deadlines)` - Atualiza prazos no ticket

**Fluxo de Cálculo:**
1. Busca dados do ticket com relacionamentos (contrato, calendário, regras SLA)
2. Valida se todos os dados necessários existem
3. Encontra regra SLA correspondente à prioridade do ticket
4. Calcula `responseDueAt` e `solutionDueAt` considerando:
   - Horário comercial do calendário
   - Fins de semana (pula automaticamente)
   - Feriados definidos no calendário
   - Conta apenas minutos úteis
5. Atualiza o ticket com os prazos calculados

**Exemplo de Cálculo:**
```
Ticket criado: 13/11/2025 17:30 (sexta-feira)
Prioridade: HIGH
Regra SLA: responseTime = 240min (4h), solutionTime = 1440min (24h)
Calendário: Segunda a Sexta, 08:00-18:00

Cálculo:
- Início: 13/11/2025 17:30
- Restam 30min até fim do expediente (18:00)
- Pula para segunda 18/11/2025 08:00
- Adiciona 3h30min úteis restantes
- responseDueAt: 18/11/2025 11:30

Para solução: continua contando até completar 24h úteis
```

---

### 3. **SLA Monitor Service** (`server/services/slaMonitor.service.ts`)
**Responsabilidade:** Monitoramento contínuo e ações proativas

**Métodos principais:**
- `checkSlaAndTakeAction()` - Método principal executado pelo cron
- `getSlaStats()` - Estatísticas de SLA (total, em risco, violados)
- `manualSlaCheck()` - Verificação manual para testes

**Fluxo de Monitoramento:**
1. Busca tickets em risco (próximos do vencimento ou já violados)
2. Para cada ticket:
   - Determina status SLA (warning ou breach)
   - Cria notificação/interação de alerta
   - Se violado: escala prioridade automaticamente para CRITICAL
3. Loga estatísticas do processo

**Configurações:**
```typescript
WARNING_TIME_HOURS = 2;          // Alerta 2 horas antes do vencimento
BREACH_ESCALATION_ENABLED = true; // Habilita escalação automática
```

---

### 4. **SLA Monitor Job** (`server/jobs/sla-monitor.job.ts`)
**Responsabilidade:** Cron job que executa o monitor periodicamente

**Configuração:**
```typescript
Intervalo: A cada 5 minutos
Executa: slaMonitorService.checkSlaAndTakeAction()
```

**Métodos de controle:**
```typescript
getSlaMonitorJob().start()   // Inicia o job
getSlaMonitorJob().stop()    // Para o job
getSlaMonitorJob().restart() // Reinicia o job
getSlaMonitorJob().runManual() // Executa manualmente
getSlaMonitorJob().getJobInfo() // Status do job
```

---

## 🔄 Fluxo Completo do Sistema

### **1. Criação de Ticket com SLA**

```
POST /api/tickets
  ↓
routes.ts: Valida dados e cria ticket
  ↓
storage.createTicket(data)
  ↓
Ticket criado com sucesso
  ↓
if (ticket.contractId) {
  slaEngineService.calculateAndApplyDeadlines(ticket.id)
}
  ↓
Ticket tem responseDueAt e solutionDueAt definidos
```

### **2. Monitoramento Contínuo**

```
A cada 5 minutos
  ↓
sla-monitor.job executa
  ↓
slaMonitorService.checkSlaAndTakeAction()
  ↓
Busca tickets com solutionDueAt próximo ou passado
  ↓
Para cada ticket:
  - Cria alerta/interação
  - Se violado: escala prioridade para CRITICAL
  - Notifica agente/manager responsável
```

### **3. Gestão de Regras SLA**

```
Admin acessa /sla-admin-dashboard
  ↓
Lista contratos e regras existentes
  ↓
POST /api/sla/configurations
{
  "contractId": 123,
  "priority": "high",
  "responseTimeMinutes": 240,
  "solutionTimeMinutes": 1440
}
  ↓
slaService.create(data)
  ↓
Regra SLA salva e disponível para cálculos
```

---

## 📊 API Endpoints

### **Monitoramento**
- `GET /api/sla/stats` - Estatísticas de SLA
- `GET /api/sla/monitor/status` - Status do job de monitoramento
- `POST /api/sla/monitor/check` - Verificação manual
- `POST /api/sla/monitor/restart` - Reinicia o job
- `GET /api/sla/health` - Health check do sistema SLA

### **Configurações (CRUD)**
- `GET /api/sla/configurations` - Lista regras SLA
- `POST /api/sla/configurations` - Cria regra SLA
- `GET /api/sla/configurations/:id` - Busca regra específica
- `PUT /api/sla/configurations/:id` - Atualiza regra
- `DELETE /api/sla/configurations/:id` - Remove regra

### **Filtros e Helpers**
- `GET /api/sla/contracts/:contractId/configurations` - Regras de um contrato
- `GET /api/sla/rules` - Lista simplificada para selects
- `GET /api/sla/metrics` - Métricas de desempenho
- `GET /api/sla/alerts` - Alertas não reconhecidos

---

## 🎨 Frontend Components

### **Dashboards**
- `sla-admin-dashboard.tsx` - Gestão completa de regras SLA
- `sla-manager-dashboard.tsx` - Visão gerencial de métricas
- `sla-agent-dashboard.tsx` - Dashboard para agentes

### **Componentes Reutilizáveis**
- `sla-status-badge.tsx` - Badge de status (OK, Warning, Breach)
- `sla-countdown.tsx` - Contador regressivo de tempo
- `sla-metrics-card.tsx` - Card de métricas
- `sla-compliance-chart.tsx` - Gráfico de compliance
- `sla-configurator.tsx` - Formulário de configuração
- `sla-notifications.tsx` - Sistema de notificações
- `sla-notification-badge.tsx` - Badge de alertas
- `sla-warning-flag.tsx` - Flag de alerta em tickets

### **Hook**
- `use-sla.tsx` - Hook para consumir dados SLA no frontend

---

## ✅ Melhorias Implementadas

1. **Métodos CRUD completos** no `sla.service.ts`
2. **Integração automática** de SLA ao criar tickets
3. **Validação de duplicação** de regras (contrato + prioridade únicos)
4. **Filtros em memória** para evitar erros de tipagem do Drizzle
5. **Tratamento de erros** robusto sem interromper fluxo principal
6. **Logs detalhados** para debug e monitoramento

---

## 🚀 Como Usar

### **1. Criar Regra SLA**
```typescript
// Via API
POST /api/sla/configurations
{
  "contractId": 1,
  "priority": "critical",
  "responseTimeMinutes": 15,
  "solutionTimeMinutes": 240
}
```

### **2. Ticket Automático com SLA**
```typescript
// Ao criar ticket com contractId, SLA é aplicado automaticamente
POST /api/tickets
{
  "subject": "Sistema fora do ar",
  "priority": "critical",
  "contractId": 1,
  "requesterId": 5
}

// Ticket retornará com:
// - responseDueAt: calculado com base na regra
// - solutionDueAt: calculado com base na regra
```

### **3. Monitorar SLA**
```typescript
// Verificação manual
POST /api/sla/monitor/check

// Ver estatísticas
GET /api/sla/stats
// Response:
{
  "total": 150,
  "withSla": 120,
  "atRisk": 15,
  "breached": 3
}
```

---

## 📝 Notas Importantes

1. **Calendário é obrigatório** - Ticket precisa de contrato com calendário configurado
2. **Regras são por prioridade** - Uma regra por contrato+prioridade
3. **Cálculo só conta tempo útil** - Fins de semana e feriados não contam
4. **Escalação automática** - Tickets violados viram CRITICAL automaticamente
5. **Não quebra o fluxo** - Se cálculo de SLA falhar, ticket ainda é criado

---

## 🔧 Troubleshooting

**Problema:** SLA não está sendo calculado
**Solução:** 
- Verificar se ticket tem `contractId`
- Verificar se contrato tem `calendarId`
- Verificar se existem regras SLA para a prioridade do ticket

**Problema:** Monitor não está rodando
**Solução:**
```typescript
POST /api/sla/monitor/restart
```

**Problema:** Prazos parecem incorretos
**Solução:**
- Verificar horário comercial do calendário
- Verificar se há feriados cadastrados
- Checar logs do `slaEngine.service` para ver cálculo detalhado

---

## 📚 Referências

- Schema: `shared/schema/sla_rules.ts`
- Migration: `migrations/create_contracts_sla_tables.sql`
- Exemplos: `client/src/examples/sla-integration-examples.tsx`
