import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

// Determine data directory (for Docker volume mounting e.g. /DATA/AppData/RvEmby -> /app/data)
const DATA_DIR = process.env.DATA_DIR || (fs.existsSync('/app/data') ? '/app/data' : __dirname);
const targetConfigFile = path.join(DATA_DIR, 'jemby-config.json');

function getConfigFile(): string {
  // Check common config file names in DATA_DIR and fallback to __dirname
  const candidates = [
    path.join(DATA_DIR, 'jemby-config.json'),
    path.join(DATA_DIR, 'rvemby-config.json'),
    path.join(DATA_DIR, 'config.json'),
    path.join(__dirname, 'jemby-config.json')
  ];

  for (const file of candidates) {
    if (fs.existsSync(file)) {
      return file;
    }
  }

  // Default target path
  return targetConfigFile;
}

// Automatically create and sync jemby-config.json on server startup
function syncConfigOnStartup() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Check environment variables (e.g. from docker-compose.yml EMBY_API_KEY)
    const envUrl = (process.env.EMBY_URL || process.env.VITE_EMBY_URL || '').trim();
    const envKey = (process.env.EMBY_API_KEY || process.env.VITE_EMBY_API_KEY || '').trim();

    let existingData: any = {};
    const existingFile = getConfigFile();
    if (fs.existsSync(existingFile)) {
      try {
        const raw = fs.readFileSync(existingFile, 'utf-8');
        existingData = JSON.parse(raw) || {};
      } catch (e) {
        console.warn('[JEmby] Could not parse existing config:', e);
      }
    }

    // Environment variables take precedence if provided, otherwise preserve existing, otherwise fallback
    const finalUrl = envUrl || existingData.url || 'http://192.168.10.146:8096';
    const finalKey = envKey || existingData.apiKey || '';

    const newConfig = {
      url: finalUrl,
      apiKey: finalKey,
      updatedAt: new Date().toISOString()
    };

    // ALWAYS write to disk on startup so jemby-config.json is visible in /DATA/AppData/RvEmby immediately!
    fs.writeFileSync(targetConfigFile, JSON.stringify(newConfig, null, 2), 'utf-8');

    console.log('=======================================================');
    console.log(`[JEmby Server] Running on port ${port} (mode: ${isProd ? 'production' : 'development'})`);
    console.log(`[JEmby Server] Data volume path: ${DATA_DIR}`);
    console.log(`[JEmby Server] Config file active: ${targetConfigFile}`);
    console.log(`[JEmby Server] Emby URL: ${finalUrl}`);
    console.log(`[JEmby Server] Emby API Key: ${finalKey ? 'Configured (' + finalKey.slice(0, 4) + '...' + finalKey.slice(-4) + ')' : 'Not set (Demo mode)'}`);
    console.log('=======================================================');
  } catch (err) {
    console.error('[JEmby Server] Error initializing config file on startup:', err);
  }
}

function getStoredSettings() {
  try {
    const configFile = getConfigFile();
    if (fs.existsSync(configFile)) {
      const content = fs.readFileSync(configFile, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed) {
        const envUrl = (process.env.EMBY_URL || process.env.VITE_EMBY_URL || '').trim();
        const envKey = (process.env.EMBY_API_KEY || process.env.VITE_EMBY_API_KEY || '').trim();
        return {
          url: envUrl || parsed.url || 'http://192.168.10.146:8096',
          apiKey: envKey || parsed.apiKey || ''
        };
      }
    }
  } catch (e) {
    console.error('[JEmby Server] Error reading config file:', e);
  }

  // Fallback to environment variables
  const envUrl = process.env.EMBY_URL || process.env.VITE_EMBY_URL || 'http://192.168.10.146:8096';
  const envKey = process.env.EMBY_API_KEY || process.env.VITE_EMBY_API_KEY || '';
  return { url: envUrl, apiKey: envKey };
}

// GET /api/settings - retrieve shared server settings
app.get('/api/settings', (_req, res) => {
  const settings = getStoredSettings();
  res.json(settings);
});

// POST /api/settings - save shared server settings from any client
app.post('/api/settings', (req, res) => {
  try {
    const { url, apiKey } = req.body || {};
    const newSettings = {
      url: (url || '').trim() || 'http://192.168.10.146:8096',
      apiKey: (apiKey || '').trim(),
      updatedAt: new Date().toISOString()
    };
    
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(targetConfigFile, JSON.stringify(newSettings, null, 2), 'utf-8');
    res.json({ success: true, settings: newSettings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', server: 'jemby', time: new Date().toISOString() });
});

async function main() {
  // Sync and ensure jemby-config.json exists on disk
  syncConfigOnStartup();

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Correctly resolve static assets whether running from dist/server.js or project root
    const staticDir = fs.existsSync(path.join(__dirname, 'index.html'))
      ? __dirname
      : path.join(__dirname, 'dist');

    console.log(`[JEmby Server] Serving static files from: ${staticDir}`);
    app.use(express.static(staticDir));
    app.get('*', (_req, res) => {
      const indexPath = path.join(staticDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(500).send(`[JEmby Server Error] index.html not found at: ${indexPath}`);
      }
    });
  }

  // Primary port (from env PORT or default)
  const primaryPort = Number(port) || 80;
  app.listen(primaryPort, '0.0.0.0', () => {
    console.log(`[JEmby Server] Listening on http://0.0.0.0:${primaryPort}`);
  });

  // Secondary port listener: ensures BOTH 3000:80 and 3000:3000 Docker port mappings work!
  const secondaryPort = primaryPort === 80 ? 3000 : (primaryPort === 3000 ? 80 : null);
  if (secondaryPort) {
    try {
      const secServer = app.listen(secondaryPort, '0.0.0.0', () => {
        console.log(`[JEmby Server] Also listening on http://0.0.0.0:${secondaryPort}`);
      });
      secServer.on('error', (err: any) => {
        if (err.code !== 'EADDRINUSE') {
          console.warn(`[JEmby Server] Secondary port ${secondaryPort} notice:`, err.message);
        }
      });
    } catch (e) {}
  }
}

main();
