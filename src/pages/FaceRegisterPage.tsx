import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FaceRecognition } from '@/components/credentials/FaceRecognition';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ethers } from 'ethers';

function hashFaceDescriptor(descriptor: number[]): string {
  const descriptorString = descriptor.join(',');
  return ethers.keccak256(ethers.toUtf8Bytes(descriptorString));
}

export default function FaceRegisterPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    isAuthenticated, 
    isLoading: authLoading, 
    profile, 
    updateProfile,
    checkFaceSimilarity,
    setFaceVerified,
    signOut 
  } = useAuth();

  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [success, setSuccess] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Redirect if already has face registered
  useEffect(() => {
    if (!authLoading && profile?.face_descriptor_hash) {
      navigate('/face-verify');
    }
  }, [profile, authLoading, navigate]);

  const handleFaceVerified = async (verified: boolean, faceDescriptor?: number[]) => {
    if (!verified || !faceDescriptor) {
      setError('Face capture failed. Please try again.');
      setShowCamera(false);
      return;
    }

    setIsRegistering(true);
    setError(null);

    try {
      const faceHash = hashFaceDescriptor(faceDescriptor);
      console.log('Face hash generated:', faceHash.slice(0, 20) + '...');
      console.log('Face descriptor length:', faceDescriptor.length);

      // Check if a similar face is already registered using Euclidean distance
      console.log('Checking face similarity...');
      const similarFaceExists = await checkFaceSimilarity(faceDescriptor);
      console.log('Similar face exists:', similarFaceExists);
      
      if (similarFaceExists) {
        setError('A similar face is already registered with another account. Multi-account registration is not allowed.');
        setShowCamera(false);
        setIsRegistering(false);
        return;
      }

      // Update profile with both face hash and descriptor for future similarity checks
      console.log('Updating profile with face data...');
      const { error: updateError } = await updateProfile({
        face_descriptor_hash: faceHash,
        face_descriptor: faceDescriptor
      } as any);

      console.log('Update result - error:', updateError);

      if (updateError) {
        setError(updateError.message || 'Failed to register face. Please try again.');
        setShowCamera(false);
      } else {
        setSuccess(true);
        setFaceVerified(true);
        toast({
          title: 'Face Registered!',
          description: 'Your biometric identity has been securely stored.',
        });
        
        // Redirect after a short delay
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
      setShowCamera(false);
    } finally {
      setIsRegistering(false);
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
        <h1 className="text-3xl font-bold text-center mb-2">Register Your Face</h1>
        <p className="text-center text-muted-foreground mb-8">
          Set up biometric verification for secure access
        </p>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success ? (
          <Card className="border-border bg-card">
            <CardContent className="pt-6 text-center py-12">
              <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h2 className="text-xl font-medium mb-2">Face Registered Successfully!</h2>
              <p className="text-muted-foreground mb-4">
                Redirecting you to the dashboard...
              </p>
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Biometric Registration
              </CardTitle>
              <CardDescription>
                Your face data is securely hashed and stored. The original image is never saved.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {showCamera ? (
                <div className="space-y-4">
                  <FaceRecognition
                    onVerified={handleFaceVerified}
                    requireLiveness={true}
                    mode="register"
                    checkDuplicate={true}
                  />
                  {isRegistering && (
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Registering your face...
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="w-32 h-32 mx-auto rounded-full bg-muted flex items-center justify-center">
                    <Shield className="w-16 h-16 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-muted-foreground">
                      Click the button below to start face registration
                    </p>
                    <p className="text-sm text-warning">
                      ⚠️ Each face can only be registered once. Multi-account registration is prohibited.
                    </p>
                  </div>
                  <Button 
                    onClick={() => setShowCamera(true)}
                    className="gradient-primary text-primary-foreground"
                  >
                    Start Registration
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
        )}
      </div>
    </div>
  );
}
