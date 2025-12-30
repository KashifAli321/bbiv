import { ExternalLink, Droplets, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useWallet } from '@/contexts/WalletContext';
import { NETWORKS } from '@/lib/networks';

const FAUCET_LINKS = [
  {
    name: 'Sepolia Faucet (Google)',
    url: 'https://cloud.google.com/application/web3/faucet/ethereum/sepolia',
    description: 'Free Sepolia ETH from Google Cloud (requires Google account)',
    network: 'sepolia',
  },
  {
    name: 'Sepolia Faucet (Alchemy)',
    url: 'https://sepoliafaucet.com',
    description: 'Get 0.5 Sepolia ETH every 24 hours (requires Alchemy account)',
    network: 'sepolia',
  },
  {
    name: 'Sepolia PoW Faucet',
    url: 'https://sepolia-faucet.pk910.de',
    description: 'Mine Sepolia ETH with your browser - no account needed',
    network: 'sepolia',
  },
  {
    name: 'Holesky Faucet',
    url: 'https://holesky-faucet.pk910.de',
    description: 'Mine Holesky ETH with your browser',
    network: 'holeskyTestnet',
  },
  {
    name: 'Polygon Amoy Faucet',
    url: 'https://faucet.polygon.technology',
    description: 'Get free MATIC on Polygon Amoy testnet',
    network: 'polygonAmoy',
  },
  {
    name: 'BSC Testnet Faucet',
    url: 'https://testnet.bnbchain.org/faucet-smart',
    description: 'Get free tBNB on BSC testnet',
    network: 'bscTestnet',
  },
];

export function FaucetInfo() {
  const { network, address } = useWallet();

  const relevantFaucets = FAUCET_LINKS.filter(f => f.network === network.id);
  const otherFaucets = FAUCET_LINKS.filter(f => f.network !== network.id);

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Droplets className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-lg">Get Test ETH</CardTitle>
            <CardDescription>Free test tokens for gas fees</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-primary/30 bg-primary/5">
          <AlertCircle className="h-4 w-4 text-primary" />
          <AlertTitle>Why do I need test ETH?</AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground">
            Test ETH (or testnet tokens) is required to pay for gas fees when issuing or verifying credentials on the blockchain. 
            Testnets are free to use and allow you to test without spending real money.
          </AlertDescription>
        </Alert>

        {relevantFaucets.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-primary">
              Faucets for {network.name}
            </h4>
            {relevantFaucets.map((faucet) => (
              <div 
                key={faucet.url}
                className="p-3 rounded-lg bg-secondary/50 border border-border hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h5 className="font-medium text-sm">{faucet.name}</h5>
                    <p className="text-xs text-muted-foreground mt-1">{faucet.description}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(faucet.url, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {otherFaucets.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              Other Testnet Faucets
            </h4>
            {otherFaucets.map((faucet) => (
              <div 
                key={faucet.url}
                className="p-3 rounded-lg bg-secondary/30 border border-border/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h5 className="font-medium text-sm text-muted-foreground">{faucet.name}</h5>
                    <p className="text-xs text-muted-foreground/70 mt-1">{faucet.description}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => window.open(faucet.url, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 border-t border-border">
          <h4 className="text-sm font-medium mb-2">How to get test ETH:</h4>
          <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Click on any faucet link above</li>
            <li>Paste your wallet address: <code className="text-primary text-[10px] break-all">{address || 'Connect wallet first'}</code></li>
            <li>Complete any verification (if required)</li>
            <li>Wait for the transaction to confirm</li>
            <li>Refresh your balance on the wallet page</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
