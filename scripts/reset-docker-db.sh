#!/bin/bash

echo "🗑️  Limpando completamente o banco Docker..."
echo ""

# Parar containers
echo "⏹️  Parando containers..."
docker compose down

# Remover volume do banco
echo "🗑️  Removendo volume do banco..."
docker volume rm helpdesk_postgres_data 2>/dev/null || true

# Subir novamente
echo "🚀 Iniciando containers..."
docker compose up -d

echo ""
echo "⏳ Aguardando banco inicializar..."
sleep 15

echo ""
echo "✅ Banco limpo e pronto para migrações!"
