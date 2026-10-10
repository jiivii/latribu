import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  INITIAL_RESERVATIONS,
  INITIAL_BLOCKS,
  Reservation,
  CalendarBlock,
} from './src/types/booking.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'la-tribu-store.json');

interface StoreData {
  reservations: Reservation[];
  blocks: CalendarBlock[];
}

function loadStore(): StoreData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as StoreData;
      if (Array.isArray(parsed.reservations) && Array.isArray(parsed.blocks)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading store file, falling back to initial seed:', err);
  }
  const initial: StoreData = {
    reservations: INITIAL_RESERVATIONS,
    blocks: INITIAL_BLOCKS,
  };
  saveStore(initial);
  return initial;
}

function saveStore(data: StoreData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving store file:', err);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  let store = loadStore();

  app.get('/api/state', (_req, res) => {
    res.json(store);
  });

  app.post('/api/state', (req, res) => {
    const { reservations, blocks } = req.body as Partial<StoreData>;
    if (Array.isArray(reservations)) {
      store.reservations = reservations;
    }
    if (Array.isArray(blocks)) {
      store.blocks = blocks;
    }
    saveStore(store);
    res.json({ ok: true, store });
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`La Tribu server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
