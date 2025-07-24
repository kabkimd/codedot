const API_BASE = '/api';

export const authAPI = {
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

let token = '';
export function setToken(t: string) { token = t; }
export function getToken() { return token; }

export const fileAPI = {
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
