import { Shield, Info, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CredentialVerifier } from '@/components/credentials/CredentialVerifier';
import { CREDENTIAL_CONTRACT_ADDRESS } from '@/lib/contracts';

export default function VerifierPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Credential Verifier</h1>
            <p className="text-muted-foreground">Verify identity credentials on the blockchain</p>
          </div>
        </div>

        <Alert className="mb-6 border-green-500/30 bg-green-500/5">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertTitle className="text-green-400">No Wallet Required</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            Anyone can verify credentials without connecting a wallet. Verification is a read-only operation.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CredentialVerifier />
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
                    {CREDENTIAL_CONTRACT_ADDRESS}
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
                <CardTitle className="text-lg">Verification Process</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex gap-2">
                  <span className="text-primary font-bold">1.</span>
                  <p>Enter the citizen's wallet address</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-primary font-bold">2.</span>
                  <p>The system checks the blockchain</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-primary font-bold">3.</span>
                  <p>If found, the credential hash is displayed</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-primary font-bold">4.</span>
                  <p>Optionally, verify the data matches</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg">What Gets Verified?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Credential existence on blockchain</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Cryptographic hash integrity</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Data matches stored hash</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Issued by authorized issuer</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
