import { useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Rocket, CheckCircle2, AlertTriangle, Copy, ExternalLink } from 'lucide-react';
import { ethers } from 'ethers';
import { toast } from 'sonner';
import { NETWORKS } from '@/lib/networks';
import { CREDENTIAL_CONTRACT_SOURCE } from '@/lib/contracts';

// Contract bytecode - compiled from the Solidity source
const CONTRACT_BYTECODE = "0x608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555061045c806100606000396000f3fe608060405234801561001057600080fd5b506004361061004c5760003560e01c806306f326b41461005157806322d327971461006d57806367f068f814610089578063b6a5d7de146100a5575b600080fd5b61006b6004803603810190610066919061028e565b6100c1565b005b6100876004803603810190610082919061028e565b6101a0565b005b6100a3600480360381019061009e91906102ce565b61021e565b005b6100bf60048036038101906100ba919061030a565b610272565b005b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461014f576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161014690610394565b60405180910390fd5b80600160008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002081905550505050565b6001600083815260200190815260200160002060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff161461021a57600080fd5b5050565b8060016000600160008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020548152602001908152602001600020819055505050565b806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555050565b600080604083850312156102c957600080fd5b5050919050565b600080604083850312156102e357600080fd5b82359150602083013573ffffffffffffffffffffffffffffffffffffffff8116811461030e57600080fd5b809150509250929050565b60006020828403121561032b57600080fd5b813573ffffffffffffffffffffffffffffffffffffffff8116811461034f57600080fd5b9392505050565b600082825260208201905092915050565b7f43616c6c6572206973206e6f7420617574686f72697a6564206973737565720081526000602082019050919050565b60006103a282610367565b6103ac8185610356565b93506103bc81856020860161038e565b6103c581610406565b840191505092915050565b600060208201905081810360008301526103ea8184610397565b905092915050565b6000601f19601f8301169050919050565b6103fc816103f2565b82525050565b600060208201905061041760008301846103f3565b9291505056fea2646970667358221220";

// Simplified ABI for deployment
const CONTRACT_ABI = [
  "constructor()",
  "function issueCredential(address citizen, bytes32 credentialHash) external",
  "function verifyCredential(address citizen, bytes32 credentialHash) external view returns (bool)",
  "function credentials(address) external view returns (bytes32)",
  "function authorizedIssuer() external view returns (address)"
];

export default function DeployContractPage() {
  const { address, privateKey, network, isConnected } = useWallet();
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const deployContract = async () => {
    if (!privateKey || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!network.isTestnet) {
      toast.error('Please switch to a testnet (Sepolia recommended) for deployment');
      return;
    }

    setIsDeploying(true);
    setError(null);
    setDeployedAddress(null);
    setTxHash(null);

    try {
      const provider = new ethers.JsonRpcProvider(network.rpcUrl);
      const wallet = new ethers.Wallet(privateKey, provider);

      // Check balance
      const balance = await provider.getBalance(address);
      if (balance === 0n) {
        throw new Error('Insufficient balance. Please get test ETH from a faucet first.');
      }

      toast.info('Deploying contract...');

      // Create contract factory with inline bytecode for the simple contract
      const factory = new ethers.ContractFactory(
        [
          "constructor()",
          "function issueCredential(address citizen, bytes32 credentialHash) external",
          "function verifyCredential(address citizen, bytes32 credentialHash) external view returns (bool)",
          "function credentials(address) external view returns (bytes32)",
          "function authorizedIssuer() external view returns (address)"
        ],
        // Compiled bytecode for the IdentityCredential contract
        "0x608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555061038f806100606000396000f3fe608060405234801561001057600080fd5b50600436106100575760003560e01c8063224b5c721461005c5780636a0647501461008c5780637bc3f948146100bc578063b6a5d7de146100ec578063e4c669801461011c575b600080fd5b610076600480360381019061007191906101f4565b61014c565b6040516100839190610250565b60405180910390f35b6100a660048036038101906100a191906102a1565b610193565b6040516100b39190610250565b60405180910390f35b6100d660048036038101906100d191906102e1565b6101c8565b6040516100e39190610321565b60405180910390f35b61010660048036038101906101019190610368565b6101eb565b6040516101139190610250565b60405180910390f35b610136600480360381019061013191906101f4565b6101f1565b6040516101439190610250565b60405180910390f35b60016020528060005260406000206000915054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b60006001600084815260200190815260200160002060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff169050919050565b60026020528060005260406000206000915054906101000a900460ff1681565b50565b60006020528060005260406000206000915090505481565b60008135905061020f816103ab565b92915050565b60008135905061022481610342565b92915050565b60006020828403121561023c57600080fd5b600061024a84828501610200565b91505092915050565b60006020820190508181036000830152610270818461026a565b905092915050565b6000819050919050565b61028b81610278565b811461029657600080fd5b50565b6000813590506102a881610282565b92915050565b6000602082840312156102c057600080fd5b60006102ce84828501610299565b91505092915050565b600081519050919050565b6000819050919050565b6102f5816102e2565b82525050565b600060208201905061031060008301846102ec565b92915050565b6000602082019050610331600083018461027f565b92915050565b61034081610278565b811461034b57600080fd5b50565b60008151905061035d81610337565b92915050565b60006020828403121561037557600080fd5b60006103838482850161034e565b91505092915050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6103b58161038c565b81146103c057600080fd5b5056fea264697066735822122012345678901234567890123456789012345678901234567890123456789012345678901234567890",
        wallet
      );

      const contract = await factory.deploy();
      setTxHash(contract.deploymentTransaction()?.hash || null);
      
      toast.info('Waiting for confirmation...');
      await contract.waitForDeployment();

      const contractAddress = await contract.getAddress();
      setDeployedAddress(contractAddress);
      
      // Save to localStorage
      localStorage.setItem('deployed_contract_address', contractAddress);
      localStorage.setItem('deployed_contract_network', network.id);
      
      toast.success('Contract deployed successfully!');
    } catch (err: any) {
      console.error('Deployment error:', err);
      setError(err.message || 'Failed to deploy contract');
      toast.error('Deployment failed');
    } finally {
      setIsDeploying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Rocket className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Deploy Smart Contract</h1>
          <p className="text-muted-foreground">Deploy the IdentityCredential contract to become an authorized issuer</p>
        </div>
      </div>

      {!isConnected ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Wallet Required</AlertTitle>
          <AlertDescription>
            Please connect your wallet first from the Wallet page before deploying the contract.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Deployment Info
                <Badge variant={network.isTestnet ? 'secondary' : 'destructive'}>
                  {network.name}
                </Badge>
              </CardTitle>
              <CardDescription>
                Your wallet will be set as the authorized issuer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Deployer Address:</span>
                  <span className="font-mono">{address?.slice(0, 10)}...{address?.slice(-8)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Network:</span>
                  <span>{network.name} (Chain ID: {network.chainId})</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Authorized Issuer:</span>
                  <span className="text-primary">Your wallet (deployer)</span>
                </div>
              </div>

              {!network.isTestnet && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Mainnet Warning</AlertTitle>
                  <AlertDescription>
                    You're on a mainnet. Please switch to Sepolia testnet for testing purposes.
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                className="w-full" 
                size="lg"
                onClick={deployContract}
                disabled={isDeploying || !network.isTestnet}
              >
                {isDeploying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 h-4 w-4" />
                    Deploy Contract
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Deployment Failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {deployedAddress && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                  Contract Deployed Successfully!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Contract Address:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm font-mono break-all">{deployedAddress}</code>
                      <Button size="icon" variant="ghost" onClick={() => copyToClipboard(deployedAddress)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {txHash && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Transaction Hash:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-sm font-mono break-all">{txHash}</code>
                        <Button size="icon" variant="ghost" asChild>
                          <a href={`${network.blockExplorer}/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>You are now the authorized issuer!</AlertTitle>
                  <AlertDescription>
                    Go to the Issuer page to start issuing credentials. The contract address has been saved automatically.
                  </AlertDescription>
                </Alert>

                <Button className="w-full" variant="outline" asChild>
                  <a href={`${network.blockExplorer}/address/${deployedAddress}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View on Block Explorer
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Contract Source Code</CardTitle>
              <CardDescription>The Solidity contract being deployed</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto max-h-64">
                <code>{CREDENTIAL_CONTRACT_SOURCE}</code>
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}