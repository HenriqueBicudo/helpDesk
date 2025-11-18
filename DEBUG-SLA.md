# Debug: SLA não está sendo calculado

## 🔍 Problema Identificado

O ticket foi criado mas o SLA não foi calculado. Investigando...

## ❌ Causa Raiz Encontrada

**INCOMPATIBILIDADE DE TIPOS NO SCHEMA:**

1. **Tabela `tickets`** (drizzle-schema.ts):
   ```typescript
   contractId: varchar('contract_id', { length: 255 }) // STRING UUID
   ```

2. **Tabela `contracts`** (schema/contracts.ts):
   ```typescript
   id: varchar('id', { length: 255 }).primaryKey() // STRING UUID
   ```

3. **Tabela `sla_rules`** (schema/sla_rules.ts) - ANTES:
   ```typescript
   contractId: integer('contract_id').notNull() // NUMBER ❌ ERRADO!
   ```

**O problema:** 
- `sla_rules.contractId` estava definido como INTEGER
- `contracts.id` é VARCHAR (UUID)
- Foreign key reference estava quebrada
- SLA Engine não conseguia buscar regras SLA do contrato
- Sem regras SLA, cálculo era pulado

## ✅ Solução Implementada

### **1. Correção do Schema `sla_rules.ts`**

```typescript
// ANTES:
contractId: integer('contract_id').notNull()...

// DEPOIS:
contractId: varchar('contract_id', { length: 255 }).notNull()...
```

### **2. Atualização dos Schemas Zod**

```typescript
// ANTES:
contractId: z.number().int().positive()

// DEPOIS:
contractId: z.string().min(1)
```

### **3. Atualização do `sla.service.ts`**

- Mudado `contractId: number` para `contractId: string`
- Todos os métodos agora usam string UUID

### **4. Atualização do `slaEngine.service.ts`**

- Interface `TicketWithSlaData.contract.id` agora é `string`
- Removido parsing de `parseInt(contractId)`
- Busca direta por string UUID

### **5. Atualização das Rotas SLA**

- Removido `parseInt()` dos parâmetros contractId
- Validação agora usa `.trim()` em vez de `isNaN()`

## 🔧 Checklist de Correções

- [x] Schema `sla_rules.ts` - contractId como VARCHAR
- [x] Schemas Zod - validação string
- [x] `sla.service.ts` - tipos string
- [x] `slaEngine.service.ts` - tipos string e busca corrigida
- [x] `sla.routes.ts` - parâmetros string
- [x] Logs de debug adicionados no SLA Engine

## 🧪 Como Testar

1. **Criar regra SLA:**
   ```bash
   POST /api/sla/configurations
   {
     "contractId": "CONTRACT_123",  # STRING UUID
     "priority": "critical",
     "responseTimeMinutes": 15,
     "solutionTimeMinutes": 240
   }
   ```

2. **Criar ticket com contrato:**
   ```bash
   POST /api/tickets
   {
     "subject": "Teste SLA",
     "priority": "critical",
     "contractId": "CONTRACT_123",  # STRING UUID
     "requesterId": 1
   }
   ```

3. **Verificar logs no console:**
   ```
   🎯 Iniciando cálculo de SLA para ticket X
   📋 Ticket encontrado: ID=X, Priority=critical, ContractId=CONTRACT_123
   🔍 Buscando contrato CONTRACT_123...
   ✅ Contrato encontrado: ID=CONTRACT_123, CalendarId=1
   🔍 Buscando calendário 1...
   ✅ Calendário encontrado: Comercial
   🔍 Buscando regras SLA para contrato CONTRACT_123...
   📋 Regras SLA encontradas: 1 regras
      Prioridades disponíveis: critical
   🔍 Validação de dados SLA:
      ✓ Tem contrato? true
      ✓ Tem calendário? true
      ✓ Tem regras SLA? true (1 regras)
   📋 Aplicando regra SLA: 15min resposta, 240min solução
   ✅ SLA calculado para ticket X:
      📞 Resposta até: DD/MM/YYYY HH:mm
      🔧 Solução até: DD/MM/YYYY HH:mm
   ✅ SLA aplicado ao ticket #X
   ```

## 📝 Observação Importante

**⚠️ MIGRATION NECESSÁRIA:**

Se o banco de dados já existe com `sla_rules.contract_id` como INTEGER, será necessário criar uma migration para:

1. Dropar a constraint de foreign key
2. Alterar coluna de INTEGER para VARCHAR(255)
3. Recriar a foreign key
4. Atualizar dados existentes (se houver)

```sql
-- Migration exemplo (ajustar conforme necessário)
ALTER TABLE sla_rules DROP CONSTRAINT IF EXISTS sla_rules_contract_id_contracts_id_fk;
ALTER TABLE sla_rules ALTER COLUMN contract_id TYPE VARCHAR(255);
ALTER TABLE sla_rules ADD CONSTRAINT sla_rules_contract_id_contracts_id_fk 
  FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;
```

## ✅ Status

- [x] Schema corrigido
- [x] Código atualizado
- [x] Logs de debug adicionados
- [ ] Migration do banco de dados (necessário se já existir)
- [ ] Teste end-to-end confirmado

