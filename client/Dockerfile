FROM node:18-alpine

# Diretório de trabalho na raiz do projeto
WORKDIR /app

RUN apk add --no-cache git

# Copia package.json da raiz (caso necessário para dependências compartilhadas)
COPY package*.json ./

# Copia package.json do client
COPY client/package*.json ./client/

# Copia tsconfig raiz
COPY tsconfig.json ./

# Copia a pasta shared (necessária para imports @shared)
COPY shared/ ./shared/

# Instala dependências do client
WORKDIR /app/client
RUN npm install

# Copia os arquivos do client
COPY client/ ./

EXPOSE 3000

ENV NODE_ENV=development

CMD ["npm", "run", "dev"]
