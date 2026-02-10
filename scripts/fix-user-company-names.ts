import { db } from "../server/db-postgres";
import { users, companies } from "@shared/drizzle-schema";
import { eq, isNotNull } from "drizzle-orm";

async function fixUserCompanyNames() {
  try {
    console.log("🔧 Corrigindo campo 'company' dos usuários...\n");
    
    // Buscar todos os usuários com campo company preenchido
    const allUsers = await db
      .select()
      .from(users)
      .where(isNotNull(users.company));
    
    console.log(`📋 Encontrados ${allUsers.length} usuários com campo 'company' preenchido\n`);
    
    let fixed = 0;
    let alreadyCorrect = 0;
    let notFound = 0;
    
    for (const user of allUsers) {
      if (!user.company) continue;
      
      // Verificar se o valor é um número (ID) ou nome
      const companyValue = user.company.trim();
      const isNumeric = /^\d+$/.test(companyValue);
      
      if (isNumeric) {
        // É um ID - buscar nome da empresa
        const companyId = parseInt(companyValue);
        const [company] = await db
          .select()
          .from(companies)
          .where(eq(companies.id, companyId));
        
        if (company) {
          // Atualizar com o nome
          await db
            .update(users)
            .set({ company: company.name })
            .where(eq(users.id, user.id));
          
          console.log(`✅ ${user.fullName} (${user.email})`);
          console.log(`   Alterado: "${companyValue}" → "${company.name}"\n`);
          fixed++;
        } else {
          console.log(`❌ ${user.fullName} (${user.email})`);
          console.log(`   ID de empresa "${companyValue}" não encontrado\n`);
          notFound++;
        }
      } else {
        // Já é um nome - verificar se existe
        const [company] = await db
          .select()
          .from(companies)
          .where(eq(companies.name, companyValue));
        
        if (company) {
          console.log(`✓ ${user.fullName} (${user.email})`);
          console.log(`   Já está correto: "${companyValue}"\n`);
          alreadyCorrect++;
        } else {
          console.log(`⚠️  ${user.fullName} (${user.email})`);
          console.log(`   Nome da empresa "${companyValue}" não encontrado no cadastro\n`);
          notFound++;
        }
      }
    }
    
    console.log("\n📊 Resumo:");
    console.log(`   ✅ Corrigidos: ${fixed}`);
    console.log(`   ✓ Já corretos: ${alreadyCorrect}`);
    console.log(`   ❌ Não encontrados: ${notFound}`);
    console.log(`   📋 Total processados: ${allUsers.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro:", error);
    process.exit(1);
  }
}

fixUserCompanyNames();
