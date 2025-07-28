import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import formData from 'form-data';
import Mailgun from 'mailgun.js';

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET = process.env.JWT_SECRET || 'secret-key';

// Mailgun configuration
const MAILGUN_API_KEY = 'ea131543c94f96dea94ce2906788b3fb-03fd4b1a-984961b3';
const MAILGUN_DOMAIN = 'a-remedy-for-the-lost-words.kabkimd.nl';

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: MAILGUN_API_KEY,
  url: 'https://api.eu.mailgun.net' // Use EU endpoint
});

// Password reset tokens storage (in production, use Redis or database)
const passwordResetTokens = new Map();

// Users data and initialization
const USERS_PATH = path.resolve(process.cwd(), 'users.json');
let USERS = [];
let isServerReady = false;

async function initializeServer() {
  console.log('🚀 Starting server initialization...');
  
  try {
    // Load users from users.json
    console.log('📖 Loading users.json...');
    const usersData = await fs.readFile(USERS_PATH, 'utf8');
    USERS = JSON.parse(usersData);
    console.log(`✅ Loaded ${USERS.length} users from users.json`);
    
    // Ensure user directories exist
    console.log('📁 Checking user directories...');
    for (const user of USERS) {
      const userDirPath = userDir(user.username);
      try {
        await fs.access(userDirPath);
        console.log(`✅ User directory exists: ${user.username}`);
      } catch (e) {
        console.log(`📁 Creating user directory: ${user.username}`);
        await fs.mkdir(userDirPath, { recursive: true });
      }
    }
    
    isServerReady = true;
    console.log('🎉 Server initialization complete!');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize server:', error);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

function serverReadyMiddleware(req, res, next) {
  if (!isServerReady) {
    console.log('⚠️ Request received before server ready:', req.method, req.path);
    return res.status(503).json({ error: 'Server is still initializing, please try again in a moment' });
  }
  next();
}

function getUser(username) {
  return USERS.find((u) => u.username === username.toLowerCase());
}

async function saveUsers() {
  await fs.writeFile(USERS_PATH, JSON.stringify(USERS, null, 2));
}

app.use(cors());
app.use(express.json());
async function simpleAuth(username, password) {
  const user = USERS.find(u => u.username === username.toLowerCase());
  if (!user) return null;
  
  const isValid = await bcrypt.compare(password, user.password);
  return isValid ? user : null;
}

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

app.post('/api/auth/login', serverReadyMiddleware, async (req, res) => {
  try {
    const { username, password } = req.body || {};
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    const user = await simpleAuth(username, password);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Simple token (just username for this demo)
    const token = Buffer.from(username).toString('base64');
    res.json({ user: { username }, token });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
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
      newToken = Buffer.from(normalized).toString('base64');
    }
  }

  if (newPassword) {
    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password required' });
    }
    if (currentPassword !== user.password) {
      return res.status(400).json({ error: 'Current password incorrect' });
    }
    user.password = newPassword;
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
    // Simple decode (just base64 username for this demo)
    const token = auth.slice(7);
    const username = Buffer.from(token, 'base64').toString();
    if (!getUser(username)) {
      throw new Error('Invalid user');
    }
    req.user = username;
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

app.post('/api/upload', authMiddleware, async (req, res) => {
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
      // Simple zip not supported without archiver
      res.status(400).json({ error: 'Directory download not supported' });
    } else {
      res.download(normalized);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Password reset request endpoint
app.post('/api/auth/forgot-password', serverReadyMiddleware, async (req, res) => {
  try {
    const { email } = req.body || {};
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Find user by email
    const user = USERS.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({ message: 'If the email exists, a reset link has been sent' });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now
    
    // Store token (in production, store in database)
    passwordResetTokens.set(resetToken, {
      username: user.username,
      expiry: resetTokenExpiry
    });
    
    // Send email via Mailgun
    const resetUrl = `${req.headers.origin || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    
    try {
      await mg.messages.create(MAILGUN_DOMAIN, {
        from: 'Leo <a-remedy-for-the-lost-words@kabkimd.nl>',
        to: [email],
        subject: 'Password Reset Request',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>Hello ${user.full_name || user.username},</p>
            <p>You have requested to reset your password. Click the link below to create a new password:</p>
            <a href="${resetUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">Reset Password</a>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this password reset, please ignore this email.</p>
            <p>Best regards,<br>A Remedy for the Lost Words</p>
          </div>
        `
      });
      
      console.log(`✅ Password reset email sent to ${email}`);
    } catch (emailError) {
      console.error('❌ Failed to send email:', emailError);
      return res.status(500).json({ error: 'Failed to send reset email' });
    }
    
    res.json({ message: 'If the email exists, a reset link has been sent' });
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Password reset confirmation endpoint
app.post('/api/auth/reset-password', serverReadyMiddleware, async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    
    // Validate token
    const tokenData = passwordResetTokens.get(token);
    if (!tokenData) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    if (Date.now() > tokenData.expiry) {
      passwordResetTokens.delete(token);
      return res.status(400).json({ error: 'Reset token has expired' });
    }
    
    // Find user
    const user = getUser(tokenData.username);
    if (!user) {
      passwordResetTokens.delete(token);
      return res.status(400).json({ error: 'User not found' });
    }
    
    // Hash new password and update user
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    
    // Save users and cleanup token
    await saveUsers();
    passwordResetTokens.delete(token);
    
    console.log(`✅ Password reset successful for user: ${user.username}`);
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Initialize server and start listening
async function startServer() {
  const initialized = await initializeServer();
  
  if (!initialized) {
    console.error('❌ Server initialization failed, exiting...');
    process.exit(1);
  }
  
  app.listen(PORT, () => {
    console.log(`🌟 Server ready and listening on http://localhost:${PORT}`);
    console.log(`📊 Total users loaded: ${USERS.length}`);
    console.log(`🔑 Using JWT secret: ${SECRET.slice(0, 10)}...`);
  });
}

startServer().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
