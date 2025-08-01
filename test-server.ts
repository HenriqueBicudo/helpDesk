import express from "express";
import { registerRoutes } from "./server/routes";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Middleware de log para APIs
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      console.log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  try {
    const server = await registerRoutes(app);

    // Middleware de erro
    app.use((err: any, req: any, res: any, next: any) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error(`Error ${status}: ${message}`);
      res.status(status).json({ message });
    });

    const port = 5000;
    server.listen(port, "localhost", () => {
      console.log(`🚀 Servidor API rodando em http://localhost:${port}`);
      console.log(`📋 Endpoints disponíveis:`);
      console.log(`   GET  /api/tickets`);
      console.log(`   POST /api/tickets`);
      console.log(`   GET  /api/users`);
      console.log(`   GET  /api/requesters`);
    });
  } catch (error) {
    console.error('Erro ao iniciar servidor:', error);
    process.exit(1);
  }
})();
