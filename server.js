import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import archiver from 'archiver';

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
  return USERS.find((u) => u.username === username.toLowerCase());
}

async function saveUsers() {
  await fs.writeFile(USERS_PATH, JSON.stringify(USERS, null, 2));
}

app.use(cors());
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

function userDir(username) {
  return path.resolve(process.cwd(), 'users', username.toLowerCase());
}

const MAX_BYTES = 250 * 1024 * 1024;

async function getDirectorySize(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const sizes = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return await getDirectorySize(fullPath);
    }
    const stat = await fs.stat(fullPath);
    return stat.size;
  }));
  return sizes.reduce((a, b) => a + b, 0);
}

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  const usernameLc = (username || '').toLowerCase();
  const user = getUser(usernameLc);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ username: usernameLc }, SECRET);
  res.json({ user: { username: usernameLc }, token });
});

app.get('/api/user', authMiddleware, async (req, res) => {
  const user = getUser(req.user);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  const { username, full_name, email, isPublic } = user;
  res.json({ username, full_name, email, isPublic });
});

app.patch('/api/user', authMiddleware, async (req, res) => {
  const user = getUser(req.user);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  const {
    username: newUsername,
    full_name,
    email,
    isPublic,
    currentPassword,
    newPassword,
  } = req.body || {};

  if (typeof full_name === 'string') user.full_name = full_name;
  if (typeof email === 'string') user.email = email;
  if (typeof isPublic === 'boolean') user.isPublic = isPublic;

  let newToken = null;
  if (newUsername) {
    const normalized = newUsername.toLowerCase();
    if (normalized !== user.username) {
      if (!/^[\w-]+$/.test(normalized)) {
      return res.status(400).json({ error: 'Invalid username' });
      }
      if (getUser(normalized)) {
        return res.status(400).json({ error: 'Username taken' });
      }
      try {
        await fs.rename(userDir(user.username), userDir(normalized));
      } catch (err) {
        return res.status(500).json({ error: 'Failed to rename user directory' });
      }
      user.username = normalized;
      newToken = jwt.sign({ username: normalized }, SECRET);
    }
  }

  if (newPassword) {
    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password required' });
    }
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(400).json({ error: 'Current password incorrect' });
    }
    user.password = await bcrypt.hash(newPassword, 10);
  }

  await saveUsers();
  res.json({
    username: user.username,
    full_name: user.full_name,
    email: user.email,
    isPublic: user.isPublic,
    token: newToken,
  });
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

app.get('/api/usage', authMiddleware, async (req, res) => {
  const BASE_DIR = userDir(req.user);
  try {
    const used = await getDirectorySize(BASE_DIR);
    res.json({ used, max: MAX_BYTES });
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
  if (!normalized.startsWith(BASE_DIR)) {
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
  if (!normalized.startsWith(BASE_DIR)) {
    return res.status(400).json({ error: 'invalid path' });
  }
  try {
    const currentSize = await getDirectorySize(BASE_DIR);
    let prev = 0;
    try {
      const stat = await fs.stat(normalized);
      prev = stat.size;
    } catch {}
    const newSize = Buffer.byteLength(content ?? '', 'utf8');
    if (currentSize - prev + newSize > MAX_BYTES) {
      return res.status(400).json({ error: 'Storage limit exceeded' });
    }
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
  if (!parentPath.startsWith(BASE_DIR)) {
    return res.status(400).json({ error: 'invalid path' });
  }
  const newPath = path.resolve(parentPath, name);
  if (!newPath.startsWith(BASE_DIR)) {
    return res.status(400).json({ error: 'invalid path' });
  }
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
  if (!normalized.startsWith(BASE_DIR)) {
    return res.status(400).json({ error: 'invalid path' });
  }
  if (normalized === BASE_DIR) {
    return res.status(400).json({ error: 'cannot delete root folder' });
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
  if (!normalized.startsWith(BASE_DIR)) {
    return res.status(400).json({ error: 'invalid path' });
  }
  if (normalized === BASE_DIR) {
    return res.status(400).json({ error: 'cannot rename root folder' });
  }
  const newPath = path.resolve(path.dirname(normalized), newName);
  if (!newPath.startsWith(BASE_DIR)) {
    return res.status(400).json({ error: 'invalid path' });
  }
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
  if (!sourcePath.startsWith(BASE_DIR) || !targetDir.startsWith(BASE_DIR)) {
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
  if (!parentPath.startsWith(BASE_DIR)) {
    return res.status(400).json({ error: 'invalid path' });
  }
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    const currentSize = await getDirectorySize(BASE_DIR);
    const added = files.reduce((t, f) => t + f.size, 0);
    if (currentSize + added > MAX_BYTES) {
      return res.status(400).json({ error: 'Storage limit exceeded' });
    }
    await Promise.all(
      files.map(async (f) => {
        const dest = path.resolve(parentPath, f.originalname);
        if (!dest.startsWith(BASE_DIR)) {
          throw new Error('invalid path');
        }
        await fs.writeFile(dest, f.buffer);
      })
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/download', authMiddleware, async (req, res) => {
  const BASE_DIR = userDir(req.user);
  const itemPath = req.query.path;
  if (typeof itemPath !== 'string') {
    return res.status(400).json({ error: 'path query parameter required' });
  }
  const normalized = path.resolve(itemPath);
  if (!normalized.startsWith(BASE_DIR)) {
    return res.status(400).json({ error: 'invalid path' });
  }
  try {
    const stat = await fs.stat(normalized);
    if (stat.isDirectory()) {
      res.setHeader('Content-Disposition', `attachment; filename=${path.basename(normalized)}.zip`);
      res.setHeader('Content-Type', 'application/zip');
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.directory(normalized, false);
      archive.finalize();
      archive.pipe(res);
    } else {
      res.download(normalized);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
