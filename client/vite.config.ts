import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "../shared"),
      "@assets": path.resolve(__dirname, "../attached_assets"),
    },
  },
  server: {
    host: '0.0.0.0', // Necessário para Docker
    port: 3000,
    hmr: {
      port: 3000,
      protocol: 'ws',
      host: 'localhost',
      clientPort: 3000,
    },
    watch: {
      usePolling: true, // Necessário para watch funcionar no Docker
    },
    // Proxy API requests to the Express server
    proxy: {
      '/api': {
        target: 'http://backend:5000', // Nome do serviço no docker-compose
        changeOrigin: true,
      },
    },
  },
});
