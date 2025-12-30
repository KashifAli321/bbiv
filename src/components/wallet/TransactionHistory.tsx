import { useState, useEffect } from 'react';
import { History, ExternalLink, CheckCircle, Clock, XCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/contexts/WalletContext';
import { truncateAddress } from '@/lib/wallet';

export interface Transaction {
  id: string;
  type: 'issue' | 'verify' | 'send' | 'receive';
  txHash: string;
  from: string;
  to: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  network: string;
  description?: string;
}

const STORAGE_KEY = 'blockchain_identity_transactions';

export function getTransactionHistory(): Transaction[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    console.error('Failed to load transaction history');
  }
  return [];
}

export function addTransaction(tx: Omit<Transaction, 'id' | 'timestamp'>): Transaction {
  const transactions = getTransactionHistory();
  const newTx: Transaction = {
    ...tx,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  transactions.unshift(newTx);
  
  // Keep only last 50 transactions
  const trimmed = transactions.slice(0, 50);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  
  return newTx;
}

export function updateTransactionStatus(txHash: string, status: Transaction['status']): void {
  const transactions = getTransactionHistory();
  const index = transactions.findIndex(tx => tx.txHash === txHash);
  if (index !== -1) {
    transactions[index].status = status;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  }
}

export function TransactionHistory() {
  const { address, network } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadTransactions = () => {
    setIsLoading(true);
    const txs = getTransactionHistory().filter(
      tx => tx.from.toLowerCase() === address?.toLowerCase() || 
            tx.to.toLowerCase() === address?.toLowerCase()
    );
    setTransactions(txs);
    setIsLoading(false);
  };

  useEffect(() => {
    if (address) {
      loadTransactions();
    }
  }, [address]);

  const getTypeColor = (type: Transaction['type']) => {
    switch (type) {
      case 'issue':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'verify':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'send':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'receive':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-secondary text-muted-foreground';
    }
  };

  const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-destructive" />;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (!address) {
    return null;
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <History className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Transaction History</CardTitle>
              <CardDescription>Credential issuance and verification events</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={loadTransactions} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No transactions yet</p>
            <p className="text-sm">Your credential operations will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div 
                key={tx.id}
                className="p-3 rounded-lg bg-secondary/50 border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(tx.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-xs ${getTypeColor(tx.type)}`}>
                          {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(tx.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm mt-1 font-mono">
                        {tx.type === 'issue' ? (
                          <>To: {truncateAddress(tx.to)}</>
                        ) : tx.type === 'verify' ? (
                          <>Address: {truncateAddress(tx.to)}</>
                        ) : (
                          <>
                            {tx.from.toLowerCase() === address?.toLowerCase() ? 'To' : 'From'}: {truncateAddress(tx.from.toLowerCase() === address?.toLowerCase() ? tx.to : tx.from)}
                          </>
                        )}
                      </p>
                      {tx.description && (
                        <p className="text-xs text-muted-foreground mt-1">{tx.description}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => window.open(`${network.blockExplorer}/tx/${tx.txHash}`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
