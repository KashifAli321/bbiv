import { useState } from 'react';
import { Copy, ExternalLink, RefreshCw, Eye, EyeOff, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { truncateAddress, formatBalance } from '@/lib/wallet';
import { NetworkSelector } from './NetworkSelector';
import { useToast } from '@/hooks/use-toast';

export function WalletCard() {
  const { address, privateKey, network, balance, isLoading, refreshBalance } = useWallet();
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
  };

  if (!address) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="pt-6 text-center">
          <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No wallet connected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card border-glow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Wallet</CardTitle>
          <NetworkSelector />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Address */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Address</label>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary">
            <span className="font-mono text-sm flex-1 truncate">{address}</span>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => copyToClipboard(address, 'Address')}
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => window.open(`${network.blockExplorer}/address/${address}`, '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Balance */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-muted-foreground">Balance</label>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshBalance}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="p-4 rounded-lg gradient-primary">
            <span className="text-2xl font-bold text-primary-foreground">
              {formatBalance(balance)} {network.symbol}
            </span>
          </div>
        </div>

        {/* Private Key */}
        {privateKey && (
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Private Key</label>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary">
              <span className="font-mono text-sm flex-1 truncate">
                {showPrivateKey ? privateKey : '•'.repeat(40)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => setShowPrivateKey(!showPrivateKey)}
              >
                {showPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => copyToClipboard(privateKey, 'Private key')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-destructive">
              ⚠️ Never share your private key with anyone!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
