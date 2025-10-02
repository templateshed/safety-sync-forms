import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export const ProtectedRoute = ({ children, requireAuth = true }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If route requires auth but user is not logged in
  if (requireAuth && !user) {
    // Save the location they were trying to access
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // If route is for non-authenticated users only (like landing page) but user is logged in
  if (!requireAuth && user) {
    // Redirect to dashboard if they're already logged in
    return <Navigate to="/dashboard/overview" replace />;
  }

  // User has correct auth state for this route
  return <>{children}</>;
};
