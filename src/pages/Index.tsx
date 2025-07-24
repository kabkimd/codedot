import { useState, useEffect } from 'react';
import { LoginForm } from '@/components/LoginForm';
import { FileManager } from '@/components/FileManager';
import { setToken, clearToken } from '@/lib/api';

const Index = () => {
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('username');
    const storedToken = localStorage.getItem('token');
    if (storedUser && storedToken) {
      setToken(storedToken);
      setUser(storedUser);
    }
  }, []);

  const handleLogin = (username: string) => {
    setUser(username);
    localStorage.setItem('username', username);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('username');
    clearToken();
  };

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return <FileManager username={user} onLogout={handleLogout} />;
};

export default Index;
