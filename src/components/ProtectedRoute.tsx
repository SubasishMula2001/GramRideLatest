import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'user' | 'driver')[];
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  redirectTo = '/login'
}) => {
  const { user, loading, userRole } = useAuth();
  const location = useLocation();
  const [roleLoadTimeout, setRoleLoadTimeout] = useState(false);

  // Add timeout for role loading (3 seconds)
  useEffect(() => {
    if (allowedRoles && user && userRole === null && !loading) {
      const timer = setTimeout(() => {
        console.warn('Role loading timeout - redirecting to home');
        setRoleLoadTimeout(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [allowedRoles, user, userRole, loading]);

  // Reset timeout when role is loaded
  useEffect(() => {
    if (userRole !== null) {
      setRoleLoadTimeout(false);
    }
  }, [userRole]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Wait for role to be fetched if allowedRoles is specified
  // But timeout after 3 seconds to prevent infinite loading
  if (allowedRoles && userRole === null && !roleLoadTimeout) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground ml-2">Loading your profile...</p>
      </div>
    );
  }

  // If role loading timed out, redirect to home
  if (allowedRoles && userRole === null && roleLoadTimeout) {
    console.error('Role not loaded - redirecting to home');
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    // Redirect to appropriate dashboard based on role
    if (userRole === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (userRole === 'driver') {
      return <Navigate to="/driver" replace />;
    } else {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
