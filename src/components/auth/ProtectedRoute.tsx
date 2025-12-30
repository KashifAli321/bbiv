import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, isFaceVerified, profile } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // If authenticated but no face registered, redirect to registration
  if (!profile?.face_descriptor_hash) {
    return <Navigate to="/face-register" replace />;
  }

  // If authenticated but face not verified this session, redirect to verification
  if (!isFaceVerified) {
    return <Navigate to="/face-verify" replace />;
  }

  return <>{children}</>;
}
