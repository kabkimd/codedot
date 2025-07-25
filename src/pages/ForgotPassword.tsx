import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { authAPI } from '@/lib/api';
import { Link } from 'react-router-dom';

const ForgotPassword = () => {
  const [identifier, setIdentifier] = useState('');
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authAPI.forgotPassword(identifier);
      setSent(true);
      toast({ title: 'If an account exists, a reset link was sent.' });
    } catch {
      toast({ title: 'Request failed', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-96 border">
        <CardHeader className="text-center">
          <CardTitle>Forgot Password</CardTitle>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-center">Check your email for a reset link.</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">Username or email</Label>
                <Input
                  id="identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Send reset link
              </Button>
            </form>
          )}
          <div className="pt-4 text-center">
            <Link to="/">Back to login</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
