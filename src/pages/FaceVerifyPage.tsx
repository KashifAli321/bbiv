import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FaceRecognition } from '@/components/credentials/FaceRecognition';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function FaceVerifyPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    isAuthenticated, 
    isLoading: authLoading, 
    profile, 
    isFaceVerified, 
    verifyFace, 
    setFaceVerified,
    signOut 
  } = useAuth();

  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Redirect if already face verified
  useEffect(() => {
    if (isFaceVerified) {
      navigate('/');
    }
  }, [isFaceVerified, navigate]);

  // Check if user has registered a face
  useEffect(() => {
    if (!authLoading && profile && !profile.face_descriptor_hash) {
      // User hasn't registered a face yet, redirect to register
      navigate('/face-register');
    }
  }, [profile, authLoading, navigate]);

  const handleFaceVerified = async (verified: boolean, faceDescriptor?: number[]) => {
    if (!verified || !faceDescriptor) {
      setError('Face capture failed. Please try again.');
      setShowCamera(false);
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      // Pass the face descriptor array directly for Euclidean distance comparison
      const result = await verifyFace(faceDescriptor);

      if (result.success) {
        toast({
          title: 'Face Verified!',
          description: 'Welcome back! You now have full access.',
        });
        navigate('/');
      } else {
        setError(result.error || 'Face verification failed. Please try again.');
        setShowCamera(false);
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
      setShowCamera(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-primary">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-center mb-2">Face Verification</h1>
        <p className="text-center text-muted-foreground mb-8">
          Verify your identity to access your account
        </p>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Biometric Verification
            </CardTitle>
            <CardDescription>
              Look at the camera to verify your identity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showCamera ? (
              <div className="space-y-4">
                <FaceRecognition
                  onVerified={handleFaceVerified}
                  requireLiveness={true}
                  mode="verify"
                  checkDuplicate={false}
                />
                {isVerifying && (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying your face...
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-32 h-32 mx-auto rounded-full bg-muted flex items-center justify-center">
                  <Shield className="w-16 h-16 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  Click the button below to start face verification
                </p>
                <Button 
                  onClick={() => setShowCamera(true)}
                  className="gradient-primary text-primary-foreground"
                >
                  Start Verification
                </Button>
              </div>
            )}

            <div className="pt-4 border-t border-border">
              <Button 
                variant="ghost" 
                className="w-full text-muted-foreground"
                onClick={handleLogout}
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
