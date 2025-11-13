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
  if (stored.includes(".")) {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } else {
    // Para desenvolvimento/teste, verificar senhas em texto plano
    return supplied === stored;
  }
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
      maxAge: 1000 * 60 * 60 * 24 * 7 // 7 dias
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
          return done(null, false, { message: "Usuário não encontrado" });
        }
        
        const isPasswordValid = await comparePasswords(password, user.password);
        
        if (!isPasswordValid) {
          return done(null, false, { message: "Senha incorreta" });
        }
        
        return done(null, user);
      } catch (error) {
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

  // Rota de login
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: UserSchema | false, info: { message: string }) => {
      if (err) {
        return next(err);
      }
      
      if (!user) {
        return res.status(401).json({ message: info?.message || "Credenciais inválidas" });
      }
      
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        
        // Remover senha do objeto retornado
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    
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
}