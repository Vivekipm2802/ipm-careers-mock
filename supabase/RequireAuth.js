import { useRouter } from 'next/router';
import { useAuth } from './useAuth';
import { useEffect } from 'react';

const RequireAuth = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect once loading is done and we know there's no user
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Show nothing while checking auth status
  if (loading) {
    return null;
  }

  // Not logged in — redirect is in progress
  if (!user) {
    return null;
  }

  return children;
};

export default RequireAuth;
