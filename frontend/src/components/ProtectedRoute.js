import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Wraps any page that should only be visible to logged-in users.
// If the auth state is still loading, show nothing (avoids a flash of redirect).
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-text">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
