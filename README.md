# HelpDesk - Sistema de Gerenciamento de Chamados

Um sistema completo de gerenciamento de chamados (tickets) inspirado no Movidesk, com interface moderna e dashboard analítico.

## 🚀 Como Iniciar o HelpDesk

### Pré-requisitos
- Node.js 18+ instalado
- PostgreSQL (ou configure para usar outro banco de dados)

### Instalação
1. Clone o repositório
2. Instale as dependências: `npm install`
3. Configure as variáveis de ambiente (copie `.env.example` para `.env`)
4. Execute as migrations: `npm run db:push`
5. Inicie o servidor: `npm run dev`

### Docker (Alternativa)
1. Use os arquivos na pasta `deploy/`:
   - `docker-compose.yml` para desenvolvimento
   - `Dockerfile` para produção
2. Execute: `docker-compose up`

## � Estrutura do Projeto

```
├── client/             # Frontend React + TypeScript
│   ├── src/
│   │   ├── components/ # Componentes de UI (shadcn/ui)
│   │   ├── hooks/      # Hooks personalizados
│   │   ├── lib/        # Utilitários e configurações
│   │   └── pages/      # Páginas da aplicação
│   └── package.json    # Dependências do cliente
├── server/             # Backend Express + TypeScript
│   ├── index.ts        # Ponto de entrada
│   ├── routes.ts       # Rotas da API REST
│   ├── auth.ts         # Autenticação e sessões
│   ├── storage/        # Camadas de armazenamento
│   └── db-*.ts         # Configurações de banco
├── shared/             # Schemas e tipos compartilhados
│   ├── schema.ts       # Schemas Zod
│   └── drizzle-schema.ts # Schema do banco (Drizzle)
├── migrations/         # Migrations do banco (Drizzle)
├── scripts/           # Scripts SQL e utilitários
├── deploy/            # Arquivos Docker e deploy
├── docs/              # Documentação técnica
└── uploads/           # Diretório de uploads
```

## 🛠️ Stack Tecnológica

### Frontend
- **React 18** com TypeScript
- **Tailwind CSS** + **shadcn/ui** para componentes
- **TanStack Query** para gerenciamento de estado
- **Wouter** para roteamento
- **Vite** como bundler

### Backend
- **Node.js** + **Express** com TypeScript
- **Drizzle ORM** para banco de dados
- **PostgreSQL** como banco principal
- **Passport.js** para autenticação
- **Multer** para upload de arquivos
- **Zod** para validação

### DevOps
- **Docker** + **Docker Compose**
- **ESBuild** para build de produção
- **Drizzle Kit** para migrations

## 📱 Funcionalidades

### 🎯 Sistema de Chamados
- ✅ Criação e gerenciamento de tickets
- ✅ Sistema de status (aberto, em andamento, resolvido, fechado)
- ✅ Prioridades e categorias
- ✅ Atribuição para agentes
- ✅ Timeline de interações
- ✅ Anexos de arquivos

### 👥 Gerenciamento de Usuários
- ✅ Agentes e solicitantes
- ✅ Diferentes níveis de permissão
- ✅ Autenticação com sessões

### 📊 Dashboard e Relatórios
- ✅ Métricas em tempo real
- ✅ Gráficos de volume e categorias
- ✅ Estatísticas de performance

### 🎨 Interface
- ✅ Design responsivo e moderno
- ✅ Tema claro/escuro
- ✅ Componentes acessíveis
- ✅ Visualização em Kanban

### ⚙️ Configurações
- ✅ Sistema de configurações completo
- ✅ Personalizações de tema
- ✅ Configurações de notificações
- ✅ Integrações (Slack, Discord, etc.)

## 🚧 Roadmap

- [ ] Base de conhecimento
- [ ] Relatórios avançados
- [ ] Notificações em tempo real (WebSocket)
- [ ] API pública
- [ ] Aplicativo móvel

## 📚 Documentação

Consulte a pasta `docs/` para documentação técnica detalhada:
- `KANBAN_DRAG_DROP.md` - Sistema de arrastar e soltar
- `THEME_SYSTEM.md` - Sistema de temas
- `DOCKER-README.md` - Configuração Docker

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---

Desenvolvido com ❤️ usando React, Express e TypeScript.