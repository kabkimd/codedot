import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET = process.env.JWT_SECRET || 'secret-key';

// Load users from users.json
const USERS_PATH = path.resolve(process.cwd(), 'users.json');
let USERS = [];
try {
  USERS = JSON.parse(await fs.readFile(USERS_PATH, 'utf8'));
} catch (e) {
  console.error('Failed to load users.json', e);
}

function getUser(username) {
  return USERS.find(u => u.username === username);
}

app.use(cors());
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

function userDir(username) {
  return path.resolve(process.cwd(), 'users', username);
}

function isPathInside(base, target) {
  const relative = path.relative(base, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  const user = getUser(username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ username }, SECRET);
  res.json({ user: { username }, token });
});

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Auth required' });
  }
  try {
    const payload = jwt.verify(auth.slice(7), SECRET);
    req.user = payload.username;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

async function buildTree(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nodes = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return {
        name: entry.name,
        path: fullPath,
        isDirectory: true,
        children: await buildTree(fullPath),
      };
    } else {
      const stat = await fs.stat(fullPath);
      return {
        name: entry.name,
        path: fullPath,
        isDirectory: false,
        size: stat.size,
      };
    }
  }));
  return nodes;
}

app.get('/api/tree', authMiddleware, async (req, res) => {
  const BASE_DIR = userDir(req.user);
  try {
    const children = await buildTree(BASE_DIR);
    res.json([
      {
        name: path.basename(BASE_DIR),
        path: BASE_DIR,
        isDirectory: true,
        children,
      },
    ]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/file', authMiddleware, async (req, res) => {
  const BASE_DIR = userDir(req.user);
  const filePath = req.query.path;
  if (typeof filePath !== 'string') {
    return res.status(400).json({ error: 'path query parameter required' });
  }
  const normalized = path.resolve(filePath);
  if (!isPathInside(BASE_DIR, normalized)) {
    return res.status(400).json({ error: 'invalid path' });
  }
  try {
    const content = await fs.readFile(normalized, 'utf8');
    res.type('text/plain').send(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/file', authMiddleware, async (req, res) => {
  const BASE_DIR = userDir(req.user);
  const { path: filePath, content } = req.body || {};
  if (!filePath) {
    return res.status(400).json({ error: 'path required' });
  }
  const normalized = path.resolve(filePath);
  if (!isPathInside(BASE_DIR, normalized)) {
    return res.status(400).json({ error: 'invalid path' });
  }
  try {
    await fs.writeFile(normalized, content ?? '', 'utf8');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/file', authMiddleware, async (req, res) => {
  const BASE_DIR = userDir(req.user);
  const { parent, name, isDirectory } = req.body || {};
  if (!parent || !name) {
    return res.status(400).json({ error: 'parent and name required' });
  }
  const parentPath = path.resolve(parent);
  if (!isPathInside(BASE_DIR, parentPath)) {
    return res.status(400).json({ error: 'invalid path' });
  }
  const newPath = path.join(parentPath, name);
  try {
    if (isDirectory) {
      await fs.mkdir(newPath, { recursive: true });
    } else {
      await fs.writeFile(newPath, '', { flag: 'wx' });
    }
    res.json({ ok: true, path: newPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/file', authMiddleware, async (req, res) => {
  const BASE_DIR = userDir(req.user);
  const filePath = req.query.path;
  if (typeof filePath !== 'string') {
    return res.status(400).json({ error: 'path query parameter required' });
  }
  const normalized = path.resolve(filePath);
  if (!isPathInside(BASE_DIR, normalized)) {
    return res.status(400).json({ error: 'invalid path' });
  }
  try {
    await fs.rm(normalized, { recursive: true, force: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/file', authMiddleware, async (req, res) => {
  const BASE_DIR = userDir(req.user);
  const { path: filePath, newName } = req.body || {};
  if (!filePath || !newName) {
    return res.status(400).json({ error: 'path and newName required' });
  }
  const normalized = path.resolve(filePath);
  if (!isPathInside(BASE_DIR, normalized)) {
    return res.status(400).json({ error: 'invalid path' });
  }
  const newPath = path.join(path.dirname(normalized), newName);
  try {
    await fs.rename(normalized, newPath);
    res.json({ ok: true, path: newPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/move', authMiddleware, async (req, res) => {
  const BASE_DIR = userDir(req.user);
  const { path: filePath, target } = req.body || {};
  if (!filePath || !target) {
    return res.status(400).json({ error: 'path and target required' });
  }
  const sourcePath = path.resolve(filePath);
  const targetDir = path.resolve(target);
  if (!isPathInside(BASE_DIR, sourcePath) || !isPathInside(BASE_DIR, targetDir)) {
    return res.status(400).json({ error: 'invalid path' });
  }
  const newPath = path.join(targetDir, path.basename(sourcePath));
  try {
    await fs.rename(sourcePath, newPath);
    res.json({ ok: true, path: newPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/upload', authMiddleware, upload.array('files'), async (req, res) => {
  const BASE_DIR = userDir(req.user);
  const parent = req.body.parent;
  if (!parent) {
    return res.status(400).json({ error: 'parent required' });
  }
  const parentPath = path.resolve(parent);
  if (!isPathInside(BASE_DIR, parentPath)) {
    return res.status(400).json({ error: 'invalid path' });
  }
  try {
    const files = req.files || [];
    await Promise.all(
      Array.isArray(files)
        ? files.map((f) =>
            fs.writeFile(path.join(parentPath, f.originalname), f.buffer)
          )
        : []
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
