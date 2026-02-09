import rateLimit from 'express-rate-limit';

// Rate limiter para login (prevenir ataques de força bruta)
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 tentativas
  message: {
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    retryAfter: 15
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Identificar por IP + username
  keyGenerator: (req) => {
    return `${req.ip}-${req.body?.username || 'unknown'}`;
  },
  handler: (req, res) => {
    console.warn(`⚠️ [Rate Limit] Bloqueado IP: ${req.ip}, username: ${req.body?.username}`);
    res.status(429).json({
      message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
      retryAfter: 15 * 60
    });
  }
});

// Rate limiter para API geral
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requisições por 15 minutos por IP
  message: {
    message: 'Muitas requisições. Tente novamente mais tarde.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Não aplicar rate limit em desenvolvimento
    return process.env.NODE_ENV !== 'production';
  }
});

// Rate limiter para criação de recursos (tickets, users, etc)
export const createResourceRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 criações por minuto
  message: {
    message: 'Muitas criações em pouco tempo. Aguarde um momento.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter para reset de senha
export const resetPasswordRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 tentativas por hora
  message: {
    message: 'Muitas solicitações de reset de senha. Tente novamente em 1 hora.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
