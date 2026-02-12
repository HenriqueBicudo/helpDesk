import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as fs from "fs";
import * as path from "path";

// Carregar variáveis de ambiente
dotenv.config();

// Função para validar CNPJ
function validarCNPJ(cnpj: string): boolean {
  if (!cnpj) return false;
  
  // Remove caracteres não numéricos
  cnpj = cnpj.replace(/[^\d]/g, '');
  
  // Verifica se tem 14 dígitos
  if (cnpj.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  
  // Validação dos dígitos verificadores
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;
  
  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) return false;
  
  return true;
}

// Função para limpar telefone
function limparTelefone(telefone: string): string {
  if (!telefone) return '';
  return telefone.replace(/[^\d]/g, '').substring(0, 20);
}

// Função para normalizar email
function normalizarEmail(email: string): string {
  if (!email) return '';
  return email.toLowerCase().trim();
}

async function importarEmpresas() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL não configurada!');
    process.exit(1);
  }
  
  const sql = postgres(connectionString);
  
  try {
    console.log('🚀 Iniciando importação de empresas...\n');
    
    // Ler o arquivo CSV
    const csvPath = path.join(__dirname, '../imports/Pessoas_Limpo.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    
    // Remover cabeçalho
    lines.shift();
    
    let sucessos = 0;
    let erros = 0;
    let ignorados = 0;
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const campos = line.split(';');
      
      const nomeEmpresa = campos[0]?.trim();
      const emailEmpresa = normalizarEmail(campos[1]);
      const telefoneEmpresa = limparTelefone(campos[2]);
      const endereco = campos[3]?.trim();
      const cnpj = campos[4]?.trim();
      const nomeRepresentante = campos[5]?.trim();
      const emailRepresentante = normalizarEmail(campos[6]);
      const telefoneRepresentante = limparTelefone(campos[7]);
      
      // Validações básicas
      if (!nomeEmpresa || !emailRepresentante || !nomeRepresentante) {
        console.log(`⚠️  Ignorando linha com dados incompletos: ${nomeEmpresa || 'sem nome'}`);
        ignorados++;
        continue;
      }
      
      // Validar CNPJ se fornecido
      if (cnpj && !validarCNPJ(cnpj)) {
        console.log(`❌ CNPJ inválido para ${nomeEmpresa}: ${cnpj} - Ignorando...`);
        ignorados++;
        continue;
      }
      
      try {
        // Verificar se empresa já existe (por email ou CNPJ)
        const empresaExistente = await sql`
          SELECT * FROM companies 
          WHERE name = ${nomeEmpresa}
          ${cnpj ? sql`OR cnpj = ${cnpj}` : sql``}
          LIMIT 1
        `;
        
        let companyId: number;
        
        if (empresaExistente.length > 0) {
          console.log(`ℹ️  Empresa já existe: ${nomeEmpresa} (ID: ${empresaExistente[0].id})`);
          companyId = empresaExistente[0].id;
        } else {
          // Inserir empresa
          const [novaEmpresa] = await sql`
            INSERT INTO companies (name, email, phone, address, cnpj, has_active_contract, created_at, updated_at)
            VALUES (
              ${nomeEmpresa},
              ${emailEmpresa || emailRepresentante},
              ${telefoneEmpresa || telefoneRepresentante},
              ${endereco || null},
              ${cnpj || null},
              false,
              NOW(),
              NOW()
            )
            RETURNING *
          `;
          
          companyId = novaEmpresa.id;
          console.log(`✅ Empresa criada: ${nomeEmpresa} (ID: ${companyId})`);
        }
        
        // Verificar se representante já existe
        const usuarioExistente = await sql`
          SELECT * FROM users 
          WHERE email = ${emailRepresentante}
          LIMIT 1
        `;
        
        if (usuarioExistente.length > 0) {
          console.log(`   ℹ️  Usuário já existe: ${nomeRepresentante}`);
        } else {
          // Criar username a partir do email
          const username = emailRepresentante.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
          
          // Inserir usuário client_manager
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
              'client',
              ${nomeRepresentante},
              ${emailRepresentante},
              'client_manager',
              ${companyId.toString()},
              true,
              NOW(),
              NOW()
            )
          `;
          
          console.log(`   ✅ Usuário client_manager criado: ${nomeRepresentante} (${username})`);
        }
        
        sucessos++;
        
      } catch (error) {
        console.error(`❌ Erro ao processar ${nomeEmpresa}:`, error);
        erros++;
      }
    }
    
    console.log('\n📊 Resumo da importação:');
    console.log(`✅ Sucessos: ${sucessos}`);
    console.log(`❌ Erros: ${erros}`);
    console.log(`⚠️  Ignorados: ${ignorados}`);
    console.log(`📝 Total processado: ${sucessos + erros + ignorados}`);
    
    await sql.end();
    
  } catch (error) {
    console.error('❌ Erro fatal na importação:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Executar importação
importarEmpresas();
