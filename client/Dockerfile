FROM node:18-alpine

WORKDIR /app/client

RUN apk add --no-cache git

# Copia apenas package.json para instalar dependências do client
COPY client/package*.json ./

RUN npm install

# Copia tsconfig raiz para resolver "extends" do tsconfig do client
COPY tsconfig.json ../tsconfig.json

# Copia os arquivos do client (conteúdo) para o diretório de trabalho
COPY client/ ./

EXPOSE 3000

ENV NODE_ENV=development

CMD ["npm", "run", "dev"]
