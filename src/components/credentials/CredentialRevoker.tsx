import { useState } from 'react';
import { Ban, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/contexts/WalletContext';
import { useAuth } from '@/contexts/AuthContext';
import { revokeCredentialForCitizen, verifyCredentialForCitizen } from '@/lib/credential-storage';
import { isAuthorizedIssuer } from '@/lib/issuer-config';
import { addTransaction } from '@/components/wallet/TransactionHistory';
import { ethers } from 'ethers';

export function CredentialRevoker() {
  const { address, signWithWallet, isConnected } = useWallet();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [revokedSuccessfully, setRevokedSuccessfully] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [citizenAddress, setCitizenAddress] = useState('');
  const [addressError, setAddressError] = useState<string | null>(null);
  const [credentialInfo, setCredentialInfo] = useState<{ fullName: string } | null>(null);

  const handleLookup = async () => {
    if (!citizenAddress) return;

    if (!ethers.isAddress(citizenAddress)) {
      setAddressError('Invalid Ethereum address format');
      return;
    }

    setAddressError(null);
    const result = await verifyCredentialForCitizen(citizenAddress);
    
    if (result.credential) {
      setCredentialInfo({ fullName: result.credential.fullName });
    } else {
      setCredentialInfo(null);
      toast({
        title: 'No Credential Found',
        description: 'No credential exists for this address',
        variant: 'destructive',
      });
    }
  };

  const handleRevoke = async () => {
    if (!isConnected || !address) {
      toast({
        title: 'Wallet Required',
        description: 'Please connect your wallet first',
        variant: 'destructive',
      });
      return;
    }

    const isAuthorized = await isAuthorizedIssuer();
    if (!isAuthorized) {
      toast({
        title: 'Not Authorized',
        description: 'Only administrators can revoke credentials',
        variant: 'destructive',
      });
      return;
    }

    if (!ethers.isAddress(citizenAddress)) {
      toast({
        title: 'Invalid Address',
        description: 'Please enter a valid Ethereum address',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setRevokedSuccessfully(false);
    setTxHash(null);

    try {
      const signResult = await signWithWallet(async (privateKey) => {
        return await revokeCredentialForCitizen(privateKey, citizenAddress);
      });

      const result = signResult.success ? signResult.result : null;

      if (result?.success) {
        setRevokedSuccessfully(true);
        setTxHash(result.txHash || null);

        addTransaction({
          type: 'revoke' as any,
          txHash: result.txHash || `revoke-${Date.now()}`,
          from: address,
          to: citizenAddress,
          status: 'confirmed',
          network: 'sepolia',
          description: `Revoked credential for ${credentialInfo?.fullName || citizenAddress}`,
        });

        toast({
          title: 'Credential Revoked',
          description: `Successfully revoked on blockchain. TX: ${result.txHash?.slice(0, 10)}...`,
        });

        setCitizenAddress('');
        setCredentialInfo(null);
      } else {
        toast({
          title: 'Revocation Failed',
          description: signResult.error || result?.error || 'Failed to revoke credential',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-border bg-card border-destructive/30">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-destructive/20 flex items-center justify-center">
            <Ban className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <CardTitle>Revoke Credential</CardTitle>
            <CardDescription>Permanently invalidate a credential on the blockchain</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Warning: Irreversible Action</AlertTitle>
          <AlertDescription>
            Revoking a credential permanently removes it from the blockchain. This action cannot be undone.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="revokeAddress">Citizen Wallet Address</Label>
          <div className="flex gap-2">
            <Input
              id="revokeAddress"
              placeholder="0x..."
              value={citizenAddress}
              onChange={(e) => {
                setCitizenAddress(e.target.value);
                setAddressError(null);
                setCredentialInfo(null);
              }}
              className={`font-mono bg-secondary ${addressError ? 'border-destructive' : ''}`}
            />
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleLookup}
              disabled={!citizenAddress}
            >
              Lookup
            </Button>
          </div>
          {addressError && (
            <p className="text-xs text-destructive">{addressError}</p>
          )}
        </div>

        {credentialInfo && (
          <div className="p-3 rounded-lg bg-secondary/50 border border-border">
            <p className="text-sm text-muted-foreground">Credential found for:</p>
            <p className="font-medium">{credentialInfo.fullName}</p>
          </div>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="destructive" 
              className="w-full"
              disabled={isLoading || !credentialInfo || !isConnected}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Revoking...
                </>
              ) : (
                <>
                  <Ban className="w-4 h-4 mr-2" />
                  Revoke Credential
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently revoke the credential for <strong>{credentialInfo?.fullName}</strong> ({citizenAddress.slice(0, 8)}...{citizenAddress.slice(-6)}).
                <br /><br />
                This action cannot be undone. The credential will be removed from the blockchain and marked as revoked in the database.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRevoke} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Yes, Revoke Credential
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {revokedSuccessfully && (
          <Alert className="border-green-500/30 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-500">Credential Revoked Successfully</AlertTitle>
            <AlertDescription>
              The credential has been permanently revoked on the blockchain.
              {txHash && (
                <a 
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline mt-2"
                >
                  View transaction on Etherscan <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}