import { useState } from 'react';
import { Wallet, Plus, Download, AlertTriangle, Shield, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWallet } from '@/contexts/WalletContext';
import { useAuth } from '@/contexts/AuthContext';
import { WalletCard } from '@/components/wallet/WalletCard';
import { BalanceGrid } from '@/components/wallet/BalanceGrid';
import { FaucetInfo } from '@/components/wallet/FaucetInfo';
import { TransactionHistory } from '@/components/wallet/TransactionHistory';
import { useToast } from '@/hooks/use-toast';
import { sendTransaction } from '@/lib/wallet';
import { ethers } from 'ethers';

export default function WalletPage() {
  const { isConnected, createNewWallet, importFromPrivateKey, privateKey, network, hasLinkedWallet } = useWallet();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [importKey, setImportKey] = useState('');
  const [sendForm, setSendForm] = useState({ to: '', amount: '' });
  const [isSending, setIsSending] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  const handleImport = async () => {
    if (!importKey.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a private key',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);
    const result = await importFromPrivateKey(importKey);
    
    if (result.success) {
      toast({
        title: 'Wallet Linked!',
        description: 'Your wallet has been securely linked to your account',
      });
      setImportKey('');
    } else {
      toast({
        title: 'Import Failed',
        description: result.error || 'Invalid private key format',
        variant: 'destructive',
      });
    }
    setIsImporting(false);
  };

  const handleCreate = async () => {
    setIsCreating(true);
    const result = await createNewWallet();
    
    if (result.success) {
      toast({
        title: 'Wallet Created!',
        description: 'Your new wallet has been created and linked to your account. Make sure to backup your private key!',
      });
    } else {
      toast({
        title: 'Creation Failed',
        description: result.error || 'Failed to create wallet',
        variant: 'destructive',
      });
    }
    setIsCreating(false);
  };

  const handleSend = async () => {
    if (!sendForm.to || !sendForm.amount || !privateKey) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    // Validate recipient address
    if (!ethers.isAddress(sendForm.to)) {
      toast({
        title: 'Invalid Address',
        description: 'Please enter a valid Ethereum address',
        variant: 'destructive',
      });
      return;
    }

    // Validate amount
    const amount = parseFloat(sendForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid positive amount',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      const result = await sendTransaction(privateKey, sendForm.to, sendForm.amount, network.id);
      
      if (result.success) {
        toast({
          title: 'Transaction Sent!',
          description: `Transaction hash: ${result.txHash?.slice(0, 20)}...`,
        });
        setSendForm({ to: '', amount: '' });
      } else {
        toast({
          title: 'Transaction Failed',
          description: result.error || 'Unknown error',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Transaction failed',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center">
            <Wallet className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Your Wallet</h1>
            <p className="text-muted-foreground">One wallet per account for secure identity verification</p>
          </div>
        </div>

        {/* Info about one wallet policy */}
        <Alert className="mb-6 border-primary/30 bg-primary/5">
          <Lock className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            <span className="font-medium">One Wallet Per Account:</span> Your wallet is permanently linked to your identity. 
            This ensures secure credential verification and prevents multi-account abuse.
          </AlertDescription>
        </Alert>

        {!isConnected ? (
          <div className="space-y-6">
            {hasLinkedWallet ? (
              // User has a wallet but it's not loaded (shouldn't happen normally)
              <Card className="border-border bg-card">
                <CardContent className="pt-6 text-center py-12">
                  <Shield className="w-16 h-16 mx-auto text-primary mb-4" />
                  <h2 className="text-xl font-medium mb-2">Wallet Linked</h2>
                  <p className="text-muted-foreground">
                    Your wallet is securely linked to your account. Please refresh the page if it doesn't load.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border bg-card">
                <CardHeader className="text-center">
                  <CardTitle>Link Your Wallet</CardTitle>
                  <CardDescription>Create a new wallet or import an existing one to link to your account</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="create" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-secondary">
                      <TabsTrigger value="create">Create New</TabsTrigger>
                      <TabsTrigger value="import">Import Existing</TabsTrigger>
                    </TabsList>

                    <TabsContent value="create" className="space-y-4 mt-6">
                      <div className="text-center py-8">
                        <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
                          <Plus className="w-8 h-8 text-primary-foreground" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">Create New Wallet</h3>
                        <p className="text-muted-foreground text-sm mb-6">
                          Generate a new wallet and link it to your account permanently
                        </p>
                        <Button 
                          onClick={handleCreate} 
                          disabled={isCreating}
                          className="gradient-primary text-primary-foreground"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          {isCreating ? 'Creating...' : 'Create & Link Wallet'}
                        </Button>
                      </div>

                      <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium text-warning">Important!</p>
                            <p className="text-muted-foreground">
                              This wallet will be permanently linked to your account. 
                              Make sure to backup your private key securely after creation.
                            </p>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="import" className="space-y-4 mt-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="privateKey">Private Key</Label>
                          <Input
                            id="privateKey"
                            type="password"
                            placeholder="0x..."
                            value={importKey}
                            onChange={(e) => setImportKey(e.target.value)}
                            className="font-mono bg-secondary"
                          />
                          <p className="text-xs text-muted-foreground">
                            Enter your private key starting with 0x
                          </p>
                        </div>

                        <Button 
                          onClick={handleImport}
                          disabled={isImporting}
                          className="w-full gradient-primary text-primary-foreground"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          {isImporting ? 'Importing...' : 'Import & Link Wallet'}
                        </Button>
                      </div>

                      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium text-destructive">Security Warning</p>
                            <p className="text-muted-foreground">
                              Never share your private key with anyone. This wallet will be permanently linked to your account.
                            </p>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            <FaucetInfo />
          </div>
        ) : (
          <div className="space-y-6">
            <WalletCard />

            {/* Send Transaction */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg">Send Transaction</CardTitle>
                <CardDescription>Send native tokens to another address</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="toAddress">Recipient Address</Label>
                  <Input
                    id="toAddress"
                    placeholder="0x..."
                    value={sendForm.to}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSendForm({ ...sendForm, to: value });
                      if (value && !ethers.isAddress(value)) {
                        setAddressError('Invalid Ethereum address format');
                      } else {
                        setAddressError(null);
                      }
                    }}
                    className={`font-mono bg-secondary ${addressError ? 'border-destructive' : ''}`}
                  />
                  {addressError && (
                    <p className="text-xs text-destructive">{addressError}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ({network.symbol})</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.000001"
                    placeholder="0.0"
                    value={sendForm.amount}
                    onChange={(e) => setSendForm({ ...sendForm, amount: e.target.value })}
                    className="bg-secondary"
                  />
                </div>

                <Button 
                  onClick={handleSend} 
                  disabled={isSending}
                  className="w-full gradient-primary text-primary-foreground"
                >
                  {isSending ? 'Sending...' : 'Send Transaction'}
                </Button>
              </CardContent>
            </Card>

            <BalanceGrid />
            
            <FaucetInfo />
            
            <TransactionHistory />
          </div>
        )}
      </div>
    </div>
  );
}
