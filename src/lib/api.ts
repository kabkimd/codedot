const API_BASE = '/api';

let token: string | null = localStorage.getItem('token');

export const getToken = () => token;
export const setToken = (t: string) => {
  token = t;
  localStorage.setItem('token', t);
};
export const clearToken = () => {
  token = null;
  localStorage.removeItem('token');
};

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

export const authAPI = {
  login: async (username: string, password: string) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      throw new Error('Login failed');
    }
    const data = await response.json();
    if (data.token) {
      setToken(data.token);
      localStorage.setItem('username', username);
    }
    return data;
  },
  logout: async () => {
    if (!getToken()) return;
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: authHeaders(),
    });
    clearToken();
    localStorage.removeItem('username');
  },
};

export const fileAPI = {
  getTree: async (username: string) => {
    const res = await fetch(`${API_BASE}/files/${username}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch file tree');
    return res.json();
  },
  getFile: async (path: string) => {
    const res = await fetch(`${API_BASE}/files${path}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch file');
    return res.json();
  },
  saveFile: async (path: string, content: string) => {
    const res = await fetch(`${API_BASE}/files${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error('Failed to save file');
    return res.json();
  },
  createFile: async (path: string) => {
    const res = await fetch(`${API_BASE}/files${path}`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to create file');
    return res.json();
  },
  createFolder: async (path: string) => {
    const res = await fetch(`${API_BASE}/files${path}`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to create folder');
    return res.json();
  },
  delete: async (path: string) => {
    const res = await fetch(`${API_BASE}/files${path}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete');
    return res.json();
  },
  rename: async (path: string, newName: string) => {
    const res = await fetch(`${API_BASE}/files${path}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({ name: newName }),
    });
    if (!res.ok) throw new Error('Failed to rename');
    return res.json();
  },
  upload: async (path: string, files: FileList) => {
    const form = new FormData();
    Array.from(files).forEach((f) => form.append('files', f));
    const res = await fetch(`${API_BASE}/files${path}`, {
      method: 'POST',
      headers: authHeaders(),
      body: form,
    });
    if (!res.ok) throw new Error('Failed to upload');
    return res.json();
  },
};
