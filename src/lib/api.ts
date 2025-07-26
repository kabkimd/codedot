import { isLovableEnvironment } from './environment';
import { supabaseAuthAPI, supabaseUserAPI, supabaseFileAPI } from './api-supabase';

const API_BASE = '/api';

// Express API (for local development)
const expressAuthAPI = {
  login: async (username: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error('Login failed');
    return res.json();
  }
};

// Environment-aware API
export const authAPI = {
  login: async (username: string, password: string) => {
    if (isLovableEnvironment()) {
      return supabaseAuthAPI.login(username, password);
    } else {
      return expressAuthAPI.login(username, password);
    }
  }
};

// Express user API (for local development)
const expressUserAPI = {
  getCurrent: async () => {
    const res = await fetch(`${API_BASE}/user`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to load user');
    return res.json();
  },
  update: async (data: Record<string, unknown>) => {
    const res = await fetch(`${API_BASE}/user`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return res.json();
  }
};

export const userAPI = {
  getCurrent: async () => {
    if (isLovableEnvironment()) {
      return supabaseUserAPI.getCurrent();
    } else {
      return expressUserAPI.getCurrent();
    }
  },
  update: async (data: Record<string, unknown>) => {
    if (isLovableEnvironment()) {
      return supabaseUserAPI.update(data);
    } else {
      return expressUserAPI.update(data);
    }
  }
};

let token = '';

// Load token from localStorage on module initialization
if (typeof localStorage !== 'undefined') {
  const stored = localStorage.getItem('token');
  if (stored) token = stored;
}

export function setToken(t: string) {
  token = t;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('token', t);
  }
}
export function getToken() { return token; }
export function clearToken() {
  token = '';
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('token');
  }
}

// Express file API (for local development)
const expressFileAPI = {
  getTree: async () => {
    const res = await fetch(`${API_BASE}/tree`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.json();
  },
  getUsage: async () => {
    const res = await fetch(`${API_BASE}/usage`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to get usage');
    return res.json();
  },
  getFile: async (path: string) => {
    const res = await fetch(`${API_BASE}/file?path=${encodeURIComponent(path)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to load file');
    return res.text();
  },
  saveFile: async (path: string, content: string) => {
    const res = await fetch(`${API_BASE}/file`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ path, content })
    });
    if (!res.ok) throw new Error('Failed to save file');
    return res.json();
  },
  createFile: async (parent: string, name: string) => {
    const res = await fetch(`${API_BASE}/file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ parent, name, isDirectory: false })
    });
    if (!res.ok) throw new Error('Failed to create file');
    return res.json();
  },
  createFolder: async (parent: string, name: string) => {
    const res = await fetch(`${API_BASE}/file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ parent, name, isDirectory: true })
    });
    if (!res.ok) throw new Error('Failed to create folder');
    return res.json();
  },
  deleteItem: async (path: string) => {
    const res = await fetch(`${API_BASE}/file?path=${encodeURIComponent(path)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to delete');
    return res.json();
  },
  renameItem: async (path: string, newName: string) => {
    const res = await fetch(`${API_BASE}/file`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ path, newName })
    });
    if (!res.ok) throw new Error('Failed to rename');
    return res.json();
  },
  uploadFiles: async (parent: string, files: FileList) => {
    const form = new FormData();
    form.append('parent', parent);
    Array.from(files).forEach((f) => form.append('files', f));
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form
    });
    if (!res.ok) throw new Error('Failed to upload files');
    return res.json();

  },
  moveItem: async (path: string, target: string) => {
    const res = await fetch(`${API_BASE}/move`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ path, target })
    });
    if (!res.ok) throw new Error('Failed to move item');
    return res.json();
  },
  downloadItem: async (path: string) => {
    const res = await fetch(`${API_BASE}/download?path=${encodeURIComponent(path)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to download');
    return res.blob();
  }
};

export const fileAPI = {
  getTree: async () => {
    if (isLovableEnvironment()) {
      return supabaseFileAPI.getTree();
    } else {
      return expressFileAPI.getTree();
    }
  },
  getUsage: async () => {
    if (isLovableEnvironment()) {
      return supabaseFileAPI.getUsage();
    } else {
      return expressFileAPI.getUsage();
    }
  },
  getFile: async (path: string) => {
    if (isLovableEnvironment()) {
      return supabaseFileAPI.getFile(path);
    } else {
      return expressFileAPI.getFile(path);
    }
  },
  saveFile: async (path: string, content: string) => {
    if (isLovableEnvironment()) {
      return supabaseFileAPI.saveFile(path, content);
    } else {
      return expressFileAPI.saveFile(path, content);
    }
  },
  createFile: async (parent: string, name: string) => {
    if (isLovableEnvironment()) {
      return supabaseFileAPI.createFile(parent, name);
    } else {
      return expressFileAPI.createFile(parent, name);
    }
  },
  createFolder: async (parent: string, name: string) => {
    if (isLovableEnvironment()) {
      return supabaseFileAPI.createFolder(parent, name);
    } else {
      return expressFileAPI.createFolder(parent, name);
    }
  },
  deleteItem: async (path: string) => {
    if (isLovableEnvironment()) {
      return supabaseFileAPI.deleteItem(path);
    } else {
      return expressFileAPI.deleteItem(path);
    }
  },
  renameItem: async (path: string, newName: string) => {
    if (isLovableEnvironment()) {
      return supabaseFileAPI.renameItem(path, newName);
    } else {
      return expressFileAPI.renameItem(path, newName);
    }
  },
  uploadFiles: async (parent: string, files: FileList) => {
    if (isLovableEnvironment()) {
      return supabaseFileAPI.uploadFiles(parent, files);
    } else {
      return expressFileAPI.uploadFiles(parent, files);
    }
  },
  moveItem: async (path: string, target: string) => {
    if (isLovableEnvironment()) {
      return supabaseFileAPI.moveItem(path, target);
    } else {
      return expressFileAPI.moveItem(path, target);
    }
  },
  downloadItem: async (path: string) => {
    if (isLovableEnvironment()) {
      return supabaseFileAPI.downloadItem(path);
    } else {
      return expressFileAPI.downloadItem(path);
    }
  }
};
