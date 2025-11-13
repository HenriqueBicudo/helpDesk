import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
// carregaremos vite dinamicamente dentro de setupVite
import { type Server } from "http";
// usamos timestamp simples para cache-busting em vez de trazer 'nanoid'

// Para compatibilidade com import.meta.dirname no Node.js 18
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// viteLogger será criado apenas se o pacote 'vite' estiver disponível

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // tente importar 'vite' dinamicamente; se não estiver presente, apenas logue e siga sem middleware
  let vite: any = null;
  let viteLogger: any = null;

  try {
    const viteModule = await import("vite");
    const { createServer: createViteServer, createLogger } = viteModule;
    viteLogger = createLogger();

    const serverOptions = {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true as true,
    };

    vite = await createViteServer({
      configFile: path.resolve(__dirname, "..", "client", "vite.config.ts"),
      root: path.resolve(__dirname, "..", "client"),
      customLogger: {
        ...viteLogger,
        error: (msg: any, options: any) => {
          viteLogger.error(msg, options);
          process.exit(1);
        },
      },
      server: serverOptions,
      appType: "custom",
    });
  } catch (err) {
    log("vite não encontrado — carregando sem integração de dev middleware", "vite");
    return; // não falha o servidor, apenas não monta o middleware do Vite
  }

  // se chegamos aqui, vite está disponível
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Skip API routes - let them be handled by the API handlers
    if (url.startsWith('/api')) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${Date.now()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
