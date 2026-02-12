#!/bin/bash

# Script para executar todas as migrações no banco Docker

echo "🔄 Executando migrações no banco Docker..."
echo ""

# Array com os números das migrações na ordem correta
migrations=(
  "0000"
  "0001"
  "0002_add_user_roles_and_company"
  "0002_add_has_active_contract"
  "0002_integrate_contracts_with_tickets"
  "0003_update_existing_roles"
  "0003"
  "0004"
  "0005"
  "0006_add_company_id_to_tickets"
  "0006"
  "0007"
  "0008_fix_contracts_schema"
  "0008_fix_sla_rules_contract_id_type"
  "0009_create_sla_templates"
  "0009"
  "0010"
  "0011_align_sla_templates_with_drizzle_v2"
  "0011"
  "0012_add_ticket_requesters_cc"
  "0012_fix_sla_v2_schema"
  "0013"
  "0014"
  "0015"
  "0016"
  "0017"
  "0018"
  "0019"
  "0020"
  "0021"
  "0022"
  "0023"
  "0024"
  "0025"
  "0026"
  "0027"
)

echo "📋 Total de migrações: ${#migrations[@]}"
echo ""

# Executar cada migração
for migration in "${migrations[@]}"; do
  echo "▶️  Executando migração: $migration"
  docker exec helpdesk-backend-1 npx tsx /app/scripts/run-migration.ts "$migration" 2>&1 | grep -v "injecting env"
  
  if [ $? -eq 0 ]; then
    echo "   ✅ Concluída"
  else
    echo "   ⚠️  Pode ter falhado ou já existe"
  fi
  echo ""
done

echo "✅ Processo de migração concluído!"
echo ""
echo "🔍 Verificando banco de dados..."
docker exec helpdesk-db-1 psql -U helpdesk_user -d helpdesk -c "\dt" | head -30

echo ""
echo "📊 Contagem de registros:"
docker exec helpdesk-db-1 psql -U helpdesk_user -d helpdesk -c "SELECT COUNT(*) as total_tickets FROM tickets;"
docker exec helpdesk-db-1 psql -U helpdesk_user -d helpdesk -c "SELECT COUNT(*) as total_users FROM users;"
