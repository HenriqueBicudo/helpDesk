import helmet from 'helmet';
import { Express } from 'express';

/**
 * Configura headers de segurança com Helmet.js
 */
export function setupSecurityHeaders(app: Express) {
  // Helmet básico com configurações personalizadas
  app.use(helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // unsafe-eval necessário para desenvolvimento
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    // Prevenir clickjacking
    frameguard: {
      action: 'deny'
    },
    // HSTS (HTTP Strict Transport Security)
    hsts: {
      maxAge: 31536000, // 1 ano
      includeSubDomains: true,
      preload: true
    },
    // Prevenir MIME sniffing
    noSniff: true,
    // Desabilitar X-Powered-By header
    hidePoweredBy: true,
    // XSS Filter (legacy, mas ainda útil)
    xssFilter: true,
  }));

  // Adicionar headers customizados
  app.use((req, res, next) => {
    // Prevenir que o browser armazene em cache páginas sensíveis
    if (req.path.startsWith('/api')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    
    // Adicionar header de permissões policy
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    next();
  });
}
