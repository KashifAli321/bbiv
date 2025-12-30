import { useState, useEffect } from 'react';
import { Shield, Copy, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/contexts/WalletContext';
import { getStoredCredential, truncateAddress } from '@/lib/wallet';
import { useToast } from '@/hooks/use-toast';

export function UserCredentialView() {
  const { address, network } = useWallet();
  const { toast } = useToast();
  const [credentialHash, setCredentialHash] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCredential = async () => {
    if (!address) return;
    
    setIsLoading(true);
    try {
      const hash = await getStoredCredential(address, network.id);
      setCredentialHash(hash);
    } catch (error) {
      console.error('Error fetching credential:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCredential();
  }, [address, network]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Credential hash copied to clipboard',
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
            <CardDescription>View your identity credential on the blockchain</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-secondary">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Wallet Address</span>
              <Badge variant="outline">{network.name}</Badge>
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
          ) : credentialHash ? (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-green-400" />
                <span className="font-medium text-green-400">Credential Found</span>
              </div>
              
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground">Credential Hash</span>
                <div className="flex items-center gap-2 p-3 rounded bg-background/50">
                  <span className="font-mono text-xs break-all flex-1 text-primary">
                    {credentialHash}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(credentialHash)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => window.open(`${network.blockExplorer}/address/${address}`, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View on Block Explorer
              </Button>
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
