import { Request, Response } from "express";
import { User as UserSchema } from "@shared/schema";
import { storage } from "../storage-interface";
import { hashPassword } from "../auth";
import { generateRandomPassword, sendPasswordEmail } from "../utils/password";

/**
 * Endpoint para resetar senha de um usuário (apenas admin/manager)
 * POST /api/auth/reset-user-password
 * Body: { userId: number }
 */
export async function resetUserPassword(req: Request, res: Response) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Não autenticado" });
  }
  
  const currentUser = req.user as UserSchema;
  
  // Verificar se o usuário tem permissão (admin ou manager)
  if (!['admin', 'helpdesk_manager'].includes(currentUser.role)) {
    return res.status(403).json({ message: "Sem permissão para resetar senhas" });
  }
  
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: "ID do usuário é obrigatório" });
    }
    
    // Buscar o usuário
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }
    
    // Gerar senha aleatória
    const newPassword = generateRandomPassword(12);
    const hashedPassword = await hashPassword(newPassword);
    
    // Atualizar senha e ativar flag de primeiro login
    await storage.updateUser(userId, {
      password: hashedPassword,
      firstLogin: true
    } as any);
    
    // Enviar email com a nova senha
    const emailSent = await sendPasswordEmail({
      to: user.email,
      fullName: user.fullName,
      username: user.username,
      password: newPassword,
      isReset: true
    });
    
    if (emailSent) {
      console.log(`✅ Senha resetada e email enviado para ${user.email}`);
    } else {
      console.log(`⚠️ Senha resetada mas email não foi enviado para ${user.email}`);
    }
    
    return res.json({ 
      message: "Senha resetada com sucesso",
      emailSent,
      tempPassword: emailSent ? undefined : newPassword // Só retorna se o email falhou
    });
  } catch (error) {
    console.error("Erro ao resetar senha:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
}
