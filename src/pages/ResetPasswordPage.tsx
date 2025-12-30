import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Shield, Lock, Eye, EyeOff, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FaceRecognition } from '@/components/credentials/FaceRecognition';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ethers } from 'ethers';

const passwordSchema = z.string().min(8, 'Password must be at least 8 characters').max(128);

function hashFaceDescriptor(descriptor: number[]): string {
  const descriptorString = descriptor.join(',');
  return ethers.keccak256(ethers.toUtf8Bytes(descriptorString));
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { updatePassword, isAuthenticated, isLoading: authLoading, profile, verifyFace } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Face verification state
  const [isFaceVerified, setIsFaceVerified] = useState(false);
  const [faceError, setFaceError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isVerifyingFace, setIsVerifyingFace] = useState(false);

  // User should be authenticated via the magic link
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: 'Session Expired',
        description: 'Please request a new password reset link.',
        variant: 'destructive'
      });
      navigate('/auth');
    }
  }, [isAuthenticated, authLoading, navigate, toast]);

  const handleFaceVerified = async (verified: boolean, faceDescriptor?: number[]) => {
    if (!verified || !faceDescriptor) {
      setFaceError('Face capture failed. Please try again.');
      setShowCamera(false);
      return;
    }

    setIsVerifyingFace(true);
    setFaceError(null);

    try {
      const faceHash = hashFaceDescriptor(faceDescriptor);
      
      // Check if the face matches the registered face
      if (profile?.face_descriptor_hash) {
        if (profile.face_descriptor_hash === faceHash) {
          setIsFaceVerified(true);
          toast({
            title: 'Face Verified!',
            description: 'You can now set your new password.',
          });
        } else {
          setFaceError('Face does not match. Only the account owner can reset the password.');
          setShowCamera(false);
        }
      } else {
        setFaceError('No face registered for this account. Please contact support.');
        setShowCamera(false);
      }
    } catch (err: any) {
      setFaceError(err.message || 'Verification failed. Please try again.');
      setShowCamera(false);
    } finally {
      setIsVerifyingFace(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFaceVerified) {
      toast({
        title: 'Face Verification Required',
        description: 'Please verify your face before changing your password.',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);

    try {
      passwordSchema.parse(password);

      if (password !== confirmPassword) {
        toast({
          title: 'Password Mismatch',
          description: 'Passwords do not match. Please try again.',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      const { error } = await updatePassword(password);

      if (error) {
        toast({
          title: 'Update Failed',
          description: error.message,
          variant: 'destructive'
        });
      } else {
        setSuccess(true);
        toast({
          title: 'Password Updated!',
          description: 'Your password has been successfully changed.',
        });
        
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive'
        });
      }
    } finally {
      setIsLoading(false);
    }
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
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-primary">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-center mb-2">Reset Password</h1>
        <p className="text-center text-muted-foreground mb-8">
          Verify your identity and set a new password
        </p>

        {success ? (
          <Card className="border-border bg-card">
            <CardContent className="pt-6 text-center py-12">
              <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h2 className="text-xl font-medium mb-2">Password Updated!</h2>
              <p className="text-muted-foreground mb-4">
                Redirecting you to the dashboard...
              </p>
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
            </CardContent>
          </Card>
        ) : !isFaceVerified ? (
          // Step 1: Face Verification
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Step 1: Verify Your Identity
              </CardTitle>
              <CardDescription>
                For security, you must verify your face before resetting your password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {faceError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{faceError}</AlertDescription>
                </Alert>
              )}

              {showCamera ? (
                <div className="space-y-4">
                  <FaceRecognition
                    onVerified={handleFaceVerified}
                    mode="verify"
                    checkDuplicate={false}
                  />
                  {isVerifyingFace && (
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
                    Click the button below to verify your identity
                  </p>
                  <Button 
                    onClick={() => setShowCamera(true)}
                    className="gradient-primary text-primary-foreground"
                  >
                    Start Face Verification
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          // Step 2: Set New Password
          <Card className="border-border bg-card">
            <CardHeader>
              <div className="flex items-center gap-2 text-green-500 text-sm mb-2">
                <CheckCircle className="w-4 h-4" />
                Face Verified
              </div>
              <CardTitle>Step 2: Set New Password</CardTitle>
              <CardDescription>
                Choose a strong password with at least 8 characters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-8 w-8 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full gradient-primary text-primary-foreground"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
