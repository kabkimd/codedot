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
  getFile: async (path: string) => {
    const res = await fetch(`${API_BASE}/file?path=${encodeURIComponent(path)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to load file');
    return res.text();
  }
};
