import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage-interface";
import { User as UserSchema, InsertUser } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { Pool } from "pg";
import { generateRandomPassword, sendPasswordEmail } from "./utils/password";
import { loginRateLimiter } from "./middleware/rate-limit";
import multer from "multer";
import path from "path";
import fs from "fs";

const scryptAsync = promisify(scrypt);

declare global {
  namespace Express {
    // Extend Express.User interface with our User type
    interface User extends UserSchema {}
  }
}

// Função para hash da senha
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Função para comparar senhas
async function comparePasswords(supplied: string, stored: string) {
  // Verifica se a senha está no formato hash.salt
  if (!stored.includes(".")) {
    console.error('⚠️ [Security] Senha armazenada em formato inválido (não está hasheada)');
    return false; // NUNCA aceitar senha em texto plano
  }
  
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Configuração da sessão
  let sessionStore;
  
  if (process.env.NODE_ENV === 'production') {
    // Usar PostgreSQL para armazenar sessões em produção
    const PostgresSessionStore = connectPg(session);
    const pgPool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    sessionStore = new PostgresSessionStore({
      pool: pgPool,
      tableName: 'session', // Nome da tabela para as sessões
      createTableIfMissing: true
    });
  }
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'helpdesk-development-secret',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dias
      sameSite: 'lax' // Permite cookies em navegação normal
    }
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configuração da estratégia local (username/email e password)
  passport.use(
    new LocalStrategy(async (usernameOrEmail, password, done) => {
      try {
        // Tentar encontrar o usuário por username primeiro
        let user = await storage.getUserByUsername(usernameOrEmail);
        
        // Se não encontrou por username, tentar por email
        if (!user) {
          user = await storage.getUserByEmail(usernameOrEmail);
        }
        
        if (!user) {
          console.warn(`⚠️ [Auth] Tentativa de login com usuário inexistente: ${usernameOrEmail}`);
          return done(null, false, { message: "Credenciais inválidas" }); // Mensagem genérica
        }
        
        // Verificar se usuário está ativo
        if (!user.isActive) {
          console.warn(`⚠️ [Auth] Tentativa de login com usuário inativo: ${usernameOrEmail}`);
          return done(null, false, { message: "Conta desativada" });
        }
        
        const isPasswordValid = await comparePasswords(password, user.password);
        
        if (!isPasswordValid) {
          console.warn(`⚠️ [Auth] Senha incorreta para usuário: ${usernameOrEmail}`);
          return done(null, false, { message: "Credenciais inválidas" }); // Mensagem genérica
        }
        
        console.log(`✅ [Auth] Login bem-sucedido: ${user.username} (ID: ${user.id})`);
        return done(null, user);
      } catch (error) {
        console.error('❌ [Auth] Erro no processo de autenticação:', error);
        return done(error);
      }
    })
  );

  // Serialização e deserialização do usuário
  passport.serializeUser((user: UserSchema, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Rota de registro
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, fullName, email, role } = req.body;
      
      // Verificar se usuário já existe (por username ou email)
      const existingUserByUsername = await storage.getUserByUsername(username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Nome de usuário já está em uso" });
      }
      
      const existingUserByEmail = await storage.getUserByEmail(email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email já está em uso" });
      }
      
      // Hash da senha
      const hashedPassword = await hashPassword(password);
      
      // Criar usuário
      const newUser = await storage.createUser({
        username,
        password: hashedPassword,
        fullName,
        email,
        role: role || "helpdesk_agent",
        isActive: true
      });
      
      // Auto login
      req.login(newUser, (err) => {
        if (err) {
          return res.status(500).json({ message: "Erro ao autenticar" });
        }
        
        // Remover senha do objeto retornado
        const { password, ...userWithoutPassword } = newUser;
        return res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Erro no registro:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Rota de login com rate limiting
  app.post("/api/auth/login", loginRateLimiter, (req, res, next) => {
    console.log('🔐 [Auth] Tentativa de login:', { username: req.body.username });
    
    passport.authenticate("local", (err: any, user: UserSchema | false, info: { message: string }) => {
      if (err) {
        console.error('❌ [Auth] Erro no login:', err);
        return next(err);
      }
      
      if (!user) {
        console.warn('⚠️ [Auth] Login falhou:', info?.message);
        return res.status(401).json({ message: info?.message || "Credenciais inválidas" });
      }
      
      console.log('✅ [Auth] Usuário autenticado:', { id: user.id, username: user.username });
      
      req.login(user, (err) => {
        if (err) {
          console.error('❌ [Auth] Erro ao criar sessão:', err);
          return next(err);
        }
        
        console.log('✅ [Auth] Sessão criada com sucesso:', { sessionID: req.sessionID });
        
        // Verificar se é primeiro login (nova flag no banco)
        const requiresPasswordChange = user.firstLogin === true;
        
        // Remover senha do objeto retornado
        const { password, ...userWithoutPassword } = user;
        return res.json({
          ...userWithoutPassword,
          requiresPasswordChange
        });
      });
    })(req, res, next);
  });

  // Rota de logout
  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) {
        return next(err);
      }
      res.json({ message: "Logout realizado com sucesso" });
    });
  });

  // Rota para obter usuário atual
  app.get("/api/auth/current-user", (req, res) => {
    console.log('🔍 [Auth] Verificando autenticação:', { 
      authenticated: req.isAuthenticated(), 
      sessionID: req.sessionID,
      session: req.session ? 'exists' : 'missing',
      user: req.user ? (req.user as any).username : 'none'
    });
    
    if (!req.isAuthenticated()) {
      console.warn('⚠️ [Auth] Usuário não autenticado');
      return res.status(401).json({ message: "Não autenticado" });
    }
    
    console.log('✅ [Auth] Usuário autenticado:', { id: (req.user as any).id });
    
    // Remover senha do objeto retornado
    const { password, ...userWithoutPassword } = req.user as UserSchema;
    res.json(userWithoutPassword);
  });

  // Rota para atualizar perfil de usuário
  app.patch("/api/auth/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    
    try {
      const userId = (req.user as UserSchema).id;
      const { currentPassword, newPassword, ...profileData } = req.body;
      
      // Se estiver alterando a senha
      if (currentPassword && newPassword) {
        if (!userId) {
          return res.status(400).json({ message: "ID do usuário é necessário" });
        }
        
        const user = await storage.getUser(userId);
        
        if (!user) {
          return res.status(404).json({ message: "Usuário não encontrado" });
        }
        
        const isPasswordValid = await comparePasswords(currentPassword, user.password);
        
        if (!isPasswordValid) {
          return res.status(400).json({ message: "Senha atual incorreta" });
        }
        
        // Hash da nova senha
        profileData.password = await hashPassword(newPassword);
      }
      
      // Persistir as alterações no banco
      // A interface storage já implementa updateUser no PostgresStorage
      if (Object.keys(profileData).length > 0) {
        try {
          const updated = await storage.updateUser(userId!, profileData as any);

          // Caso updateUser retorne o usuário atualizado, use-o; senão, recarregue do storage
          const refreshedUser = updated || await storage.getUser(userId!);

          if (!refreshedUser) {
            return res.status(500).json({ message: 'Falha ao atualizar usuário' });
          }

          // Atualizar sessão com o usuário novo para que req.user reflita as mudanças
          req.login(refreshedUser, (err) => {
            if (err) {
              console.error('Erro ao atualizar sessão após alteração de perfil:', err);
            }

            const { password, ...userWithoutPassword } = refreshedUser as UserSchema;
            return res.json(userWithoutPassword);
          });
          return;
        } catch (err) {
          console.error('Erro ao persistir alterações de perfil:', err);
          return res.status(500).json({ message: 'Erro ao persistir alterações de perfil' });
        }
      }

      // Se não há alterações, retornar o usuário atual sem senha
      const { password, ...userWithoutPassword } = req.user as UserSchema;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Rota para forçar troca de senha (sem precisar da senha atual)
  app.post("/api/auth/force-change-password", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    
    try {
      const userId = (req.user as UserSchema).id;
      const { newPassword } = req.body;
      
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "Nova senha deve ter pelo menos 6 caracteres" });
      }
      
      // Hash da nova senha
      const hashedPassword = await hashPassword(newPassword);
      
      // Atualizar senha e desativar flag de primeiro login
      const updated = await storage.updateUser(userId!, { 
        password: hashedPassword,
        firstLogin: false 
      } as any);
      const refreshedUser = updated || await storage.getUser(userId!);
      
      if (!refreshedUser) {
        return res.status(500).json({ message: 'Falha ao atualizar senha' });
      }
      
      // Atualizar sessão
      req.login(refreshedUser, (err) => {
        if (err) {
          console.error('Erro ao atualizar sessão:', err);
        }
        
        const { password, ...userWithoutPassword } = refreshedUser as UserSchema;
        return res.json({ 
          ...userWithoutPassword,
          message: "Senha alterada com sucesso"
        });
      });
    } catch (error) {
      console.error("Erro ao trocar senha:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Configurar upload de avatar
  const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const userId = (req.user as UserSchema).id;
      const uniqueSuffix = Date.now();
      cb(null, `avatar-${userId}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  });

  const avatarUpload = multer({
    storage: avatarStorage,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Apenas imagens são permitidas'));
      }
    }
  });

  // Rota para upload de avatar
  app.post("/api/auth/upload-avatar", avatarUpload.single('avatar'), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    try {
      const userId = (req.user as UserSchema).id;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }

      // Construir URL do avatar
      const avatarUrl = `/api/uploads/avatars/${file.filename}`;

      // Deletar avatar antigo se existir
      const currentUser = await storage.getUser(userId!);
      if (currentUser?.avatarUrl) {
        const oldFilePath = path.join(process.cwd(), 'uploads', 'avatars', path.basename(currentUser.avatarUrl));
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      // Atualizar usuário com novo avatar
      const updated = await storage.updateUser(userId!, { avatarUrl } as any);
      const refreshedUser = updated || await storage.getUser(userId!);

      if (!refreshedUser) {
        return res.status(500).json({ message: 'Falha ao atualizar avatar' });
      }

      // Atualizar sessão
      req.login(refreshedUser, (err) => {
        if (err) {
          console.error('Erro ao atualizar sessão:', err);
        }

        const { password, ...userWithoutPassword } = refreshedUser as UserSchema;
        return res.json({
          ...userWithoutPassword,
          message: "Avatar atualizado com sucesso"
        });
      });
    } catch (error) {
      console.error("Erro ao fazer upload de avatar:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
}