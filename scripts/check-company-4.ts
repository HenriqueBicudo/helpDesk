import { db } from "../server/db-postgres";
import { companies } from "@shared/drizzle-schema";
import { eq } from "drizzle-orm";

async function checkCompany() {
  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, 4));
  
  if (company) {
    console.log('✅ Empresa encontrada:');
    console.log(`  ID: ${company.id}`);
    console.log(`  Nome: ${company.name}`);
    console.log(`  CNPJ: ${company.cnpj || '(sem CNPJ)'}`);
    console.log(`  Ativa: ${company.isActive ? 'Sim' : 'Não'}`);
  } else {
    console.log('❌ Empresa ID 4 não encontrada!');
  }
  
  process.exit(0);
}

checkCompany();
