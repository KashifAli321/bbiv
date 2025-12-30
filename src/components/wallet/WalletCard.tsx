import { useState, useCallback } from 'react';
import { Copy, ExternalLink, RefreshCw, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { formatBalance } from '@/lib/wallet';
import { NetworkSelector } from './NetworkSelector';
import { QRCodeButton } from './QRCodeDisplay';
import { useToast } from '@/hooks/use-toast';

export function WalletCard() {
  const { address, network, balance, isLoading, refreshBalance, hasLinkedWallet } = useWallet();
  const { toast } = useToast();

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
  }, [toast]);

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
            <QRCodeButton 
              value={address} 
              title="Wallet Address QR Code" 
              buttonText="" 
              buttonVariant="ghost"
            />
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

        {/* Security Note - Private key is never exposed in UI */}
        {hasLinkedWallet && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <p className="text-xs text-green-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              Wallet securely linked - Private key encrypted and protected
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
