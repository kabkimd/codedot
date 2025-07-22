import { useState } from 'react';
import { LoginForm } from '@/components/LoginForm';
import { FileManager } from '@/components/FileManager';

const Index = () => {
  const [user, setUser] = useState<string | null>(null);

  const handleLogin = (username: string) => {
    setUser(username);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return <FileManager username={user} onLogout={handleLogout} />;
};

export default Index;
