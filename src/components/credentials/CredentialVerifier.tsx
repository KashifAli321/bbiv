import { useState } from 'react';
import { Search, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/contexts/WalletContext';
import { verifyCredential, getStoredCredential, createCredentialHash, CredentialData } from '@/lib/wallet';
import { NetworkSelector } from '@/components/wallet/NetworkSelector';
import { QRCodeButton } from '@/components/wallet/QRCodeDisplay';
import { addTransaction } from '@/components/wallet/TransactionHistory';

type VerificationResult = 'pending' | 'valid' | 'invalid' | 'error';

export function CredentialVerifier() {
  const { network, address } = useWallet();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult>('pending');
  const [storedHash, setStoredHash] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    citizenAddress: '',
    fullName: '',
    dateOfBirth: '',
    nationalId: '',
    issuedDate: '',
    expiryDate: '',
  });

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.citizenAddress) {
      toast({
        title: 'Address Required',
        description: 'Please enter the citizen wallet address',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setVerificationResult('pending');
    setStoredHash(null);

    try {
      // First, get the stored credential hash
      const hash = await getStoredCredential(formData.citizenAddress, network.id);
      
      if (!hash) {
        setVerificationResult('invalid');
        toast({
          title: 'No Credential Found',
          description: 'No credential exists for this address',
          variant: 'destructive',
        });
        return;
      }

      setStoredHash(hash);

      // If user provided credential data, verify the hash matches
      if (formData.fullName && formData.nationalId) {
        const credentialData: CredentialData = {
          fullName: formData.fullName,
          dateOfBirth: formData.dateOfBirth,
          nationalId: formData.nationalId,
          issuedDate: formData.issuedDate,
          expiryDate: formData.expiryDate,
        };

        const computedHash = createCredentialHash(credentialData);
        const result = await verifyCredential(formData.citizenAddress, computedHash, network.id);

        if (result.isValid) {
          setVerificationResult('valid');
          
          // Add to transaction history
          if (address) {
            addTransaction({
              type: 'verify',
              txHash: `verify-${Date.now()}`,
              from: address,
              to: formData.citizenAddress,
              status: 'confirmed',
              network: network.id,
              description: `Verified credential for ${formData.fullName}`,
            });
          }

          toast({
            title: 'Credential Verified!',
            description: 'The credential is valid and matches the blockchain record',
          });
        } else {
          setVerificationResult('invalid');
          toast({
            title: 'Verification Failed',
            description: 'The credential data does not match the blockchain record',
            variant: 'destructive',
          });
        }
      } else {
        // Just show that a credential exists
        setVerificationResult('valid');
        toast({
          title: 'Credential Found',
          description: 'A credential exists for this address',
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
      address: formData.citizenAddress,
      network: network.id,
      verified: verificationResult === 'valid',
      hash: storedHash,
      timestamp: Date.now(),
    });
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
          <div className="flex items-center justify-between mb-4">
            <Label>Network</Label>
            <NetworkSelector />
          </div>

          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 mb-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-primary">Note:</strong> Verification only requires the citizen's public wallet address. 
              No face verification is needed for verifiers - just enter the address to check if a credential exists.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="verifyAddress">Citizen Wallet Address *</Label>
            <Input
              id="verifyAddress"
              placeholder="0x..."
              value={formData.citizenAddress}
              onChange={(e) => setFormData({ ...formData, citizenAddress: e.target.value })}
              className="font-mono bg-secondary"
            />
          </div>

          <div className="p-4 rounded-lg bg-secondary/50 border border-border">
            <p className="text-sm text-muted-foreground mb-4">
              Optional: Enter credential details to verify the data matches
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="verifyName">Full Name</Label>
                <Input
                  id="verifyName"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="bg-secondary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="verifyNationalId">National ID</Label>
                <Input
                  id="verifyNationalId"
                  placeholder="ID-123456789"
                  value={formData.nationalId}
                  onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                  className="bg-secondary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="verifyDob">Date of Birth</Label>
                <Input
                  id="verifyDob"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="bg-secondary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="verifyIssued">Issued Date</Label>
                <Input
                  id="verifyIssued"
                  type="date"
                  value={formData.issuedDate}
                  onChange={(e) => setFormData({ ...formData, issuedDate: e.target.value })}
                  className="bg-secondary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="verifyExpiry">Expiry Date</Label>
                <Input
                  id="verifyExpiry"
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  className="bg-secondary"
                />
              </div>
            </div>
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
                : verificationResult === 'invalid'
                ? 'bg-destructive/10 border-destructive/30'
                : 'bg-warning/10 border-warning/30'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {verificationResult === 'valid' ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="font-medium text-green-400">Credential Valid</span>
                    </>
                  ) : verificationResult === 'invalid' ? (
                    <>
                      <XCircle className="w-5 h-5 text-destructive" />
                      <span className="font-medium text-destructive">Credential Invalid</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5 text-warning" />
                      <span className="font-medium text-warning">Verification Error</span>
                    </>
                  )}
                </div>

                {verificationResult === 'valid' && storedHash && (
                  <QRCodeButton 
                    value={getVerificationQRData()} 
                    title="Verification QR Code"
                    buttonText="QR"
                  />
                )}
              </div>

              {storedHash && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Stored Credential Hash:</p>
                  <p className="font-mono text-xs break-all text-primary">{storedHash}</p>
                </div>
              )}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
