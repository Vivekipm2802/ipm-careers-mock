import { useRouter } from 'next/router';
import { useAuth } from './useAuth';
import { useEffect } from 'react';

const RequireAuth = ({ children }) => {
  const user = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      /* router.push('/login');  */// Redirect to the login page
    }
  }, [user, router]);

  if (!user) {
    // You can show a loading indicator or some other UI while checking the user's session.
    return null;
  }

  return children;
};

export default RequireAuth;