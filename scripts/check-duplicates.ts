import { db } from "../server/db-postgres";
import { users } from "@shared/drizzle-schema";
import { eq } from "drizzle-orm";

async function checkDuplicates() {
  const email = "henrique.luiz.bicudo@gmail.com";
  
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email));
  
  console.log(`Encontrados ${result.length} usuário(s) com email ${email}:\n`);
  
  result.forEach((user, index) => {
    console.log(`Usuário ${index + 1}:`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Nome: ${user.fullName}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Company: "${user.company || '(vazio)'}"`);
    console.log('');
  });
  
  process.exit(0);
}

checkDuplicates();
