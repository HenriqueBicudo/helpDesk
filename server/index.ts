import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
// import { registerRoutesSimple } from "./routes-simple";
import { setupVite, serveStatic, log } from "./vite";
import { startSlaMonitoring } from "./jobs/sla-monitor.job";
import { timeBasedAutomationJob } from "./jobs/time-based-automation.job";
import { emailInboundService } from "./services/email-inbound.service";
import { setupSecurityHeaders } from "./middleware/security-headers";
import { apiRateLimiter } from "./middleware/rate-limit";

const app = express();

// ===== VALIDAÇÕES DE SEGURANÇA =====
// Validar que SESSION_SECRET não está usando o valor padrão em produção
if (process.env.NODE_ENV === 'production') {
  const secret = process.env.SESSION_SECRET || '';
  if (secret === 'helpdesk-development-secret' || secret.length < 32) {
    console.error('❌ [Security] SESSION_SECRET inadequado para produção!');
    console.error('   Gere um secret forte com: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))";');
    process.exit(1);
  }
}

// Configurar CORS para permitir requisições com credenciais
const allowedOrigins = [
  'http://localhost:3000', // Vite dev server
  'http://localhost:5000', // Express server (caso acesse direto)
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requisições sem origem (ex: mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    // Em desenvolvimento, permitir qualquer origem da rede local
    if (process.env.NODE_ENV !== 'production') {
      // Permitir IPs da rede local (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
      if (origin.match(/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/)) {
        return callback(null, true);
      }
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true // Permite envio de cookies
}));

// Configurar headers de segurança (Helmet.js)
setupSecurityHeaders(app);

// Aumentar limite do body-parser para suportar imagens base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Rate limiting para toda a API (apenas em produção)
if (process.env.NODE_ENV === 'production') {
  app.use('/api', apiRateLimiter);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // NÃO logar response completo - pode conter dados sensíveis
      // Apenas logar em caso de erro para debug
      if (res.statusCode >= 400 && capturedJsonResponse) {
        // Não logar campos sensíveis mesmo em erros
        const safeResponse = { ...capturedJsonResponse };
        delete safeResponse.password;
        delete safeResponse.token;
        delete safeResponse.secret;
        logLine += ` :: ${JSON.stringify(safeResponse).slice(0, 200)}`;
      }

      if (logLine.length > 200) {
        logLine = logLine.slice(0, 199) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    // await setupVite(app, server); // Temporariamente desabilitado devido a conflito com path-to-regexp
    log('Frontend development mode: acesse http://localhost:3000 para o cliente Vite separado');
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen(port, "127.0.0.1", () => {
    log(`Servidor rodando em http://127.0.0.1:${port}`);
    log(`Também disponível em http://localhost:${port}`);
    
    // 🚀 Sprint 4: Iniciar monitoramento automático de SLA
    log(`🤖 Iniciando sistema de monitoramento de SLA...`);
    startSlaMonitoring();
    log(`✅ Sistema de monitoramento SLA ativo (verifica a cada 5 minutos)`);
    
    // 🤖 Iniciar automação baseada em tempo
    log(`🤖 Iniciando sistema de automação baseada em tempo...`);
    timeBasedAutomationJob.start();
    log(`✅ Sistema de automação temporal ativo (verifica a cada 5 minutos)`);
    
    // 📬 Iniciar monitoramento de emails recebidos (se configurado)
    emailInboundService.startMonitoring(1); // Verifica a cada 1 minuto
  });
})();
