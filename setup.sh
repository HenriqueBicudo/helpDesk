#!/bin/bash

# 🌱 Script de Setup Rápido do HelpDesk
# Este script configura o projeto automaticamente em um novo ambiente

set -e  # Parar em caso de erro

echo "🚀 Iniciando setup do HelpDesk..."
echo ""

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Por favor, instale Node.js primeiro."
    exit 1
fi

echo "✅ Node.js $(node -v) encontrado"

# Verificar se PostgreSQL está acessível
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL não encontrado no PATH."
    echo "   Certifique-se de que o PostgreSQL está instalado e rodando."
fi

# Instalar dependências do servidor
echo ""
echo "📦 Instalando dependências do servidor..."
npm install

# Instalar dependências do client
echo ""
echo "📦 Instalando dependências do client..."
cd client
npm install
cd ..

# Verificar se .env existe
if [ ! -f .env ]; then
    echo ""
    echo "📝 Criando arquivo .env a partir do template..."
    cp .env.example .env
    echo "⚠️  ATENÇÃO: Edite o arquivo .env com suas configurações antes de continuar!"
    echo ""
    read -p "Pressione ENTER depois de configurar o .env (ou CTRL+C para cancelar)..."
fi

# Perguntar se deseja popular o banco
echo ""
read -p "🌱 Deseja popular o banco de dados com dados de exemplo? (s/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[SsYy]$ ]]; then
    echo ""
    echo "🗄️  Aplicando schema e populando banco..."
    npm run db:seed
    
    echo ""
    echo "✅ Banco de dados configurado com sucesso!"
    echo ""
    echo "🔐 Credenciais de acesso:"
    echo "   Admin:    admin / admin123"
    echo "   Manager:  manager / manager123"
    echo "   Agente:   agent1 / agent123"
    echo "   Cliente:  client1 / client123"
fi

echo ""
echo "✨ Setup concluído com sucesso!"
echo ""
echo "🚀 Para iniciar a aplicação, execute:"
echo "   npm run dev"
echo ""
echo "📚 Documentação disponível em:"
echo "   - QUICK_START.md - Comandos rápidos"
echo "   - SEED_README.md - Guia completo da seed"
echo "   - MIGRATION_GUIDE.md - Migração entre computadores"
echo ""
