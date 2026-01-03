import { FileCheck, AlertTriangle, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CredentialIssuer } from '@/components/credentials/CredentialIssuer';
import { CredentialRevoker } from '@/components/credentials/CredentialRevoker';
import { ContractDeployer } from '@/components/credentials/ContractDeployer';
import { useWallet } from '@/contexts/WalletContext';
import { getCredentialContractAddress } from '@/lib/contracts';
export default function IssuerPage() {
  const { address } = useWallet();
  const contractAddress = getCredentialContractAddress();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
            <FileCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Credential Issuer</h1>
            <p className="text-muted-foreground">Issue verifiable identity credentials on the blockchain</p>
          </div>
        </div>

        <Alert className="mb-6 border-primary/30 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle>Issuer Access Required</AlertTitle>
          <AlertDescription>
            Only the wallet that deployed the contract can issue credentials. Deploy your own contract below to become an issuer.
          </AlertDescription>
        </Alert>

        {/* Contract Deployer Section */}
        <div className="mb-6">
          <ContractDeployer />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Tabs defaultValue="issue" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="issue">Issue Credential</TabsTrigger>
                <TabsTrigger value="revoke">Revoke Credential</TabsTrigger>
              </TabsList>
              <TabsContent value="issue">
                <CredentialIssuer />
              </TabsContent>
              <TabsContent value="revoke">
                <CredentialRevoker />
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg">Contract Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-xs text-muted-foreground">Contract Address</span>
                  <p className="font-mono text-xs break-all text-primary mt-1">
                    {contractAddress}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Network</span>
                  <p className="text-sm mt-1">Sepolia Testnet</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg">How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex gap-2">
                  <span className="text-primary font-bold">1.</span>
                  <p>Enter the citizen's wallet address</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-primary font-bold">2.</span>
                  <p>Fill in their identity information</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-primary font-bold">3.</span>
                  <p>A hash of the data is computed</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-primary font-bold">4.</span>
                  <p>The hash is stored on the blockchain</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-primary font-bold">5.</span>
                  <p>The credential can now be verified</p>
                </div>
              </CardContent>
            </Card>

            <Alert className="border-warning/30 bg-warning/5">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertTitle className="text-warning">Gas Required</AlertTitle>
              <AlertDescription className="text-muted-foreground">
                Issuing credentials requires Sepolia ETH for gas fees. Get free test ETH from a faucet.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    </div>
  );
}
