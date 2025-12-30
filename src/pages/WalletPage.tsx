import { useState } from 'react';
import { Wallet, Plus, Download, LogOut, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWallet } from '@/contexts/WalletContext';
import { WalletCard } from '@/components/wallet/WalletCard';
import { BalanceGrid } from '@/components/wallet/BalanceGrid';
import { useToast } from '@/hooks/use-toast';
import { sendTransaction } from '@/lib/wallet';

export default function WalletPage() {
  const { isConnected, createNewWallet, importFromPrivateKey, disconnect, privateKey, network } = useWallet();
  const { toast } = useToast();
  const [importKey, setImportKey] = useState('');
  const [sendForm, setSendForm] = useState({ to: '', amount: '' });
  const [isSending, setIsSending] = useState(false);

  const handleImport = () => {
    if (!importKey.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a private key',
        variant: 'destructive',
      });
      return;
    }

    const success = importFromPrivateKey(importKey);
    if (success) {
      toast({
        title: 'Wallet Imported!',
        description: 'Your wallet has been imported successfully',
      });
      setImportKey('');
    } else {
      toast({
        title: 'Import Failed',
        description: 'Invalid private key format',
        variant: 'destructive',
      });
    }
  };

  const handleCreate = () => {
    createNewWallet();
    toast({
      title: 'Wallet Created!',
      description: 'Your new wallet has been created. Make sure to backup your private key!',
    });
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
            <h1 className="text-2xl font-bold">Wallet Management</h1>
            <p className="text-muted-foreground">Create, import, and manage your blockchain wallet</p>
          </div>
        </div>

        {!isConnected ? (
          <Card className="border-border bg-card">
            <CardHeader className="text-center">
              <CardTitle>Connect Your Wallet</CardTitle>
              <CardDescription>Create a new wallet or import an existing one</CardDescription>
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
                      Generate a new wallet with a random private key
                    </p>
                    <Button 
                      onClick={handleCreate} 
                      className="gradient-primary text-primary-foreground"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Wallet
                    </Button>
                  </div>

                  <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-warning">Important!</p>
                        <p className="text-muted-foreground">
                          After creating your wallet, make sure to backup your private key securely. 
                          You will need it to recover your wallet.
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
                      className="w-full gradient-primary text-primary-foreground"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Import Wallet
                    </Button>
                  </div>

                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-destructive">Security Warning</p>
                        <p className="text-muted-foreground">
                          Never share your private key with anyone. Only import your key on trusted devices.
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
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
                    onChange={(e) => setSendForm({ ...sendForm, to: e.target.value })}
                    className="font-mono bg-secondary"
                  />
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

            <Button 
              variant="destructive" 
              onClick={disconnect}
              className="w-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Disconnect Wallet
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
