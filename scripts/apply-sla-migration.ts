import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carregar variáveis de ambiente
dotenv.config();

/**
 * Script para aplicar migration de correção do tipo contract_id em sla_rules
 * De INTEGER para VARCHAR(255) para compatibilizar com contracts.id
 */
async function applySLAMigration() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL não configurada!');
    console.log('Configure a variável de ambiente DATABASE_URL no arquivo .env');
    process.exit(1);
  }

  console.log('🔌 Conectando ao banco de dados...');
  const sql = postgres(connectionString);

  try {
    console.log('\n📋 Iniciando migration: Corrigir tipo de contract_id em sla_rules\n');

    // Passo 1: Verificar estado atual
    console.log('🔍 Verificando estado atual da tabela sla_rules...');
    const currentSchema = await sql`
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'sla_rules' 
        AND column_name = 'contract_id'
    `;

    if (currentSchema.length === 0) {
      console.log('⚠️  Coluna contract_id não existe em sla_rules');
      console.log('Verifique se a tabela sla_rules existe no banco de dados');
      await sql.end();
      return;
    }

    const currentType = currentSchema[0].data_type;
    console.log(`   Tipo atual: ${currentType}`);
    
    if (currentType === 'character varying' || currentType === 'varchar') {
      console.log('✅ Coluna contract_id já é VARCHAR! Migration não necessária.');
      await sql.end();
      return;
    }

    // Passo 2: Verificar se há dados na tabela
    console.log('\n🔍 Verificando registros existentes...');
    const existingRecords = await sql`
      SELECT COUNT(*) as count FROM sla_rules
    `;
    const recordCount = parseInt(existingRecords[0].count);
    console.log(`   Registros encontrados: ${recordCount}`);

    if (recordCount > 0) {
      console.log('\n⚠️  ATENÇÃO: Há registros existentes na tabela!');
      console.log('   A migration irá tentar converter os dados.');
      console.log('   Recomenda-se fazer backup antes de prosseguir.\n');
    }

    // Passo 3: Dropar constraint de foreign key (se existir)
    console.log('🔧 Passo 1/3: Removendo constraint de foreign key...');
    try {
      await sql`
        ALTER TABLE sla_rules 
        DROP CONSTRAINT IF EXISTS sla_rules_contract_id_contracts_id_fk
      `;
      console.log('   ✅ Constraint removida (ou não existia)');
    } catch (error) {
      console.log('   ⚠️  Erro ao remover constraint:', error);
    }

    // Passo 4: Alterar tipo da coluna
    console.log('\n🔧 Passo 2/3: Alterando tipo da coluna de INTEGER para VARCHAR(255)...');
    try {
      await sql`
        ALTER TABLE sla_rules 
        ALTER COLUMN contract_id TYPE VARCHAR(255) USING contract_id::TEXT
      `;
      console.log('   ✅ Tipo da coluna alterado com sucesso');
    } catch (error) {
      console.error('   ❌ Erro ao alterar tipo da coluna:', error);
      throw error;
    }

    // Passo 5: Recriar foreign key constraint
    console.log('\n🔧 Passo 3/3: Recriando constraint de foreign key...');
    try {
      await sql`
        ALTER TABLE sla_rules 
        ADD CONSTRAINT sla_rules_contract_id_contracts_id_fk 
          FOREIGN KEY (contract_id) 
          REFERENCES contracts(id) 
          ON DELETE CASCADE
      `;
      console.log('   ✅ Foreign key constraint recriada');
    } catch (error) {
      console.error('   ❌ Erro ao criar constraint:', error);
      console.log('   Verifique se a tabela contracts existe e tem a coluna id como VARCHAR');
      throw error;
    }

    // Passo 6: Verificar resultado
    console.log('\n🔍 Verificando resultado final...');
    const finalSchema = await sql`
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'sla_rules' 
        AND column_name = 'contract_id'
    `;

    console.log('   Tipo final:', finalSchema[0].data_type);
    console.log('   Tamanho:', finalSchema[0].character_maximum_length);
    console.log('   Nullable:', finalSchema[0].is_nullable);

    // Verificar constraints
    const constraints = await sql`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.table_name = 'sla_rules'
        AND kcu.column_name = 'contract_id'
    `;

    console.log('\n📋 Constraints aplicadas:');
    constraints.forEach(c => {
      console.log(`   - ${c.constraint_name} (${c.constraint_type})`);
      if (c.foreign_table_name) {
        console.log(`     → Referencia ${c.foreign_table_name}.${c.foreign_column_name}`);
      }
    });

    console.log('\n✅ Migration aplicada com sucesso!');
    console.log('\n📝 Resumo:');
    console.log('   • Tipo alterado: INTEGER → VARCHAR(255)');
    console.log('   • Foreign key recriada com ON DELETE CASCADE');
    console.log('   • Tabela sla_rules pronta para uso\n');

  } catch (error) {
    console.error('\n❌ Erro durante a migration:', error);
    process.exit(1);
  } finally {
    await sql.end();
    console.log('🔌 Conexão fechada.');
  }
}

// Executar migration
applySLAMigration()
  .then(() => {
    console.log('\n🎉 Processo concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Erro fatal:', error);
    process.exit(1);
  });
