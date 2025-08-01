# Módulo de Contratos e SLAs

Este módulo implementa a gestão de contratos e Service Level Agreements (SLAs) para o sistema de HelpDesk.

## 📁 Estrutura dos Arquivos

### Schemas (Shared)
- `shared/schema/calendars.ts` - Define calendários de trabalho
- `shared/schema/contracts.ts` - Define contratos entre empresa e clientes  
- `shared/schema/sla_rules.ts` - Define regras de SLA por prioridade

### Backend (Server)
- `server/services/contract.service.ts` - Lógica de negócio para contratos
- `server/http/routes/contract.routes.ts` - Rotas da API REST

### Migrations
- `migrations/create_contracts_sla_tables.sql` - Script SQL para criação das tabelas

## 🚀 Como Usar

### 1. Executar as Migrações

```bash
# Execute o script SQL no PostgreSQL
psql -d helpdesk -f migrations/create_contracts_sla_tables.sql
```

### 2. Integrar as Rotas

```typescript
// No seu arquivo principal de rotas (ex: server/routes.ts)
import contractRoutes from './http/routes/contract.routes';

app.use('/api/contracts', contractRoutes);
```

### 3. Configurar o Drizzle

```typescript
// No seu arquivo de configuração do Drizzle
import { calendars, calendarsRelations } from '../shared/schema/calendars';
import { contracts, contractsRelations } from '../shared/schema/contracts';
import { slaRules, slaRulesRelations } from '../shared/schema/sla_rules';

export { 
  calendars, 
  calendarsRelations,
  contracts, 
  contractsRelations,
  slaRules,
  slaRulesRelations 
};
```

## 📋 Exemplos de Uso da API

### Criar um Contrato

```typescript
POST /api/contracts
{
  "requesterId": 1,
  "calendarId": 1,
  "name": "Contrato de Suporte - Empresa ABC",
  "type": "support",
  "monthlyHours": 40,
  "baseValue": "5000.00",
  "extraHourValue": "150.00",
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-12-31T23:59:59Z",
  "isActive": true
}
```

### Listar Contratos com Filtros

```typescript
GET /api/contracts?type=support&isActive=true&page=1&limit=10
```

### Buscar Contrato por ID

```typescript
GET /api/contracts/1
```

### Atualizar Contrato

```typescript
PUT /api/contracts/1
{
  "monthlyHours": 50,
  "baseValue": "6000.00"
}
```

### Ativar/Desativar Contrato

```typescript
POST /api/contracts/1/activate
POST /api/contracts/1/deactivate
```

### Buscar Regras de SLA de um Contrato

```typescript
GET /api/contracts/1/sla-rules
```

## 🎯 Recursos Implementados

### Contratos
- ✅ CRUD completo com validação Zod
- ✅ Filtros avançados (tipo, status, datas)
- ✅ Paginação
- ✅ Relacionamentos com calendários
- ✅ Ativação/desativação
- ✅ Verificação de dependências antes da deleção
- ✅ Estatísticas básicas

### Calendários
- ✅ Definição de horários de trabalho por dia da semana
- ✅ Lista de feriados personalizável
- ✅ Validação de estrutura JSON

### Regras de SLA
- ✅ Definição por prioridade e contrato
- ✅ Tempos de resposta e solução
- ✅ Templates padrão por tipo de contrato
- ✅ Funções utilitárias para conversão de tempo
- ✅ Cascade delete quando contrato é removido

## 🔧 Configurações de Validação

### Tipos de Contrato Suportados
- `support` - Suporte técnico
- `maintenance` - Manutenção
- `development` - Desenvolvimento
- `consulting` - Consultoria

### Prioridades de SLA
- `low` - Baixa
- `medium` - Média
- `high` - Alta
- `urgent` - Urgente
- `critical` - Crítica

### Templates de SLA Padrão

Cada tipo de contrato possui templates de SLA pré-configurados:

```typescript
// Exemplo para contratos de suporte
const supportSLA = [
  { priority: 'critical', responseTime: '15 min', solutionTime: '4 horas' },
  { priority: 'urgent', responseTime: '1 hora', solutionTime: '8 horas' },
  { priority: 'high', responseTime: '4 horas', solutionTime: '24 horas' },
  { priority: 'medium', responseTime: '8 horas', solutionTime: '48 horas' },
  { priority: 'low', responseTime: '24 horas', solutionTime: '120 horas' }
];
```

## 🔒 Validações e Constraints

### Contratos
- Nome obrigatório (máx. 255 caracteres)
- Horas mensais: 1-720 horas
- Valores monetários ≥ 0
- Data fim > data início (se informada)
- Calendário deve existir

### Regras de SLA
- Tempos > 0 minutos
- Tempo de solução ≥ tempo de resposta
- Prioridade única por contrato
- Contrato deve existir

### Calendários
- Nome obrigatório
- Horários em formato HH:MM
- Estrutura JSON válida para working_hours
- Feriados em formato YYYY-MM-DD

## 📈 Funcionalidades Avançadas

### Service Layer
- Tratamento robusto de erros
- Logs detalhados
- Transações quando necessário
- Validação de integridade referencial

### API Features
- Respostas padronizadas
- Paginação automática
- Filtros flexíveis
- Códigos de status HTTP apropriados
- Mensagens de erro descritivas

### Performance
- Índices otimizados
- Queries eficientes com JOINs
- Paginação server-side
- Lazy loading de relacionamentos

## 🔄 Próximos Passos Sugeridos

1. **Integração com Tickets**: Conectar regras de SLA com sistema de tickets
2. **Cálculo de SLA**: Implementar lógica para verificar cumprimento de SLAs
3. **Relatórios**: Dashboard de performance de SLAs
4. **Notificações**: Alertas para SLAs próximos do vencimento
5. **Histórico**: Auditoria de mudanças em contratos
6. **Faturamento**: Módulo para cálculo de horas extras e faturamento

## 🧪 Testes

```typescript
// Exemplo de teste para o ContractService
describe('ContractService', () => {
  it('should create contract with valid data', async () => {
    const contractData = {
      requesterId: 1,
      calendarId: 1,
      name: 'Test Contract',
      type: 'support' as const,
      monthlyHours: 40,
      baseValue: '5000.00',
      extraHourValue: '150.00',
      startDate: new Date(),
      isActive: true
    };
    
    const contract = await contractService.create(contractData);
    expect(contract.id).toBeDefined();
    expect(contract.name).toBe('Test Contract');
  });
});
```

Este módulo fornece uma base sólida e extensível para gestão de contratos e SLAs, seguindo as melhores práticas de desenvolvimento com TypeScript, Zod e Drizzle ORM.
