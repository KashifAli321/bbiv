import { useState, useCallback } from 'react';
import { Copy, ExternalLink, RefreshCw, Eye, EyeOff, Wallet, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useWallet } from '@/contexts/WalletContext';
import { truncateAddress, formatBalance } from '@/lib/wallet';
import { NetworkSelector } from './NetworkSelector';
import { QRCodeButton } from './QRCodeDisplay';
import { useToast } from '@/hooks/use-toast';

export function WalletCard() {
  const { address, privateKey, network, balance, isLoading, refreshBalance } = useWallet();
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showKeyWarning, setShowKeyWarning] = useState(false);
  const [keyViewTimeout, setKeyViewTimeout] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
  }, [toast]);

  // Handle private key reveal with confirmation and auto-hide
  const handleRevealPrivateKey = useCallback(() => {
    if (!showPrivateKey) {
      setShowKeyWarning(true);
    } else {
      setShowPrivateKey(false);
      if (keyViewTimeout) {
        clearTimeout(keyViewTimeout);
        setKeyViewTimeout(null);
      }
    }
  }, [showPrivateKey, keyViewTimeout]);

  const confirmRevealKey = useCallback(() => {
    setShowKeyWarning(false);
    setShowPrivateKey(true);
    
    // Auto-hide after 30 seconds for security
    const timeout = setTimeout(() => {
      setShowPrivateKey(false);
      toast({
        title: 'Private Key Hidden',
        description: 'Private key was automatically hidden for security',
      });
    }, 30000);
    
    setKeyViewTimeout(timeout);
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

        {/* Private Key - with enhanced security */}
        {privateKey && (
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-destructive" />
              Private Key (Sensitive)
            </label>
            <Alert variant="destructive" className="mb-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                ⚠️ TESTNET ONLY - Never share your private key! Keys are stored in session only and cleared when you close the browser.
              </AlertDescription>
            </Alert>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary border border-destructive/30">
              <span className="font-mono text-sm flex-1 truncate select-none">
                {showPrivateKey ? privateKey : '•'.repeat(40)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={handleRevealPrivateKey}
              >
                {showPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              {showPrivateKey && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => copyToClipboard(privateKey, 'Private key')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              )}
            </div>
            {showPrivateKey && (
              <p className="text-xs text-muted-foreground">
                Key will auto-hide in 30 seconds. Click the eye icon to hide immediately.
              </p>
            )}
          </div>
        )}

        {/* Private Key Warning Dialog */}
        <AlertDialog open={showKeyWarning} onOpenChange={setShowKeyWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <ShieldAlert className="w-5 h-5" />
                Security Warning
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>You are about to reveal your private key. Before proceeding:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>Ensure no one is watching your screen</li>
                  <li>Stop any screen recording or sharing</li>
                  <li>Never share this key with anyone</li>
                  <li>This is for testnet use only</li>
                </ul>
                <p className="font-medium text-destructive">
                  Anyone with this key can steal all funds and forge credentials!
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmRevealKey} className="bg-destructive text-destructive-foreground">
                I Understand, Show Key
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
