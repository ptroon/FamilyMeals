import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import https from 'https';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

import { initDatabase } from './db/database.js';
import authRouter from './routes/auth.js';
import recipesRouter from './routes/recipes.js';
import mealplansRouter from './routes/mealplans.js';
import shoppinglistsRouter from './routes/shoppinglists.js';
import shareRouter from './routes/share.js';
import adminRouter from './routes/admin.js';
import aiRouter from './routes/ai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite database & settings (creates blank DB with default admin on first run if no DB file exists)
initDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust GCP / Cloud Run / App Hosting / Load Balancer reverse proxy for HTTPS & X-Forwarded-Proto
app.set('trust proxy', 1);

// Enforce HTTPS & HSTS when running in production on GCP or when FORCE_HTTPS=true
app.use((req, res, next) => {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const isHttps = req.secure || forwardedProto === 'https';

  if ((process.env.FORCE_HTTPS === 'true' || process.env.K_SERVICE) && forwardedProto === 'http' && req.path !== '/health') {
    res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
    return;
  }

  if (isHttps) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static uploads directory
const uploadsDir = path.resolve(process.cwd(), 'data/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/recipes', recipesRouter);
app.use('/api/meal-plans', mealplansRouter);
app.use('/api/shopping-lists', shoppinglistsRouter);
app.use('/api/share', shareRouter);
app.use('/api/admin', adminRouter);
app.use('/api/ai', aiRouter);

// Health check endpoint for Google App Hosting / Cloud Run
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '0.4.0', time: new Date().toISOString() });
});

// Serve frontend in production or if dist/client exists
const clientDistPath = path.resolve(process.cwd(), 'dist/client');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  app.use((req, res, next) => {
    // If it's an API route that reached here, return 404 JSON
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'API endpoint not found' });
      return;
    }
    if (req.path.startsWith('/uploads/')) {
      res.status(404).json({ error: 'File not found' });
      return;
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // Helpful development notice if client is not built yet
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>FamilyMeals Server Running</title>
          <style>
            body { font-family: Arial, sans-serif; background: #faf7f2; color: #2d2a26; padding: 40px; text-align: center; }
            h1 { color: #c2593f; }
            .card { background: white; max-width: 600px; margin: 40px auto; padding: 24px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
            code { background: #eee; padding: 3px 8px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>FamilyMeals Backend Active (v0.4)</h1>
            <p>The backend API is running on port ${PORT}.</p>
            <p>To run the Vite frontend UI in development mode, run:</p>
            <p><code>npm run dev:client</code></p>
            <p>Or build the frontend assets for production:</p>
            <p><code>npm run build</code></p>
          </div>
        </body>
      </html>
    `);
  });
}

// Support direct SSL/TLS certificate files if SSL_CERT_PATH and SSL_KEY_PATH are provided
const sslCertPath = process.env.SSL_CERT_PATH;
const sslKeyPath = process.env.SSL_KEY_PATH;

if (sslCertPath && sslKeyPath && fs.existsSync(sslCertPath) && fs.existsSync(sslKeyPath)) {
  const httpsOptions = {
    cert: fs.readFileSync(sslCertPath),
    key: fs.readFileSync(sslKeyPath)
  };
  https.createServer(httpsOptions, app).listen(PORT, () => {
    console.log(`[FamilyMeals v0.4] HTTPS Server started with TLS certificate on https://localhost:${PORT}`);
  });
} else {
  app.listen(PORT, () => {
    console.log(`[FamilyMeals v0.4] Server started and listening on http://localhost:${PORT}`);
  });
}
