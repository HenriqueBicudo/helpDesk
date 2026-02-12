import { db } from "../server/db-postgres";
import { users, companies } from "@shared/drizzle-schema";
import { eq } from "drizzle-orm";

async function checkUserCompany() {
  try {
    const email = process.argv[2];
    
    if (!email) {
      console.log("❌ Uso: npx tsx scripts/check-user-company.ts <email>");
      process.exit(1);
    }

    console.log(`🔍 Buscando usuário: ${email}\n`);
    
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    
    if (!user) {
      console.log("❌ Usuário não encontrado!");
      process.exit(1);
    }
    
    console.log("✅ Usuário encontrado:");
    console.log(`   ID: ${user.id}`);
    console.log(`   Nome: ${user.fullName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Campo 'company': "${user.company || '(vazio)'}"`);
    
    if (user.company) {
      console.log(`\n🔍 Buscando empresa com nome: "${user.company}"`);
      
      const [company] = await db
        .select()
        .from(companies)
        .where(eq(companies.name, user.company));
      
      if (company) {
        console.log("✅ Empresa encontrada no cadastro:");
        console.log(`   ID: ${company.id}`);
        console.log(`   Nome: ${company.name}`);
        console.log(`   CNPJ: ${company.cnpj || '(sem CNPJ)'}`);
        console.log(`   Ativa: ${company.isActive ? 'Sim' : 'Não'}`);
        console.log(`\n✅ O ticket DEVERIA ser vinculado à empresa ID ${company.id}`);
      } else {
        console.log("❌ Empresa NÃO encontrada no cadastro!");
        console.log("\n📋 Empresas cadastradas:");
        const allCompanies = await db.select().from(companies);
        allCompanies.forEach((c: any) => {
          console.log(`   - "${c.name}" (ID: ${c.id})`);
        });
        console.log(`\n💡 O nome da empresa no usuário ("${user.company}") não corresponde a nenhuma empresa cadastrada.`);
      }
    } else {
      console.log("\n⚠️  O usuário não tem empresa cadastrada (campo 'company' está vazio).");
      console.log("   Para vincular automaticamente, preencha o campo 'company' no usuário com o nome EXATO de uma empresa cadastrada.");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro:", error);
    process.exit(1);
  }
}

checkUserCompany();
