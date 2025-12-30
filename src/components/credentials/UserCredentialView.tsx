import { useState, useEffect } from 'react';
import { Shield, Copy, User, Calendar, CreditCard, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/hooks/use-toast';
import { getMyCredential, StoredCredential, verifyCredentialSignature } from '@/lib/credential-storage';
import { QRCodeButton } from '@/components/wallet/QRCodeDisplay';

export function UserCredentialView() {
  const { address } = useWallet();
  const { toast } = useToast();
  const [credential, setCredential] = useState<StoredCredential | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValid, setIsValid] = useState(false);

  const fetchCredential = async () => {
    if (!address) return;
    
    setIsLoading(true);
    try {
      const cred = await getMyCredential();
      setCredential(cred);
      
      if (cred) {
        const valid = verifyCredentialSignature(cred);
        setIsValid(valid);
      }
    } catch (error) {
      console.error('Error fetching credential:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCredential();
  }, [address]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Copied to clipboard',
    });
  };

  const formatDate = (dateStr: string | number) => {
    if (typeof dateStr === 'number') {
      return new Date(dateStr).toLocaleDateString();
    }
    return dateStr ? new Date(dateStr).toLocaleDateString() : 'Not specified';
  };

  const isExpired = credential?.expiryDate ? new Date(credential.expiryDate) < new Date() : false;

  const getCredentialQRData = () => {
    if (!credential) return '';
    return JSON.stringify({
      type: 'identity-credential',
      address: address,
      fullName: credential.fullName,
      nationalId: credential.nationalId,
      credentialHash: credential.credentialHash,
      issuer: credential.issuerAddress,
      issuedAt: credential.issuedAt,
      expiryDate: credential.expiryDate,
    });
  };

  if (!address) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="pt-6 text-center">
          <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Connect your wallet to view credentials</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card border-glow">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle>My Credential</CardTitle>
            <CardDescription>View your verified identity credential</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-secondary">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Wallet Address</span>
              <Badge variant="outline">Connected</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm flex-1 truncate">{address}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(address)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : credential ? (
            <div className={`p-4 rounded-lg border ${
              isExpired 
                ? 'bg-yellow-500/10 border-yellow-500/30' 
                : 'bg-green-500/10 border-green-500/30'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className={`w-5 h-5 ${isExpired ? 'text-yellow-500' : 'text-green-400'}`} />
                  <span className={`font-medium ${isExpired ? 'text-yellow-500' : 'text-green-400'}`}>
                    {isExpired ? 'Credential Expired' : 'Credential Valid'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isValid && <Badge variant="default" className="bg-green-500">Verified</Badge>}
                  <QRCodeButton 
                    value={getCredentialQRData()} 
                    title="My Credential QR" 
                    buttonText="QR"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                    <p className="font-medium">{formatDate(credential.dateOfBirth)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                  <Calendar className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Expiry Date</p>
                    <p className={`font-medium ${isExpired ? 'text-destructive' : ''}`}>
                      {formatDate(credential.expiryDate)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-border space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Issued By</p>
                  <p className="font-mono text-xs break-all">
                    {credential.issuerAddress}
                  </p>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Issued On</p>
                  <p className="text-sm">{formatDate(credential.issuedAt)}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Credential Hash</p>
                  <div className="flex items-center gap-2 p-2 rounded bg-background/50">
                    <span className="font-mono text-xs break-all flex-1 text-primary">
                      {credential.credentialHash}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => copyToClipboard(credential.credentialHash)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-secondary border border-border text-center">
              <Shield className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No credential found for this address</p>
              <p className="text-xs text-muted-foreground mt-1">
                Contact an authorized issuer to get your identity credential
              </p>
            </div>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={fetchCredential}
            disabled={isLoading}
          >
            Refresh Credential
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
