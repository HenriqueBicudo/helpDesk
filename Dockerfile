# Use Node.js 18 como base
FROM node:18-alpine

# Define o diretório de trabalho
WORKDIR /app

# Instala dependências do sistema necessárias
RUN apk add --no-cache git

# Copia os arquivos de dependência
COPY package*.json ./
COPY client/package*.json ./client/

# Instala as dependências
RUN npm install

# Instala dependências do client
WORKDIR /app/client
RUN npm install

# Volta para o diretório raiz
WORKDIR /app

# Copia todo o código
COPY . .

# Não fazer build em desenvolvimento
# RUN npm run build

# Expõe a porta 5000
EXPOSE 5000

# Define as variáveis de ambiente padrão
ENV NODE_ENV=development
ENV PORT=5000

# Comando para iniciar a aplicação
CMD ["npm", "run", "dev"]
