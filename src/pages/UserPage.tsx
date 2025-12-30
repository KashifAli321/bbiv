import { User, Wallet, Shield, FileCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { WalletCard } from '@/components/wallet/WalletCard';
import { UserCredentialView } from '@/components/credentials/UserCredentialView';

export default function UserPage() {
  const { isConnected } = useWallet();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">User Portal</h1>
            <p className="text-muted-foreground">Manage your identity and wallet</p>
          </div>
        </div>

        {!isConnected ? (
          <Card className="border-border bg-card">
            <CardContent className="pt-6 text-center py-12">
              <Wallet className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-medium mb-2">Wallet Required</h2>
              <p className="text-muted-foreground mb-6">
                Connect your wallet to access the user portal
              </p>
              <Link to="/wallet">
                <Button className="gradient-primary text-primary-foreground">
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Wallet
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <WalletCard />
              
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link to="/verifier" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <Shield className="w-4 h-4 mr-2" />
                      Verify a Credential
                    </Button>
                  </Link>
                  <Link to="/issuer" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <FileCheck className="w-4 h-4 mr-2" />
                      Issue a Credential (Issuer Only)
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            <UserCredentialView />
          </div>
        )}
      </div>
    </div>
  );
}
