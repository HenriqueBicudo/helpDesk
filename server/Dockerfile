FROM node:18-alpine

# Diretório de trabalho na raiz do projeto — build context será a raiz
WORKDIR /app

RUN apk add --no-cache git

# Copia package.json da raiz (contém dependências do backend)
COPY package*.json ./

# Instala dependências (inclui dev dependências necessárias em runtime, ex: vite)
RUN npm install

# Vite é necessário pelo módulo server/vite.ts (import estático). Instala explicitamente.
RUN npm install vite --silent

# Copia todo o projeto (server está em ./server)
COPY . ./

WORKDIR /app/server

EXPOSE 3001

ENV NODE_ENV=development

# Inicia o servidor com tsx
CMD ["npx", "tsx", "index.ts"]
