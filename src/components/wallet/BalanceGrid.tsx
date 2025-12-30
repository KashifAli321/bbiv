import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/contexts/WalletContext';
import { NETWORKS, TESTNET_IDS, MAINNET_IDS } from '@/lib/networks';
import { formatBalance } from '@/lib/wallet';

export function BalanceGrid() {
  const { address, balances, isLoading, refreshAllBalances } = useWallet();
  const [showTestnets, setShowTestnets] = useState(true);

  useEffect(() => {
    if (address) {
      refreshAllBalances();
    }
  }, [address]);

  const networksToShow = showTestnets ? TESTNET_IDS : MAINNET_IDS;

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Multi-Chain Balances</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={showTestnets ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowTestnets(true)}
            >
              Testnets
            </Button>
            <Button
              variant={!showTestnets ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowTestnets(false)}
            >
              Mainnets
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshAllBalances}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!address ? (
          <p className="text-center text-muted-foreground py-8">
            Connect a wallet to view balances
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {networksToShow.map((networkId) => {
              const network = NETWORKS[networkId];
              const balance = balances[networkId] || '0';
              
              return (
                <div
                  key={networkId}
                  className="p-4 rounded-lg bg-secondary border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{network.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {network.symbol}
                    </Badge>
                  </div>
                  <div className="text-lg font-bold text-primary">
                    {formatBalance(balance, 6)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Chain ID: {network.chainId}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
