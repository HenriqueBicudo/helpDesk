# 📚 Documentação das APIs - Help Desk System

> Sistema de Help Desk com SLA automático e gestão de tickets

**Base URL:** `/api`  
**Autenticação:** A maioria dos endpoints requer autenticação via sessão (cookie-based)

---

## 📋 Índice

- [Autenticação](#autenticação)
- [Health Check](#health-check)
- [Usuários](#usuários)
- [Solicitantes](#solicitantes)
- [Times](#times)
- [Tickets](#tickets)
- [Interações de Tickets](#interações-de-tickets)
- [Tags](#tags)
- [Links de Tickets](#links-de-tickets)
- [Estatísticas](#estatísticas)
- [Templates de Email](#templates-de-email)
- [Templates de Resposta](#templates-de-resposta)
- [Configurações do Sistema](#configurações-do-sistema)
- [Contratos](#contratos)
- [SLA (Service Level Agreement)](#sla-service-level-agreement)
- [Base de Conhecimento](#base-de-conhecimento)
- [Uploads](#uploads)

---

## 🔐 Autenticação

### Login
```http
POST /api/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}
```

**Resposta:**
```json
{
  "id": 1,
  "username": "admin",
  "role": "admin",
  "company": "TechCorp"
}
```

### Logout
```http
POST /api/logout
```

### Obter Usuário Atual
```http
GET /api/user
```

### Registrar Novo Usuário
```http
POST /api/register
Content-Type: application/json

{
  "username": "string",
  "password": "string",
  "role": "string",
  "company": "string"
}
```

---

## ❤️ Health Check

### Status do Sistema
```http
GET /api/health
```

**Resposta:**
```json
{
  "status": "OK",
  "timestamp": "2025-12-18T10:00:00.000Z"
}
```

---

## 👥 Usuários

### Listar Usuários
```http
GET /api/users
Authorization: Required
```

**Permissões:**
- Admin/Helpdesk Manager: Veem todos os usuários
- Client Manager: Vê usuários da própria empresa + agentes helpdesk
- Client User: Vê apenas agentes/managers helpdesk

### Criar Usuário
```http
POST /api/users
Authorization: Required
Permission: users:create
Content-Type: application/json

{
  "username": "string",
  "password": "string",
  "role": "admin | helpdesk_manager | helpdesk_agent | client_manager | client_user",
  "company": "string",
  "email": "string",
  "teamId": number
}
```

### Atualizar Usuário
```http
PUT /api/users/:id
Authorization: Required
Permission: users:edit
Content-Type: application/json

{
  "username": "string",
  "role": "string",
  "company": "string",
  "email": "string",
  "teamId": number,
  "isActive": boolean
}
```

### Listar Colegas da Empresa
```http
GET /api/users/company-colleagues
Authorization: Required
```

**Descrição:** Retorna usuários da mesma empresa do usuário logado

---

## 📧 Solicitantes

### Listar Solicitantes
```http
GET /api/requesters
```

### Criar Solicitante
```http
POST /api/requesters
Content-Type: application/json

{
  "name": "string",
  "email": "string",
  "phone": "string",
  "company": "string"
}
```

### Contratos do Solicitante
```http
GET /api/requesters/:requesterId/contracts
```

---

## 👨‍💼 Times

### Listar Times
```http
GET /api/teams
```

**Resposta:**
```json
[
  {
    "id": 1,
    "name": "Suporte Técnico",
    "description": "Time de suporte técnico"
  }
]
```

### Detalhes do Time
```http
GET /api/teams/:teamId/details
Authorization: Required
```

**Resposta:**
```json
{
  "id": 1,
  "name": "Suporte Técnico",
  "description": "Time de suporte técnico",
  "members": [
    {
      "id": 1,
      "username": "agent1",
      "role": "helpdesk_agent"
    }
  ]
}
```

### Estatísticas do Time
```http
GET /api/teams/:teamId/stats
Authorization: Required
```

**Parâmetros de Query:**
- `period`: `day | week | month | year`

**Resposta:**
```json
{
  "totalTickets": 150,
  "openTickets": 20,
  "resolvedTickets": 130,
  "avgResolutionTime": 7200000,
  "slaCompliance": 95.5
}
```

---

## 🎫 Tickets

### Listar Tickets
```http
GET /api/tickets
Authorization: Required
```

**Parâmetros de Query:**
- `status`: `open | in_progress | pending_customer | resolved | closed`
- `priority`: `low | medium | high | urgent`
- `assignedTo`: ID do usuário
- `company`: Nome da empresa
- `search`: Busca em título e descrição

**Resposta:**
```json
[
  {
    "id": 1,
    "title": "Problema com login",
    "description": "Não consigo fazer login",
    "status": "open",
    "priority": "high",
    "createdAt": "2025-12-18T10:00:00.000Z",
    "assignedTo": 2,
    "company": "TechCorp",
    "category": "Acesso"
  }
]
```

### Meus Tickets
```http
GET /api/tickets/my-tickets
Authorization: Required
```

**Descrição:** Retorna tickets criados pelo usuário logado ou atribuídos a ele

### Obter Ticket por ID
```http
GET /api/tickets/:id
Authorization: Required
```

### Criar Ticket
```http
POST /api/tickets
Authorization: Required
Permission: tickets:create
Content-Type: application/json

{
  "title": "string",
  "description": "string",
  "priority": "low | medium | high | urgent",
  "category": "string",
  "requesterId": number,
  "company": "string",
  "contractId": number
}
```

### Atualizar Ticket
```http
PATCH /api/tickets/:id
Authorization: Required
Content-Type: application/json

{
  "title": "string",
  "description": "string",
  "priority": "low | medium | high | urgent",
  "status": "open | in_progress | pending_customer | resolved | closed",
  "category": "string"
}
```

### Atribuir Ticket
```http
POST /api/tickets/:id/assign
Authorization: Required
Content-Type: application/json

{
  "assignedTo": number,
  "teamId": number
}
```

### Alterar Status do Ticket
```http
POST /api/tickets/:id/status
Authorization: Required
Content-Type: application/json

{
  "status": "open | in_progress | pending_customer | resolved | closed",
  "comment": "string (opcional)"
}
```

### Contratos do Ticket
```http
GET /api/tickets/:id/contracts
```

**Descrição:** Retorna contratos disponíveis baseado no solicitante do ticket

---

## 💬 Interações de Tickets

### Listar Interações
```http
GET /api/tickets/:id/interactions
```

**Resposta:**
```json
[
  {
    "id": 1,
    "ticketId": 1,
    "userId": 2,
    "message": "Verificando o problema...",
    "isInternal": false,
    "createdAt": "2025-12-18T10:30:00.000Z",
    "attachments": []
  }
]
```

### Criar Interação
```http
POST /api/tickets/:id/interactions
Authorization: Required
Content-Type: multipart/form-data

message: string
isInternal: boolean
attachments: File[] (max 5 arquivos)
```

**Tipos de arquivo permitidos:**
- Imagens: jpeg, png, gif, webp
- Documentos: pdf, doc, docx, xls, xlsx
- Texto: txt, csv

**Tamanho máximo:** 10MB por arquivo

---

## 🏷️ Tags

### Listar Tags
```http
GET /api/tags
```

### Criar Tag
```http
POST /api/tags
Content-Type: application/json

{
  "name": "string",
  "color": "string"
}
```

### Atualizar Tag
```http
PUT /api/tags/:id
Content-Type: application/json

{
  "name": "string",
  "color": "string"
}
```

### Excluir Tag
```http
DELETE /api/tags/:id
```

### Tags do Ticket
```http
GET /api/tickets/:id/tags
```

### Adicionar Tag ao Ticket
```http
POST /api/tickets/:id/tags
Content-Type: application/json

{
  "tagId": number
}
```

### Remover Tag do Ticket
```http
DELETE /api/tickets/:id/tags/:tagId
```

---

## 🔗 Links de Tickets

### Listar Links do Ticket
```http
GET /api/tickets/:id/links
```

**Resposta:**
```json
[
  {
    "id": 1,
    "sourceTicketId": 1,
    "targetTicketId": 2,
    "linkType": "relates_to | duplicates | blocks | is_blocked_by",
    "createdAt": "2025-12-18T10:00:00.000Z"
  }
]
```

### Criar Link entre Tickets
```http
POST /api/tickets/:id/links
Content-Type: application/json

{
  "targetTicketId": number,
  "linkType": "relates_to | duplicates | blocks | is_blocked_by"
}
```

### Remover Link
```http
DELETE /api/tickets/:id/links/:linkId
```

---

## 📊 Estatísticas

### Estatísticas Gerais
```http
GET /api/statistics
Authorization: Required
```

**Parâmetros de Query:**
- `period`: `day | week | month | year`
- `startDate`: ISO Date String
- `endDate`: ISO Date String

**Resposta:**
```json
{
  "totalTickets": 500,
  "openTickets": 50,
  "inProgressTickets": 30,
  "resolvedTickets": 420,
  "avgResolutionTime": 7200000,
  "slaCompliance": 95.5,
  "ticketsByPriority": {
    "low": 100,
    "medium": 250,
    "high": 100,
    "urgent": 50
  }
}
```

### Estatísticas por Categoria
```http
GET /api/statistics/categories
Authorization: Required
```

**Parâmetros de Query:**
- `period`: `day | week | month | year`

**Resposta:**
```json
[
  {
    "category": "Suporte Técnico",
    "count": 150,
    "percentage": 30.0
  }
]
```

### Volume de Tickets
```http
GET /api/statistics/volume
Authorization: Required
```

**Parâmetros de Query:**
- `period`: `day | week | month | year`

**Resposta:**
```json
{
  "labels": ["2025-12-11", "2025-12-12", "2025-12-13"],
  "data": [10, 15, 12]
}
```

---

## 📧 Templates de Email

### Listar Templates
```http
GET /api/email-templates
```

**Parâmetros de Query:**
- `type`: `ticket_created | ticket_updated | ticket_assigned | ticket_resolved | sla_warning`

### Obter Template por ID
```http
GET /api/email-templates/:id
```

### Criar Template
```http
POST /api/email-templates
Content-Type: application/json

{
  "name": "string",
  "type": "ticket_created | ticket_updated | ticket_assigned | ticket_resolved | sla_warning",
  "subject": "string",
  "body": "string",
  "isActive": boolean
}
```

**Variáveis disponíveis:**
- `{{ticketId}}`, `{{ticketTitle}}`, `{{ticketDescription}}`
- `{{ticketPriority}}`, `{{ticketStatus}}`, `{{ticketCategory}}`
- `{{assignedToName}}`, `{{requesterName}}`, `{{requesterEmail}}`
- `{{companyName}}`, `{{createdAt}}`, `{{updatedAt}}`

### Atualizar Template
```http
PATCH /api/email-templates/:id
Content-Type: application/json

{
  "name": "string",
  "subject": "string",
  "body": "string",
  "isActive": boolean
}
```

### Excluir Template
```http
DELETE /api/email-templates/:id
```

### Testar Envio de Email
```http
POST /api/test-email
Content-Type: application/json

{
  "to": "email@example.com",
  "subject": "string",
  "body": "string"
}
```

---

## 💾 Templates de Resposta

### Listar Templates de Resposta
```http
GET /api/response-templates
```

**Parâmetros de Query:**
- `category`: Filtrar por categoria

### Obter Template por ID
```http
GET /api/response-templates/:id
```

### Processar Template com Dados do Ticket
```http
POST /api/response-templates/:id/process
Content-Type: application/json

{
  "ticketId": number
}
```

**Descrição:** Substitui variáveis do template com dados reais do ticket

### Criar Template de Resposta
```http
POST /api/response-templates
Content-Type: application/json

{
  "title": "string",
  "content": "string",
  "category": "string",
  "isActive": boolean
}
```

### Atualizar Template de Resposta
```http
PATCH /api/response-templates/:id
Content-Type: application/json

{
  "title": "string",
  "content": "string",
  "category": "string",
  "isActive": boolean
}
```

### Excluir Template de Resposta
```http
DELETE /api/response-templates/:id
```

---

## ⚙️ Configurações do Sistema

### Listar Todas as Configurações
```http
GET /api/settings
Authorization: Required
Permission: settings:view
```

**Resposta:**
```json
[
  {
    "id": 1,
    "key": "company_name",
    "value": "TechCorp",
    "description": "Nome da empresa",
    "category": "general"
  }
]
```

### Obter Configuração por Chave
```http
GET /api/settings/:key
Authorization: Required
Permission: settings:view
```

### Criar Configuração
```http
POST /api/settings
Authorization: Required
Permission: settings:manage
Content-Type: application/json

{
  "key": "string",
  "value": "string",
  "description": "string",
  "category": "general | email | sla | notifications"
}
```

### Atualizar Configuração
```http
PUT /api/settings/:key
Authorization: Required
Permission: settings:manage
Content-Type: application/json

{
  "value": "string",
  "description": "string"
}
```

### Excluir Configuração
```http
DELETE /api/settings/:key
Authorization: Required
Permission: settings:manage
```

---

## 📄 Contratos

### Listar Contratos
```http
GET /api/contracts
Authorization: Required
```

**Permissões:**
- Admin/Helpdesk: Veem todos os contratos
- Client Manager: Vê apenas contratos da própria empresa

**Resposta:**
```json
[
  {
    "id": 1,
    "name": "Contrato Premium",
    "companyId": 1,
    "companyName": "TechCorp",
    "startDate": "2025-01-01",
    "endDate": "2025-12-31",
    "isActive": true,
    "slaTemplateId": 1
  }
]
```

### Criar Contrato
```http
POST /api/contracts
Authorization: Required
Permission: companies:manage
Content-Type: application/json

{
  "name": "string",
  "companyId": number,
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "isActive": boolean,
  "slaTemplateId": number
}
```

### Atualizar Contrato
```http
PUT /api/contracts/:id
Authorization: Required
Permission: companies:manage
Content-Type: application/json

{
  "name": "string",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "isActive": boolean,
  "slaTemplateId": number
}
```

### Excluir Contrato
```http
DELETE /api/contracts/:id
Authorization: Required
Permission: companies:manage
```

---

## 📋 SLA (Service Level Agreement)

### Estatísticas de SLA
```http
GET /api/sla/stats
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "totalTickets": 100,
    "withinSla": 85,
    "breachedSla": 10,
    "atRisk": 5,
    "complianceRate": 85.0,
    "timestamp": "2025-12-18T10:00:00.000Z"
  }
}
```

### Status do Monitor de SLA
```http
GET /api/sla/monitor/status
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "isRunning": true,
    "schedule": "*/5 * * * *",
    "lastRun": "2025-12-18T09:55:00.000Z",
    "nextRun": "2025-12-18T10:00:00.000Z"
  }
}
```

### Controlar Monitor de SLA
```http
POST /api/sla/monitor/control
Content-Type: application/json

{
  "action": "start | stop | restart"
}
```

### Templates de SLA

#### Listar Templates
```http
GET /api/sla/templates
```

#### Criar Template
```http
POST /api/sla/templates
Content-Type: application/json

{
  "name": "string",
  "description": "string",
  "rules": [
    {
      "priority": "low | medium | high | urgent",
      "responseTime": number,
      "resolutionTime": number
    }
  ]
}
```

### SLA V2 (Nova Arquitetura)

#### Calcular SLA para Ticket
```http
POST /api/sla/v2/calculate
Content-Type: application/json

{
  "ticketId": number
}
```

#### Verificar Status de SLA
```http
GET /api/sla/v2/status/:ticketId
```

---

## 📚 Base de Conhecimento

### Listar Artigos
```http
GET /api/knowledge
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Como resetar senha",
      "content": "Passo a passo...",
      "category": "Acesso",
      "tags": ["senha", "login"],
      "author": "Admin",
      "views": 150,
      "createdAt": "2025-12-18T10:00:00.000Z",
      "updatedAt": "2025-12-18T10:00:00.000Z"
    }
  ]
}
```

### Criar Artigo
```http
POST /api/knowledge
Content-Type: application/json

{
  "title": "string",
  "content": "string",
  "category": "string",
  "tags": ["string"],
  "author": "string"
}
```

### Atualizar Artigo
```http
PUT /api/knowledge/:id
Content-Type: application/json

{
  "title": "string",
  "content": "string",
  "category": "string",
  "tags": ["string"]
}
```

### Excluir Artigo
```http
DELETE /api/knowledge/:id
```

### Incrementar Visualizações
```http
POST /api/knowledge/:id/view
```

---

## 📤 Uploads

### Upload de Arquivos
```http
POST /api/uploads
Content-Type: multipart/form-data

files: File[] (max 20 arquivos)
```

**Tamanho máximo:** 10MB por arquivo

**Tipos de arquivo permitidos:**
- Imagens: jpeg, png, gif, webp
- Documentos: pdf, doc, docx, xls, xlsx
- Texto: txt, csv

**Resposta:**
```json
{
  "files": [
    {
      "filename": "file-123456789.pdf",
      "originalName": "documento.pdf",
      "path": "/api/uploads/file-123456789.pdf",
      "size": 102400
    }
  ]
}
```

### Acessar Arquivo
```http
GET /api/uploads/:filename
```

**Descrição:** Serve arquivos estáticos do diretório de uploads

---

## 🏢 Empresas

### Listar Empresas
```http
GET /api/companies
Authorization: Required
```

**Resposta:**
```json
[
  {
    "id": 1,
    "name": "TechCorp",
    "description": "Empresa de tecnologia"
  }
]
```

---

## 🔒 Permissões e Roles

### Roles Disponíveis
- `admin` - Acesso total ao sistema
- `helpdesk_manager` - Gerente de helpdesk
- `helpdesk_agent` - Agente de suporte
- `client_manager` - Gerente do cliente
- `client_user` - Usuário cliente

### Principais Permissões
- `users:create` - Criar usuários
- `users:edit` - Editar usuários
- `tickets:create` - Criar tickets
- `tickets:edit` - Editar tickets
- `companies:manage` - Gerenciar empresas e contratos
- `settings:view` - Visualizar configurações
- `settings:manage` - Gerenciar configurações

---

## 🚀 Exemplos de Uso

### Exemplo: Criar e Atribuir um Ticket

```javascript
// 1. Login
const loginResponse = await fetch('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'agent1',
    password: 'password123'
  })
});

// 2. Criar ticket
const ticketResponse = await fetch('/api/tickets', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Problema com impressora',
    description: 'A impressora não está funcionando',
    priority: 'medium',
    category: 'Hardware',
    requesterId: 1,
    company: 'TechCorp'
  })
});

const ticket = await ticketResponse.json();

// 3. Atribuir ticket
await fetch(`/api/tickets/${ticket.id}/assign`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    assignedTo: 2,
    teamId: 1
  })
});

// 4. Adicionar interação
const formData = new FormData();
formData.append('message', 'Verificando o problema...');
formData.append('isInternal', 'false');

await fetch(`/api/tickets/${ticket.id}/interactions`, {
  method: 'POST',
  body: formData
});
```

---

## 📝 Notas

### Formatos de Data
- Todas as datas são retornadas em formato ISO 8601: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Timestamps são em UTC

### Paginação
- Atualmente a API não possui paginação implementada
- Todos os endpoints retornam a lista completa de resultados

### Rate Limiting
- Não há rate limiting implementado atualmente

### Versionamento
- API principal: `/api`
- SLA V2: `/api/sla/v2` (nova arquitetura)

---

## 🐛 Tratamento de Erros

### Códigos de Status HTTP

- `200` - Sucesso
- `201` - Criado com sucesso
- `400` - Requisição inválida
- `401` - Não autenticado
- `403` - Acesso negado
- `404` - Não encontrado
- `500` - Erro interno do servidor

### Formato de Erro

```json
{
  "success": false,
  "message": "Descrição do erro",
  "error": "Detalhes técnicos (opcional)",
  "errors": [] // Erros de validação Zod
}
```

---

## 📞 Suporte

Para dúvidas ou problemas com a API, entre em contato com a equipe de desenvolvimento.

**Última atualização:** 18 de dezembro de 2025
