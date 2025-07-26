import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { authAPI, setToken } from '@/lib/api';

interface LoginFormProps {
  onLogin: (username: string) => void;
}

export const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignupMode, setIsSignupMode] = useState(false);
  const { toast } = useToast();


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignupMode) {
        // For signup, we need to import the supabase API directly
        const { supabaseAuthAPI } = await import('@/lib/api-supabase');
        await supabaseAuthAPI.register(username, password);
        toast({
          title: 'Account created successfully',
          description: 'Please check your email for verification (or try logging in if email confirmation is disabled)',
        });
        setIsSignupMode(false);
      } else {
        const data = await authAPI.login(username, password);
        setToken(data.token);
        onLogin(data.user.username);
        toast({
          title: 'Login successful',
          description: `Welcome back, ${data.user.username}!`,
        });
      }
    } catch (e) {
      toast({
        title: isSignupMode ? 'Signup failed' : 'Login failed',
        description: isSignupMode ? 'Failed to create account' : 'Invalid username or password',
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-96 border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{isSignupMode ? 'Create Account' : 'File Manager'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{isSignupMode ? 'Email' : 'Username/Email'}</Label>
              <Input
                id="username"
                type={isSignupMode ? "email" : "text"}
                value={username}
                onChange={(e) => setUsername(isSignupMode ? e.target.value : e.target.value.toLowerCase())}
                required
                className="border"
                placeholder={isSignupMode ? "your@email.com" : "username or email"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (isSignupMode ? 'Creating Account...' : 'Logging in...') : (isSignupMode ? 'Create Account' : 'Login')}
            </Button>
            <Button 
              type="button" 
              variant="outline"
              className="w-full" 
              onClick={() => setIsSignupMode(!isSignupMode)}
            >
              {isSignupMode ? 'Already have an account? Login' : 'Need an account? Sign up'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};