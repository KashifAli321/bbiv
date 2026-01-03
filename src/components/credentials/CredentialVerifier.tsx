import { useState } from 'react';
import { Search, CheckCircle, XCircle, AlertTriangle, User, Calendar, CreditCard, Link2, ExternalLink, Ban } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/contexts/WalletContext';
import { QRCodeButton } from '@/components/wallet/QRCodeDisplay';
import { addTransaction } from '@/components/wallet/TransactionHistory';
import { verifyCredentialForCitizen, StoredCredential, isCredentialRevoked } from '@/lib/credential-storage';
import { verifyCredential as verifyCredentialOnChain, getStoredCredential } from '@/lib/wallet';

type VerificationResult = 'pending' | 'valid' | 'invalid' | 'expired' | 'revoked' | 'error';

interface BlockchainVerification {
  checked: boolean;
  onChain: boolean;
  hashMatch: boolean;
  storedHash: string | null;
}

export function CredentialVerifier() {
  const { network, address } = useWallet();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult>('pending');
  const [credential, setCredential] = useState<StoredCredential | null>(null);
  const [citizenAddress, setCitizenAddress] = useState('');
  const [blockchainVerification, setBlockchainVerification] = useState<BlockchainVerification>({
    checked: false,
    onChain: false,
    hashMatch: false,
    storedHash: null,
  });

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
    setBlockchainVerification({
      checked: false,
      onChain: false,
      hashMatch: false,
      storedHash: null,
    });

    try {
      // First, verify in database
      const result = await verifyCredentialForCitizen(citizenAddress);
      
      // Then, verify on blockchain
      let blockchainResult: BlockchainVerification = {
        checked: true,
        onChain: false,
        hashMatch: false,
        storedHash: null,
      };

      try {
        const storedHash = await getStoredCredential(citizenAddress, 'sepolia');
        blockchainResult.storedHash = storedHash;
        blockchainResult.onChain = storedHash !== null;
        
        if (storedHash && result.credential) {
          blockchainResult.hashMatch = storedHash.toLowerCase() === result.credential.credentialHash.toLowerCase();
        }
      } catch (blockchainError) {
        console.error('Blockchain verification error:', blockchainError);
        blockchainResult.checked = true;
        blockchainResult.onChain = false;
      }

      setBlockchainVerification(blockchainResult);

      // Check if credential is revoked
      const revoked = await isCredentialRevoked(citizenAddress);
      
      if (revoked) {
        setVerificationResult('revoked');
        setCredential(result.credential || null);
        toast({
          title: 'Credential Revoked',
          description: 'This credential has been revoked and is no longer valid',
          variant: 'destructive',
        });
      } else if (result.isValid && result.credential) {
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
            network: 'sepolia',
            description: `Verified credential for ${result.credential.fullName}`,
          });
        }

        toast({
          title: 'Credential Verified!',
          description: blockchainResult.onChain && blockchainResult.hashMatch 
            ? 'Valid on blockchain and database' 
            : 'Valid in database',
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
      blockchainVerified: blockchainVerification.onChain && blockchainVerification.hashMatch,
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
                : verificationResult === 'revoked'
                ? 'bg-destructive/10 border-destructive/30'
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
                  ) : verificationResult === 'revoked' ? (
                    <>
                      <Ban className="w-6 h-6 text-destructive" />
                      <span className="font-bold text-lg text-destructive">Credential Revoked</span>
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

              {/* Blockchain Verification Status */}
              {blockchainVerification.checked && (
                <div className="p-3 rounded-lg bg-background/50 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Link2 className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Blockchain Verification</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">On-chain status:</span>
                      {blockchainVerification.onChain ? (
                        <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Found on Sepolia
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Not on blockchain
                        </Badge>
                      )}
                    </div>
                    {blockchainVerification.onChain && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Hash match:</span>
                        {blockchainVerification.hashMatch ? (
                          <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="w-3 h-3 mr-1" />
                            Mismatch
                          </Badge>
                        )}
                      </div>
                    )}
                    {blockchainVerification.storedHash && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1">On-chain Hash:</p>
                        <p className="font-mono text-xs break-all text-primary/80">{blockchainVerification.storedHash}</p>
                      </div>
                    )}
                    <a 
                      href={`https://sepolia.etherscan.io/address/${citizenAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                    >
                      View on Etherscan <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

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
                    <p className="text-xs text-muted-foreground mb-1">Credential Hash (Database)</p>
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
