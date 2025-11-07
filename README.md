# HelpDesk - Sistema de Gerenciamento de Chamados

Olá

Um sistema completo de gerenciamento de chamados (tickets) inspirado no Movidesk, com interface moderna e dashboard analítico.

![HelpDesk Screenshot](./screenshot.png)

## 🚀 Como Iniciar o HelpDesk

### Método 1: Usando o Botão "Run" do Replit
1. No ambiente Replit, simplesmente clique no botão **Run** na parte superior
2. O sistema iniciará automaticamente o fluxo de trabalho "Start application"
3. Aguarde até que o servidor e o cliente estejam completamente carregados
4. O sistema estará disponível no navegador integrado do Replit

### Método 2: Via Terminal
1. Abra o terminal no ambiente Replit
2. Execute o comando: `npm run dev`
3. Aguarde até que o servidor e o cliente estejam completamente carregados
4. O sistema estará disponível no navegador integrado do Replit

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