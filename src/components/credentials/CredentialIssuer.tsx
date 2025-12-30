import { useState } from 'react';
import { FileCheck, Shield, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/contexts/WalletContext';
import { createCredentialHash, issueCredential, CredentialData } from '@/lib/wallet';
import { NetworkSelector } from '@/components/wallet/NetworkSelector';

export function CredentialIssuer() {
  const { privateKey, address, network } = useWallet();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    citizenAddress: '',
    fullName: '',
    dateOfBirth: '',
    nationalId: '',
    issuedDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!privateKey) {
      toast({
        title: 'Wallet Required',
        description: 'Please connect your wallet first',
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

    setIsLoading(true);
    setTxHash(null);

    try {
      const credentialData: CredentialData = {
        fullName: formData.fullName,
        dateOfBirth: formData.dateOfBirth,
        nationalId: formData.nationalId,
        issuedDate: formData.issuedDate,
        expiryDate: formData.expiryDate,
      };

      const hash = createCredentialHash(credentialData);
      
      const result = await issueCredential(
        privateKey,
        formData.citizenAddress,
        hash,
        network.id
      );

      if (result.success && result.txHash) {
        setTxHash(result.txHash);
        toast({
          title: 'Credential Issued!',
          description: 'The credential has been recorded on the blockchain',
        });
      } else {
        toast({
          title: 'Transaction Failed',
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
    <Card className="border-border bg-card border-glow">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center">
            <FileCheck className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle>Issue Credential</CardTitle>
            <CardDescription>Issue a verifiable identity credential on the blockchain</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!privateKey ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 mx-auto text-warning mb-4" />
            <p className="text-muted-foreground mb-4">
              You need to connect your wallet to issue credentials
            </p>
            <Button onClick={() => window.location.href = '/wallet'}>
              Connect Wallet
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <Label>Network</Label>
              <NetworkSelector />
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <Label htmlFor="issuedDate">Issued Date</Label>
                <Input
                  id="issuedDate"
                  type="date"
                  value={formData.issuedDate}
                  onChange={(e) => setFormData({ ...formData, issuedDate: e.target.value })}
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
              disabled={isLoading}
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

            {txHash && (
              <div className="mt-4 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <p className="text-sm text-green-400 mb-2">✓ Transaction Successful!</p>
                <a
                  href={`${network.blockExplorer}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline text-sm font-mono break-all"
                >
                  View on {network.name} Explorer
                </a>
              </div>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
