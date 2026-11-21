import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Lightweight 100% offline local server for ShirinTaraz.
 * Zero Gemini API calls, zero external API keys, zero cloud dependencies.
 * Runs locally on any personal computer via `npm run dev` or `npm run build && npm start`.
 */
async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', mode: 'offline-local' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: isHmrDisabled ? false : true,
        ws: { server: httpServer },
        watch: isHmrDisabled ? null : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`ShirinTaraz (Offline Local Edition) running on http://localhost:${PORT}`);
  });
}

startServer();
