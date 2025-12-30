import { useState, useMemo } from 'react';
import { FileCheck, Shield, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/contexts/WalletContext';
import { FaceRecognition } from './FaceRecognition';
import { addTransaction } from '@/components/wallet/TransactionHistory';
import { isAuthorizedIssuer, getIssuerStatus, OWNER_ISSUER_ADDRESS } from '@/lib/issuer-config';
import { signAndIssueCredential, getStoredCredentials } from '@/lib/credential-storage';

export function CredentialIssuer() {
  const { privateKey, address, network } = useWallet();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [issuedSuccessfully, setIssuedSuccessfully] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);
  const [capturedFaceDescriptor, setCapturedFaceDescriptor] = useState<number[] | null>(null);
  const [capturedFaceImage, setCapturedFaceImage] = useState<string | null>(null);
  const [showFaceCapture, setShowFaceCapture] = useState(false);
  
  const [formData, setFormData] = useState({
    citizenAddress: '',
    fullName: '',
    dateOfBirth: '',
    nationalId: '',
    expiryDate: '',
  });

  const issuerStatus = address ? getIssuerStatus(address) : { authorized: false, message: 'Connect wallet' };
  const isOwner = address?.toLowerCase() === OWNER_ISSUER_ADDRESS.toLowerCase();

  // Get all existing face descriptors for duplicate detection
  const existingFaceDescriptors = useMemo(() => {
    const credentials = getStoredCredentials();
    return credentials
      .filter(c => c.faceDescriptor && c.faceDescriptor.length > 0)
      .map(c => c.faceDescriptor as number[]);
  }, []);

  const handleFaceVerified = (verified: boolean, faceDescriptor?: number[], faceImage?: string) => {
    setFaceVerified(verified);
    if (faceDescriptor) {
      setCapturedFaceDescriptor(faceDescriptor);
    }
    if (faceImage) {
      setCapturedFaceImage(faceImage);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!privateKey || !address) {
      toast({
        title: 'Wallet Required',
        description: 'Please connect your wallet first',
        variant: 'destructive',
      });
      return;
    }

    if (!isAuthorizedIssuer(address)) {
      toast({
        title: 'Not Authorized',
        description: 'You need to deploy your own contract to become an issuer',
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

    if (!formData.citizenAddress || !formData.fullName || !formData.nationalId) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setIssuedSuccessfully(false);

    try {
      const result = await signAndIssueCredential(
        privateKey,
        formData.citizenAddress,
        {
          fullName: formData.fullName,
          dateOfBirth: formData.dateOfBirth,
          nationalId: formData.nationalId,
          expiryDate: formData.expiryDate,
          faceDescriptor: capturedFaceDescriptor || undefined,
          faceImage: capturedFaceImage || undefined,
        }
      );

      if (result.success && result.credential) {
        setIssuedSuccessfully(true);
        
        // Add to transaction history
        addTransaction({
          type: 'issue',
          txHash: result.credential.credentialHash.slice(0, 66),
          from: address,
          to: formData.citizenAddress,
          status: 'confirmed',
          network: network.id,
          description: `Issued credential to ${formData.fullName}`,
        });

        toast({
          title: 'Credential Issued!',
          description: 'The credential has been signed and stored securely',
        });

        // Reset form
        setFormData({
          citizenAddress: '',
          fullName: '',
          dateOfBirth: '',
          nationalId: '',
          expiryDate: '',
        });
      } else {
        toast({
          title: 'Issuance Failed',
          description: result.error || 'Failed to issue credential',
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
              {isOwner && (
                <Badge variant="default" className="bg-primary">Owner</Badge>
              )}
              <Badge variant={issuerStatus.authorized ? 'default' : 'secondary'}>
                {issuerStatus.authorized ? 'Authorized' : 'Not Authorized'}
              </Badge>
            </div>
          </div>
          
          {!issuerStatus.authorized && address && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <div className="flex items-center gap-2 text-destructive">
                <Lock className="w-4 h-4" />
                <span className="text-sm font-medium">Access Restricted</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Only the project owner can issue credentials
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
          existingDescriptors={existingFaceDescriptors}
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
          {!privateKey ? (
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
                Only the project owner can issue credentials. This wallet is not authorized to issue credentials.
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
                  onChange={(e) => setFormData({ ...formData, citizenAddress: e.target.value })}
                  className="font-mono bg-secondary"
                />
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
                    The credential has been signed with your private key and stored securely.
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