import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as fs from "fs";
import * as path from "path";

// Carregar variáveis de ambiente
dotenv.config();

// Conectar ao banco
const sql = postgres(process.env.DATABASE_URL || '', {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

async function importarUsuarios() {
  try {
    console.log('🚀 Iniciando importação de usuários...\n');

    // Ler arquivo CSV
    const csvPath = path.join(process.cwd(), 'imports', 'Clientes.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const linhas = csvContent.split('\n').slice(1); // Pular cabeçalho

    let sucessos = 0;
    let erros = 0;
    let ignorados = 0;

    for (const linha of linhas) {
      if (!linha.trim()) continue;

      try {
        // Parsear linha CSV (separado por ponto-e-vírgula)
        const campos = linha.split(';');
        
        if (campos.length < 3) {
          console.log(`⚠️  Linha inválida, pulando...`);
          ignorados++;
          continue;
        }

        const nomeCompleto = campos[0]?.trim();
        const email = campos[1]?.trim();
        const nomeEmpresa = campos[2]?.trim();

        if (!nomeCompleto || !email || !nomeEmpresa) {
          console.log(`⚠️  Dados incompletos, pulando: ${nomeCompleto || email || 'sem nome'}`);
          ignorados++;
          continue;
        }

        // Buscar empresa pelo nome
        const empresa = await sql`
          SELECT id FROM companies 
          WHERE LOWER(name) = LOWER(${nomeEmpresa})
          LIMIT 1
        `;

        if (empresa.length === 0) {
          console.log(`⚠️  Empresa não encontrada: ${nomeEmpresa} - Usuário: ${nomeCompleto}`);
          ignorados++;
          continue;
        }

        const companyId = empresa[0].id;

        // Verificar se usuário já existe
        const usuarioExistente = await sql`
          SELECT * FROM users 
          WHERE email = ${email}
          LIMIT 1
        `;

        if (usuarioExistente.length > 0) {
          console.log(`   ℹ️  Usuário já existe: ${nomeCompleto} (${email})`);
          continue;
        }

        // Criar username a partir do email (parte antes do @)
        let username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Se username for muito curto ou vazio, usar parte do nome
        if (username.length < 3) {
          username = nomeCompleto.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);
        }

        // Verificar se username já existe, se sim, adicionar sufixo numérico
        let tentativas = 0;
        let usernameOriginal = username;
        
        while (tentativas < 100) {
          const usernameCheck = await sql`
            SELECT id FROM users WHERE username = ${username} LIMIT 1
          `;
          
          if (usernameCheck.length === 0) {
            break; // Username disponível
          }
          
          tentativas++;
          username = `${usernameOriginal}${tentativas}`;
        }

        // Inserir usuário client_user
        await sql`
          INSERT INTO users (
            username,
            password,
            full_name,
            email,
            role,
            company,
            is_active,
            created_at,
            updated_at
          )
          VALUES (
            ${username},
            '123@MUDAR',
            ${nomeCompleto},
            ${email},
            'client_user',
            ${companyId.toString()},
            true,
            NOW(),
            NOW()
          )
        `;

        console.log(`✅ Usuário criado: ${nomeCompleto} (${username}) - Empresa: ${nomeEmpresa}`);
        sucessos++;

      } catch (error: any) {
        console.error(`❌ Erro ao processar usuário:`, error.message);
        erros++;
      }
    }

    console.log('\n📊 Resumo da importação:');
    console.log(`✅ Sucessos: ${sucessos}`);
    console.log(`❌ Erros: ${erros}`);
    console.log(`⚠️  Ignorados: ${ignorados}`);
    console.log(`📝 Total processado: ${linhas.length}`);

  } catch (error) {
    console.error('❌ Erro fatal:', error);
  } finally {
    await sql.end();
  }
}

importarUsuarios();
