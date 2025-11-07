# HelpDesk - Sistema de Gerenciamento de Chamados

Olá

Um sistema completo de gerenciamento de chamados (tickets) inspirado no Movidesk, com interface moderna e dashboard analítico.

![HelpDesk Screenshot](./screenshot.png)

## 🚀 Como Iniciar o HelpDesk

## 🚀 Como executar em desenvolvimento

Pré-requisitos:
- Node.js (>= 18 recomendado)
- PostgreSQL acessível (uma instância local ou de desenvolvimento)
- Variável de ambiente `DATABASE_URL` apontando para o banco (ex.: postgresql://user:pass@host:5432/dbname)
- (Opcional) `SESSION_SECRET` para sessões em desenvolvimento/produção

1) Instalar dependências (na raiz do projeto):

```powershell
npm install
```

2) Preparar o banco de dados:

- Se preferir resetar e popular com dados de exemplo (dev), use:

```powershell
# reset via SQL (destrutivo):
psql "${env:DATABASE_URL}" -f .\scripts\reset_db.sql

# ou (recomendado) usar o seed via Drizzle/TS para criar users com senha hasheada:
npx tsx .\scripts\seed.ts
```

Observação: as migrations Drizzle estão em `migrations/` e o schema fonte em `drizzle.config.ts` -> `shared/drizzle-schema.ts`. Use `drizzle-kit` para gerar/aplicar migrations quando precisar sincronizar o schema.

3) Iniciar aplicação (client + server):

```powershell
npm run dev
```

Isso inicia o backend e o frontend em modo de desenvolvimento. O frontend (Vite) normalmente abre em `http://localhost:5173` e o backend em `http://localhost:3000` (ou porta configurada).

## 📱 Funcionalidades Principais

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

## 📞 Suporte

Em caso de dúvidas ou problemas, por favor abra uma issue neste repositório ou entre em contato com o administrador do sistema.

---

Desenvolvido com ❤️ usando React, Express e TypeScript.