import fs from 'fs';
import path from 'path';

interface MovideskCompany {
  tipo: string;
  categoria: string;
  nomeEmpresa: string;
  razaoSocial: string;
  emailPrincipal: string;
  cnpj: string;
  telefoneEmpresa: string;
  codigoInterno: string;
  status: string;
  tipoContrato: string;
  emailContato: string;
  tipoEmailContato: string;
  telefoneContato: string;
  tipoTelefoneContato: string;
  numeroTelefoneContato: string;
  sla: string;
  contratoAtivo: string;
  observacoes: string;
}

interface CleanCompany {
  name: string;
  tradeName: string;
  cnpj: string;
  email: string;
  phone: string;
  hasActiveContract: boolean;
  observations: string;
}

interface CleanRequester {
  companyName: string;
  email: string;
  phone: string;
  fullName: string;
}

function parseCsvLine(line: string): string[] {
  return line.split(';').map(field => field.trim());
}

function cleanPhone(phone: string): string {
  // Remove caracteres especiais e mantém apenas números
  return phone.replace(/[^\d]/g, '');
}

function extractName(emailOrPhone: string): string {
  // Tenta extrair nome de emails ou comentários de telefone
  if (emailOrPhone.includes('@')) {
    const localPart = emailOrPhone.split('@')[0];
    return localPart
      .split(/[._-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }
  return '';
}

function processMovideskData(inputFile: string) {
  console.log('🔄 Processando arquivo Movidesk...\n');
  
  const content = fs.readFileSync(inputFile, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  const companies: CleanCompany[] = [];
  const requesters: CleanRequester[] = [];
  const errors: string[] = [];

  lines.forEach((line, index) => {
    try {
      const fields = parseCsvLine(line);
      
      // Índices dos campos relevantes (baseado na análise do CSV)
      const nomeEmpresa = fields[2]?.trim();
      const razaoSocial = fields[3]?.trim() || nomeEmpresa;
      const emailPrincipal = fields[4]?.trim();
      const cnpj = fields[5]?.trim();
      const telefoneEmpresa = fields[6]?.trim();
      const tipoContrato = fields[9]?.trim();
      const emailContato = fields[13]?.trim();
      const telefoneContato = fields[15]?.trim();
      const sla = fields[27]?.trim();
      const contratoAtivo = fields[35]?.trim(); // "Sim" ou "Não"
      const observacoes = fields[37]?.trim();
      
      if (!nomeEmpresa) {
        errors.push(`Linha ${index + 1}: Nome da empresa vazio`);
        return;
      }

      // Processar empresa
      const company: CleanCompany = {
        name: nomeEmpresa,
        tradeName: razaoSocial || nomeEmpresa,
        cnpj: cnpj || '',
        email: emailPrincipal || emailContato || '',
        phone: cleanPhone(telefoneEmpresa),
        hasActiveContract: contratoAtivo?.toLowerCase() === 'sim',
        observations: `${tipoContrato ? `Contrato: ${tipoContrato}` : ''}${sla ? ` | SLA: ${sla}` : ''}${observacoes ? ` | ${observacoes}` : ''}`.trim(),
      };

      companies.push(company);

      // Processar contato (requester) se houver email de contato
      if (emailContato && emailContato !== emailPrincipal) {
        const fullName = extractName(emailContato) || 'Contato Principal';
        
        const requester: CleanRequester = {
          companyName: nomeEmpresa,
          email: emailContato,
          phone: cleanPhone(telefoneContato),
          fullName: fullName,
        };

        requesters.push(requester);
      }
      
    } catch (error: any) {
      errors.push(`Linha ${index + 1}: ${error.message}`);
    }
  });

  console.log(`✅ Processadas ${companies.length} empresas`);
  console.log(`✅ Processados ${requesters.length} contatos\n`);

  if (errors.length > 0) {
    console.log(`⚠️  ${errors.length} erros encontrados:\n`);
    errors.slice(0, 10).forEach(err => console.log(`   ${err}`));
    if (errors.length > 10) {
      console.log(`   ... e mais ${errors.length - 10} erros`);
    }
    console.log('');
  }

  // Gerar arquivos CSV limpos
  const companiesCsv = [
    'name,tradeName,cnpj,email,phone,hasActiveContract,observations',
    ...companies.map(c => 
      `"${c.name}","${c.tradeName}","${c.cnpj}","${c.email}","${c.phone}",${c.hasActiveContract},"${c.observations}"`
    )
  ].join('\n');

  const requestersCsv = [
    'companyName,fullName,email,phone',
    ...requesters.map(r => 
      `"${r.companyName}","${r.fullName}","${r.email}","${r.phone}"`
    )
  ].join('\n');

  // Salvar arquivos
  const outputDir = path.join(process.cwd(), 'imports');
  fs.writeFileSync(path.join(outputDir, 'empresas_limpo.csv'), companiesCsv, 'utf-8');
  fs.writeFileSync(path.join(outputDir, 'contatos_limpo.csv'), requestersCsv, 'utf-8');

  console.log('📁 Arquivos gerados:');
  console.log('   ✓ imports/empresas_limpo.csv');
  console.log('   ✓ imports/contatos_limpo.csv\n');

  // Estatísticas
  const companiesWithContract = companies.filter(c => c.hasActiveContract).length;
  const companiesWithCNPJ = companies.filter(c => c.cnpj).length;
  const companiesWithEmail = companies.filter(c => c.email).length;

  console.log('📊 Estatísticas:');
  console.log(`   • Empresas com contrato ativo: ${companiesWithContract}/${companies.length}`);
  console.log(`   • Empresas com CNPJ: ${companiesWithCNPJ}/${companies.length}`);
  console.log(`   • Empresas com email: ${companiesWithEmail}/${companies.length}`);
  console.log(`   • Total de contatos: ${requesters.length}\n`);
}

// Executar
const inputFile = path.join(process.cwd(), 'imports', 'Empresas.csv');
processMovideskData(inputFile);
