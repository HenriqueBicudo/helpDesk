import express from "express";
import cors from "cors";
import { registerRoutes } from "./routes";

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register routes
registerRoutes(app).then((server) => {
  server.listen(port, () => {
    console.log(`🚀 Backend API rodando em http://localhost:${port}`);
  });
}).catch((error) => {
  console.error("❌ Erro ao inicializar servidor:", error);
  process.exit(1);
});
