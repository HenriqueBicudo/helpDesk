# Gatilhos de Automação - Guia de Uso

## 📋 Visão Geral

Os gatilhos de automação permitem que você crie regras personalizadas que executam ações automaticamente quando certas condições são atendidas nos tickets.

## 🚀 Como Acessar

1. Faça login como **Admin** ou usuário com permissão `settings:manage`
2. Vá em **Configurações** → Aba **Gatilhos**
3. Clique em **"Novo Gatilho"** para criar um novo

## ✨ Modos de Criação

### Modo Visual (Recomendado) 🎨

O modo visual foi criado para facilitar a criação de gatilhos mesmo para quem não tem experiência técnica. Você pode:

- **Adicionar Condições**: Clique em "Adicionar Condição" e escolha:
  - **Campo**: O que você quer verificar (Prioridade, Status, Categoria, etc.)
  - **Valor**: O valor esperado (selecionado de uma lista ou digitado)

- **Adicionar Ações**: Clique em "Adicionar Ação" e escolha:
  - **Tipo**: O que você quer fazer (Adicionar Comentário, Atribuir, Mudar Status, etc.)
  - **Parâmetros**: Preencha os campos específicos para cada tipo de ação

**Exemplo Visual:**
1. Clique em "Novo Gatilho"
2. Dê um nome: "Auto-atribuir urgentes"
3. Escolha quando executar: "Ticket Criado"
4. Adicione uma condição:
   - Campo: "Prioridade"
   - É igual a: "Urgente"
5. Adicione uma ação:
   - Tipo: "Atribuir Para"
   - Usuário: Selecione da lista
6. Clique em "Criar Gatilho"

### Modo Avançado (JSON) 💻

Para usuários com mais experiência técnica, há também o modo avançado que permite editar o JSON diretamente. Clique em "Modo Avançado" para alternar.

## 🔧 Tipos de Gatilhos

| Tipo | Quando Executa |
|------|----------------|
| `ticket_created` | Quando um ticket é criado |
| `ticket_updated` | Quando um ticket é atualizado |
| `status_changed` | Quando o status do ticket muda |
| `priority_changed` | Quando a prioridade muda |
| `assigned` | Quando o ticket é atribuído |
| `comment_added` | Quando um comentário é adicionado |
| `time_based` | Baseado em tempo (futuro) |

---

## 💡 Exemplos Práticos com Modo Visual

### Exemplo 1: Auto-atribuir Tickets Urgentes

**Usando o Modo Visual:**
1. Nome: "Auto-atribuir tickets urgentes"
2. Quando executar: "Ticket Criado"
3. Condições:
   - Campo: "Prioridade" → É igual a → "Urgente"
4. Ações:
   - Tipo: "Atribuir Para" → Selecionar usuário gerente
   - Tipo: "Adicionar Comentário" → "Ticket urgente detectado e atribuído automaticamente"

### Exemplo 2: Escalar Tickets Parados

**Usando o Modo Visual:**
1. Nome: "Escalar tickets em aberto por muito tempo"
2. Quando executar: "Ticket Atualizado"
3. Condições:
   - Campo: "Status" → É igual a → "Aberto"
4. Ações:
   - Tipo: "Mudar Prioridade" → "Alta"
   - Tipo: "Adicionar Comentário" → "Este ticket está aberto há muito tempo e foi escalado"

### Exemplo 3: Notificar sobre Tickets VIP

**Usando o Modo Visual:**
1. Nome: "Notificar tickets de clientes VIP"
2. Quando executar: "Ticket Criado"
3. Condições:
   - Campo: "Categoria" → É igual a → "vip"
4. Ações:
   - Tipo: "Atribuir Para" → Gerente de contas
   - Tipo: "Mudar Prioridade" → "Alta"

---

## 📝 Referência Técnica (Modo Avançado)

Para usuários avançados que preferem editar JSON diretamente:

### Condições (JSON)

As condições definem **quando** o gatilho deve ser executado. São comparações simples de igualdade.

**Exemplos de Condições:**

**Tickets com prioridade urgente:**
```json
{
  "priority": "urgent"
}
```

**Tickets abertos sem responsável:**
```json
{
  "status": "open",
  "assigneeId": null
}
```

**Múltiplas condições:**
```json
{
  "priority": "high",
  "status": "open",
  "category": "support"
}
```

### Ações (JSON Array)

As ações definem **o que** o gatilho faz quando as condições são atendidas.

### Tipos de Ações Disponíveis:

#### 1. Adicionar Comentário
```json
{
  "type": "add_comment",
  "content": "Este é um comentário automático",
  "isInternal": false
}
```

**Parâmetros:**
- `content` (string): Texto do comentário
- `isInternal` (boolean): Se é visível apenas para agentes

---

#### 2. Atribuir Ticket
```json
{
  "type": "assign_to",
  "userId": 7
}
```

**Parâmetros:**
- `userId` (number): ID do usuário que receberá o ticket

---

#### 3. Mudar Prioridade
```json
{
  "type": "change_priority",
  "priority": "high"
}
```

**Parâmetros:**
- `priority` (string): `low`, `medium`, `high`, `critical`, `urgent`

---

#### 4. Mudar Status
```json
{
  "type": "change_status",
  "status": "in_progress"
}
```

**Parâmetros:**
- `status` (string): Nome do status configurado no sistema

---

#### 5. Adicionar Tag *(em desenvolvimento)*
```json
{
  "type": "add_tag",
  "tag": "vip"
}
```

---

#### 6. Enviar Email *(em desenvolvimento)*
```json
{
  "type": "send_email",
  "to": "gerente@empresa.com",
  "subject": "Ticket urgente",
  "body": "Um ticket urgente foi criado"
}
```

---

### Múltiplas Ações

Você pode executar várias ações em sequência:

```json
[
  {
    "type": "assign_to",
    "userId": 7
  },
  {
    "type": "change_priority",
    "priority": "high"
  },
  {
    "type": "add_comment",
    "content": "Ticket atribuído automaticamente ao gerente devido à prioridade alta.",
    "isInternal": true
  }
]
```

## 💡 Exemplos Práticos

### Exemplo 1: Auto-atribuir Tickets Urgentes

**Nome:** Auto-atribuir tickets urgentes  
**Tipo:** `ticket_created`  
**Condições:**
```json
{
  "priority": "urgent"
}
```
**Ações:**
```json
[
  {
    "type": "assign_to",
    "userId": 7
  },
  {
    "type": "add_comment",
    "content": "🚨 Ticket urgente detectado! Atribuído automaticamente ao gerente.",
    "isInternal": true
  }
]
```

---

### Exemplo 2: Escalar Tickets de Suporte

**Nome:** Escalar tickets de suporte não atribuídos  
**Tipo:** `ticket_updated`  
**Condições:**
```json
{
  "category": "support",
  "assigneeId": null,
  "status": "open"
}
```
**Ações:**
```json
[
  {
    "type": "change_priority",
    "priority": "high"
  },
  {
    "type": "add_comment",
    "content": "⚠️ Ticket de suporte escalado por falta de atribuição.",
    "isInternal": true
  }
]
```

---

### Exemplo 3: Notificar em Mudança de Status

**Nome:** Notificar quando ticket é resolvido  
**Tipo:** `status_changed`  
**Condições:**
```json
{
  "status": "resolved"
}
```
**Ações:**
```json
[
  {
    "type": "add_comment",
    "content": "✅ Este ticket foi marcado como resolvido. Se o problema persistir, reabra o ticket.",
    "isInternal": false
  }
]
```

---

### Exemplo 4: Adicionar Nota em Tickets Críticos

**Nome:** Adicionar aviso em tickets críticos  
**Tipo:** `priority_changed`  
**Condições:**
```json
{
  "priority": "critical"
}
```
**Ações:**
```json
[
  {
    "type": "add_comment",
    "content": "🔥 ATENÇÃO: Este ticket foi marcado como CRÍTICO! Requer ação imediata.",
    "isInternal": false
  },
  {
    "type": "assign_to",
    "userId": 7
  }
]
```

## 🎯 Boas Práticas

1. **Nomeie claramente:** Use nomes descritivos para seus gatilhos
2. **Documente:** Adicione uma descrição explicando o que o gatilho faz
3. **Teste antes de ativar:** Crie o gatilho inativo e teste manualmente
4. **Condições específicas:** Evite condições muito amplas que podem afetar muitos tickets
5. **Comentários internos:** Use `isInternal: true` para notas de auditoria
6. **IDs válidos:** Verifique se os `userId` existem no sistema
7. **Status corretos:** Use apenas nomes de status configurados no sistema

## ⚠️ Limitações Atuais

- **Gatilhos baseados em tempo** (`time_based`) ainda não estão implementados
- **Envio de emails** requer configuração adicional
- **Tags** ainda não têm suporte completo
- Condições são apenas comparações de igualdade (não suporta operadores como `>`, `<`, `!=`)
- Não é possível referenciar valores do ticket antigo nas ações

## 🔧 Desenvolvimento Futuro

- [ ] Suporte a condições avançadas (operadores lógicos, comparações)
- [ ] Gatilhos baseados em tempo (ex: "após 24h pendente")
- [ ] Integração completa com sistema de tags
- [ ] Agendamento de ações
- [ ] Logs de execução de gatilhos
- [ ] Interface visual para construir condições (sem JSON)
- [ ] Suporte a templates de mensagens
- [ ] Webhooks personalizados

## 📞 Suporte

Para dúvidas ou problemas, contate o administrador do sistema ou abra um ticket de suporte.
