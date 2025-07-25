import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { userAPI } from '@/lib/api';

interface ProfileData {
  username: string;
  full_name: string;
  isPublic: boolean;
}

const Profile = () => {
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    userAPI
      .getCurrent()
      .then(setProfile)
      .catch((err) => console.error('Failed to load profile', err));
  }, []);

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-96 border">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>
            <span className="font-medium">Username:</span> {profile.username}
          </p>
          <p>
            <span className="font-medium">Display name:</span> {profile.full_name}
          </p>
          <p>
            <span className="font-medium">Visibility:</span>{' '}
            {profile.isPublic ? 'Public' : 'Private'}
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/">Back</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
