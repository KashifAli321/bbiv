import { useState, useEffect, useCallback } from 'react';
import { FileCheck, Shield, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/contexts/WalletContext';
import { useAuth } from '@/contexts/AuthContext';
import { FaceRecognition } from './FaceRecognition';
import { addTransaction } from '@/components/wallet/TransactionHistory';
import { getIssuerStatus, isAuthorizedIssuer } from '@/lib/issuer-config';
import { signAndIssueCredential, getExistingFaceHashes } from '@/lib/credential-storage';
import { supabase } from '@/integrations/supabase/client';
import { ethers } from 'ethers';

export function CredentialIssuer() {
  const { address, network, signWithWallet, isConnected } = useWallet();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [issuedSuccessfully, setIssuedSuccessfully] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);
  const [capturedFaceDescriptor, setCapturedFaceDescriptor] = useState<number[] | null>(null);
  const [showFaceCapture, setShowFaceCapture] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [issuerStatus, setIssuerStatus] = useState<{ authorized: boolean; message: string }>({
    authorized: false,
    message: 'Checking authorization...'
  });
  const [existingFaceHashes, setExistingFaceHashes] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    citizenAddress: '',
    fullName: '',
    dateOfBirth: '',
    nationalId: '',
    expiryDate: '',
  });

  // Check issuer authorization on mount and when user changes
  useEffect(() => {
    const checkAuthorization = async () => {
      const status = await getIssuerStatus();
      setIssuerStatus(status);
    };
    checkAuthorization();
  }, [user]);

  // Load existing face hashes for duplicate detection
  useEffect(() => {
    const loadFaceHashes = async () => {
      if (issuerStatus.authorized) {
        const hashes = await getExistingFaceHashes();
        setExistingFaceHashes(hashes);
      }
    };
    loadFaceHashes();
  }, [issuerStatus.authorized]);

  const handleFaceVerified = (verified: boolean, faceDescriptor?: number[]) => {
    setFaceVerified(verified);
    if (faceDescriptor) {
      setCapturedFaceDescriptor(faceDescriptor);
    }
  };

  // Look up citizen user ID by wallet address using database function (bypasses RLS)
  const findCitizenUserId = async (citizenAddress: string): Promise<string | null> => {
    const { data, error } = await supabase.rpc('get_user_id_by_wallet', {
      _wallet_address: citizenAddress
    });
    
    if (error || !data) {
      return null;
    }
    
    return data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !address) {
      toast({
        title: 'Wallet Required',
        description: 'Please connect your wallet first',
        variant: 'destructive',
      });
      return;
    }

    const isAuthorized = await isAuthorizedIssuer();
    if (!isAuthorized) {
      toast({
        title: 'Not Authorized',
        description: 'You are not authorized to issue credentials',
        variant: 'destructive',
      });
      return;
    }

    if (!faceVerified) {
      toast({
        title: 'Face Verification Required',
        description: 'Please complete face verification before issuing credentials',
        variant: 'destructive',
      });
      setShowFaceCapture(true);
      return;
    }

    // Validate Ethereum address
    if (!ethers.isAddress(formData.citizenAddress)) {
      toast({
        title: 'Invalid Address',
        description: 'Please enter a valid Ethereum address',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.citizenAddress || !formData.fullName || !formData.nationalId) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    // Find the citizen's user ID
    const citizenUserId = await findCitizenUserId(formData.citizenAddress);
    if (!citizenUserId) {
      toast({
        title: 'Citizen Not Found',
        description: 'No user found with this wallet address. The citizen must register and link their wallet first.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setIssuedSuccessfully(false);

    try {
      // Use secure signing - private key is decrypted only for this operation
      const signResult = await signWithWallet(async (privateKey) => {
        return await signAndIssueCredential(
          privateKey,
          formData.citizenAddress,
          citizenUserId,
          {
            fullName: formData.fullName,
            dateOfBirth: formData.dateOfBirth,
            nationalId: formData.nationalId,
            expiryDate: formData.expiryDate,
            faceDescriptor: capturedFaceDescriptor || undefined,
          }
        );
      });

      const result = signResult.success ? signResult.result : null;

      if (result?.success && result.credential) {
        setIssuedSuccessfully(true);
        
        // Add to transaction history with blockchain tx hash
        addTransaction({
          type: 'issue',
          txHash: result.credential.txHash || result.credential.credentialHash.slice(0, 66),
          from: address,
          to: formData.citizenAddress,
          status: 'confirmed',
          network: 'sepolia',
          description: `Issued credential to ${formData.fullName}`,
        });

        toast({
          title: 'Credential Issued!',
          description: `Credential stored on blockchain and database. TX: ${result.credential.txHash?.slice(0, 10)}...`,
        });

        // Reset form
        setFormData({
          citizenAddress: '',
          fullName: '',
          dateOfBirth: '',
          nationalId: '',
          expiryDate: '',
        });
        setFaceVerified(false);
        setCapturedFaceDescriptor(null);
        setShowFaceCapture(false);
      } else {
        toast({
          title: 'Issuance Failed',
          description: signResult.error || result?.error || 'Failed to issue credential',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Issuer Status */}
      <Card className="border-border bg-card">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                issuerStatus.authorized ? 'bg-green-500/20' : 'bg-yellow-500/20'
              }`}>
                {issuerStatus.authorized ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                )}
              </div>
              <div>
                <p className="font-medium">Issuer Status</p>
                <p className="text-sm text-muted-foreground">{issuerStatus.message}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {issuerStatus.authorized && (
                <Badge variant="default" className="bg-primary">Admin</Badge>
              )}
              <Badge variant={issuerStatus.authorized ? 'default' : 'secondary'}>
                {issuerStatus.authorized ? 'Authorized' : 'Not Authorized'}
              </Badge>
            </div>
          </div>
          
          {!issuerStatus.authorized && user && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <div className="flex items-center gap-2 text-destructive">
                <Lock className="w-4 h-4" />
                <span className="text-sm font-medium">Access Restricted</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Only administrators can issue credentials
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Face Verification Section */}
      {showFaceCapture && !faceVerified && (
        <FaceRecognition 
          onVerified={handleFaceVerified}
          isRequired={true}
          mode="capture"
          checkDuplicate={true}
          existingFaceHashes={existingFaceHashes}
        />
      )}

      <Card className="border-border bg-card border-glow">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center">
              <FileCheck className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle>Issue Credential</CardTitle>
              <CardDescription>Issue a verifiable identity credential with digital signature</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!isConnected ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
              <p className="text-muted-foreground mb-4">
                You need to connect your wallet to issue credentials
              </p>
              <Button onClick={() => window.location.href = '/wallet'}>
                Connect Wallet
              </Button>
            </div>
          ) : !issuerStatus.authorized ? (
            <Alert variant="destructive">
              <Lock className="h-4 w-4" />
              <AlertTitle>Access Restricted</AlertTitle>
              <AlertDescription>
                Only administrators can issue credentials. Contact your administrator for access.
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Face Verification Status */}
              <div className="p-4 rounded-lg border border-border bg-secondary/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Face Verification</p>
                    <p className="text-xs text-muted-foreground">
                      {faceVerified ? 'Verified - Ready to issue' : 'Required before issuing'}
                    </p>
                  </div>
                  {faceVerified ? (
                    <div className="flex items-center gap-2 text-green-400">
                      <Shield className="w-5 h-5" />
                      <span className="text-sm font-medium">Verified</span>
                    </div>
                  ) : (
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowFaceCapture(true)}
                    >
                      Verify Face
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="citizenAddress">Citizen Wallet Address *</Label>
                <Input
                  id="citizenAddress"
                  placeholder="0x..."
                  value={formData.citizenAddress}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({ ...formData, citizenAddress: value });
                    if (value && !ethers.isAddress(value)) {
                      setAddressError('Invalid Ethereum address format');
                    } else {
                      setAddressError(null);
                    }
                  }}
                  className={`font-mono bg-secondary ${addressError ? 'border-destructive' : ''}`}
                />
                {addressError && (
                  <p className="text-xs text-destructive">{addressError}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="bg-secondary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nationalId">National ID *</Label>
                  <Input
                    id="nationalId"
                    placeholder="ID-123456789"
                    value={formData.nationalId}
                    onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                    className="bg-secondary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="bg-secondary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="bg-secondary"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full gradient-primary text-primary-foreground"
                disabled={isLoading || !faceVerified}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Issuing Credential...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Issue Credential
                  </>
                )}
              </Button>

              {issuedSuccessfully && (
                <Alert className="border-green-500/30 bg-green-500/10">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertTitle className="text-green-500">Credential Issued Successfully!</AlertTitle>
                  <AlertDescription>
                    The credential has been signed and stored securely in the database.
                    The user can now view their credential on the User page.
                  </AlertDescription>
                </Alert>
              )}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
