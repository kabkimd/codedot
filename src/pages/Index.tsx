import { useState, useEffect } from 'react';
import { LoginForm } from '@/components/LoginForm';
import { FileManager } from '@/components/FileManager';

const Index = () => {
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('username');
    if (storedUser) {
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
  };

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return <FileManager username={user} onLogout={handleLogout} />;
};

export default Index;
