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

// Persistent server config file so any device on the network gets the settings
const CONFIG_FILE = path.join(__dirname, 'jemby-config.json');

function getStoredSettings() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && (parsed.url || parsed.apiKey)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading jemby-config.json:', e);
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
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(newSettings, null, 2), 'utf-8');
    res.json({ success: true, settings: newSettings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

async function main() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`JEmby Server running on http://0.0.0.0:${port}`);
  });
}

main();
