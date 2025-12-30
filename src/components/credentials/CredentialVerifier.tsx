import { useState } from 'react';
import { Search, CheckCircle, XCircle, AlertTriangle, User, Calendar, CreditCard } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/contexts/WalletContext';
import { QRCodeButton } from '@/components/wallet/QRCodeDisplay';
import { addTransaction } from '@/components/wallet/TransactionHistory';
import { verifyCredentialForCitizen, StoredCredential } from '@/lib/credential-storage';

type VerificationResult = 'pending' | 'valid' | 'invalid' | 'expired' | 'error';

export function CredentialVerifier() {
  const { network, address } = useWallet();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult>('pending');
  const [credential, setCredential] = useState<StoredCredential | null>(null);
  const [citizenAddress, setCitizenAddress] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!citizenAddress) {
      toast({
        title: 'Address Required',
        description: 'Please enter the citizen wallet address',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setVerificationResult('pending');
    setCredential(null);

    try {
      const result = await verifyCredentialForCitizen(citizenAddress);
      
      if (result.isValid && result.credential) {
        setVerificationResult('valid');
        setCredential(result.credential);
        
        // Add to transaction history
        if (address) {
          addTransaction({
            type: 'verify',
            txHash: `verify-${Date.now()}`,
            from: address,
            to: citizenAddress,
            status: 'confirmed',
            network: network.id,
            description: `Verified credential for ${result.credential.fullName}`,
          });
        }

        toast({
          title: 'Credential Verified!',
          description: 'The credential is valid and properly signed',
        });
      } else if (result.credential && result.error?.includes('expired')) {
        setVerificationResult('expired');
        setCredential(result.credential);
        toast({
          title: 'Credential Expired',
          description: 'This credential has passed its expiry date',
          variant: 'destructive',
        });
      } else {
        setVerificationResult('invalid');
        toast({
          title: 'No Credential Found',
          description: result.error || 'No valid credential exists for this address',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      setVerificationResult('error');
      toast({
        title: 'Error',
        description: error.message || 'An error occurred during verification',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Generate verification QR data
  const getVerificationQRData = () => {
    return JSON.stringify({
      type: 'credential-verification',
      address: citizenAddress,
      verified: verificationResult === 'valid',
      credential: credential ? {
        fullName: credential.fullName,
        nationalId: credential.nationalId,
        issuedAt: credential.issuedAt,
        expiryDate: credential.expiryDate,
      } : null,
      timestamp: Date.now(),
    });
  };

  const formatDate = (dateStr: string | number) => {
    if (typeof dateStr === 'number') {
      return new Date(dateStr).toLocaleDateString();
    }
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <Card className="border-border bg-card border-glow">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center">
            <Search className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle>Verify Credential</CardTitle>
            <CardDescription>Verify an identity credential by public address only</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 mb-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-primary">Note:</strong> Verification only requires the citizen's public wallet address. 
              No face verification is needed - just enter the address to check if a valid credential exists.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="verifyAddress">Citizen Wallet Address *</Label>
            <Input
              id="verifyAddress"
              placeholder="0x..."
              value={citizenAddress}
              onChange={(e) => setCitizenAddress(e.target.value)}
              className="font-mono bg-secondary"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full gradient-primary text-primary-foreground"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Verifying...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Verify Credential
              </>
            )}
          </Button>

          {/* Verification Result */}
          {verificationResult !== 'pending' && (
            <div className={`mt-4 p-4 rounded-lg border ${
              verificationResult === 'valid' 
                ? 'bg-green-500/10 border-green-500/30' 
                : verificationResult === 'expired'
                ? 'bg-yellow-500/10 border-yellow-500/30'
                : verificationResult === 'invalid'
                ? 'bg-destructive/10 border-destructive/30'
                : 'bg-yellow-500/10 border-yellow-500/30'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {verificationResult === 'valid' ? (
                    <>
                      <CheckCircle className="w-6 h-6 text-green-400" />
                      <span className="font-bold text-lg text-green-400">Credential Valid</span>
                    </>
                  ) : verificationResult === 'expired' ? (
                    <>
                      <AlertTriangle className="w-6 h-6 text-yellow-500" />
                      <span className="font-bold text-lg text-yellow-500">Credential Expired</span>
                    </>
                  ) : verificationResult === 'invalid' ? (
                    <>
                      <XCircle className="w-6 h-6 text-destructive" />
                      <span className="font-bold text-lg text-destructive">No Credential Found</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-6 h-6 text-yellow-500" />
                      <span className="font-bold text-lg text-yellow-500">Verification Error</span>
                    </>
                  )}
                </div>

                {(verificationResult === 'valid' || verificationResult === 'expired') && credential && (
                  <QRCodeButton 
                    value={getVerificationQRData()} 
                    title="Verification QR Code"
                    buttonText="QR"
                  />
                )}
              </div>

              {credential && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                      <User className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Full Name</p>
                        <p className="font-medium">{credential.fullName}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                      <CreditCard className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">National ID</p>
                        <p className="font-medium">{credential.nationalId}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                      <Calendar className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Date of Birth</p>
                        <p className="font-medium">{credential.dateOfBirth || 'Not specified'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                      <Calendar className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Expiry Date</p>
                        <p className={`font-medium ${verificationResult === 'expired' ? 'text-destructive' : ''}`}>
                          {credential.expiryDate || 'No expiry'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-1">Issued By</p>
                    <p className="font-mono text-xs break-all">
                      {credential.issuerAddress}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Issued on {formatDate(credential.issuedAt)}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-1">Credential Hash</p>
                    <p className="font-mono text-xs break-all text-primary">{credential.credentialHash}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
