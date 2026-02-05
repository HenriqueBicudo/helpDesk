# HelpDesk - Sistema de Gerenciamento de Chamados

Um sistema completo de gerenciamento de chamados (tickets) inspirado no Movidesk, com interface moderna e dashboard analítico.

![HelpDesk Screenshot](./screenshot.png)

## 🚀 Início Rápido

### Pré-requisitos
- Node.js (>= 18)
- PostgreSQL (>= 13)
- npm ou yarn

### Configuração em Novo Ambiente

```bash
# 1. Clone o repositório
git clone https://github.com/HenriqueBicudo/helpDesk.git
cd helpDesk

# 2. Instale as dependências
npm install
cd client && npm install && cd ..

# 3. Configure o ambiente
cp .env.example .env
# Edite o .env com suas credenciais do PostgreSQL

# 4. Crie e popule o banco de dados
npm run db:seed

# 5. Inicie a aplicação
npm run dev
```

Acesse em: http://localhost:5173

**Credenciais padrão:**
- Admin: `admin` / `admin123`
- Agente: `agent1` / `agent123`
- Cliente: `client1` / `client123`

📖 **[Guia Completo de Seed e Migração](./QUICK_START.md)**

## 🗄️ Scripts do Banco de Dados

| Comando | Descrição |
|---------|-----------|
| `npm run seed` | Popula o banco com dados de exemplo |
| `npm run db:push` | Aplica o schema ao banco |
| `npm run db:fresh` | Limpa e popula com dados novos |
| `npm run db:export` | Exporta dados atuais para backup |
| `npm run db:import <arquivo>` | Importa dados de backup |

## 🚀 Como executar em desenvolvimento

### Opção 1: Setup Automático (Recomendado)

```bash
npm run db:seed  # Cria tabelas e popula dados
npm run dev      # Inicia client + server
```

### Opção 2: Setup Manual

1. **Instalar dependências**
```bash
npm install
```

2. **Configurar banco de dados**
```bash
# Resetar banco (se necessário)
psql "${env:DATABASE_URL}" -f .\scripts\reset_db.sql

# Popular com dados
npx tsx .\scripts\seed.ts
```

3. **Iniciar aplicação**
```bash
npm run dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:5000

## � Documentação

- **[🚀 Guia de Início Rápido](./QUICK_START.md)** - Comandos essenciais e setup rápido
- **[📦 Documentação da Seed](./SEED_README.md)** - Guia completo do sistema de seed
- **[🔧 Detalhes de Implementação](./SEED_IMPLEMENTATION.md)** - Resumo técnico da implementação
- **[🖥️ Guia de Migração](./MIGRATION_GUIDE.md)** - Como migrar o projeto para outro computador
- **[📞 Google Meet Setup](./GOOGLE_MEET_SETUP.md)** - Configurar integração com Google Calendar

## �📱 Funcionalidades Principais

### Dashboard
- Visualização de métricas importantes:
  - Total de chamados
  - Chamados abertos
  - Chamados resolvidos hoje
  - Tempo médio de resposta
- Gráficos de distribuição por categoria
- Gráficos de volume de chamados ao longo do tempo

### Gerenciamento de Chamados
- Listagem completa de chamados com filtros
- Visualização detalhada de cada chamado
- Atualização de status dos chamados
- Atribuição de chamados para agentes
- Categorização e priorização de chamados

### Interface Responsiva
- Design moderno com Tailwind CSS e shadcn/ui
- Compatível com dispositivos móveis, tablets e desktop
- Navegação intuitiva e eficiente

## 💻 Estrutura do Projeto

```
├── client/             # Frontend React
│   ├── src/
│   │   ├── components/ # Componentes de UI
│   │   ├── hooks/      # Hooks personalizados
│   │   ├── lib/        # Utilitários
│   │   └── pages/      # Páginas da aplicação
└── server/             # Backend Express
    ├── index.ts        # Ponto de entrada
    ├── routes.ts       # Rotas da API
    └── storage.ts      # Camada de armazenamento
```

## 🛠️ Stack Tecnológica

- **Frontend:** React, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query
- **Backend:** Node.js, Express
- **Armazenamento:** Memória (pode ser expandido para banco de dados)
- **Ferramentas:** Vite, ESBuild, TypeScript

## 👥 Guia de Usuário

1. **Dashboard:** Página inicial com métricas e gráficos
2. **Chamados:** Visualize, filtre e gerencie todos os chamados
3. **Detalhes do Chamado:** Acesse informações completas e atualize o status
4. **Configurações:** (Em desenvolvimento) Personalize o sistema

## 🧩 Expandindo o Sistema

Para adicionar novas funcionalidades ao sistema:

1. **Novas Páginas:** Adicione arquivos em `client/src/pages/` e registre no roteador
2. **Componentes UI:** Explore os componentes disponíveis em `client/src/components/ui/`
3. **API:** Expanda as rotas em `server/routes.ts` e implemente novos métodos em `server/storage.ts`

## � Google Meet Integration

O sistema possui integração com Google Calendar para criar reuniões agendadas diretamente dos tickets!

### Como configurar:

1. Siga o guia completo em [GOOGLE_MEET_SETUP.md](./GOOGLE_MEET_SETUP.md)
2. Configure as variáveis de ambiente no arquivo `.env`:
   ```env
   GOOGLE_CLIENT_ID=seu_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=seu_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:5000/api/google/callback
   GOOGLE_REFRESH_TOKEN=seu_refresh_token
   ```
3. Reinicie o servidor

### Como usar:

1. Abra um ticket
2. Clique no botão **Google Meet** no cabeçalho
3. Preencha data, horário e duração
4. Clique em **Criar Reunião**
5. Pronto! Todos os participantes receberão convites por email 📧

**Participantes incluídos automaticamente:**
- Solicitante do ticket
- Agente responsável (se atribuído)
- Pessoas em cópia (CC)

## �📞 Suporte

Em caso de dúvidas ou problemas, por favor abra uma issue neste repositório ou entre em contato com o administrador do sistema.

---

Desenvolvido com ❤️ usando React, Express e TypeScript.