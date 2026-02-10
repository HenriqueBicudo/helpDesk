import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { db } from "../server/db-postgres";
import { users } from "@shared/drizzle-schema";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function resetAdminPassword() {
  try {
    const newPassword = process.argv[2] || "admin123";
    
    console.log("🔐 Resetando senha do administrador...");
    
    // Hashear a nova senha
    const hashedPassword = await hashPassword(newPassword);
    
    // Atualizar a senha do admin
    const result = await db
      .update(users)
      .set({ 
        password: hashedPassword,
        requiresPasswordChange: false
      })
      .where(eq(users.role, "admin"))
      .returning();
    
    if (result.length === 0) {
      console.error("❌ Nenhum usuário admin encontrado!");
      process.exit(1);
    }
    
    console.log("✅ Senha resetada com sucesso!");
    console.log(`👤 Usuário: ${result[0].username}`);
    console.log(`🔑 Nova senha: ${newPassword}`);
    console.log("\n⚠️  IMPORTANTE: Altere esta senha após o primeiro login!");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao resetar senha:", error);
    process.exit(1);
  }
}

resetAdminPassword();
