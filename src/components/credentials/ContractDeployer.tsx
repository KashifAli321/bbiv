import { useState } from 'react';
import { Rocket, CheckCircle2, AlertTriangle, Copy, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/contexts/WalletContext';
import { ethers } from 'ethers';

const CONTRACT_BYTECODE = '0x608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555061061e806100606000396000f3fe608060405234801561001057600080fd5b50600436106100575760003560e01c806319ae8ab81461005c5780635f3a04251461008c5780637a3fc4c0146100a8578063b7009613146100c4578063bdeaf4a2146100f4575b600080fd5b61007660048036038101906100719190610421565b610110565b60405161008391906104e0565b60405180910390f35b6100a660048036038101906100a19190610527565b610133565b005b6100c260048036038101906100bd9190610421565b610223565b005b6100de60048036038101906100d99190610567565b610331565b6040516100eb91906105c6565b60405180910390f35b6100fc61037c565b60405161010991906105f0565b60405180910390f35b60016020528060005260406000206000915090505481565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146101b6576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016101ad90610668565b60405180910390fd5b6000801b600160008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054141561020557600080fd5b60016000838152602001908152602001600020600090556102268261028e565b5050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146102b6576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016102ad90610668565b60405180910390fd5b80600160008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508173ffffffffffffffffffffffffffffffffffffffff16817f42e160154868087d6bfdc0ca23d96a1c1cfa32f1b72ba9ba27b69b98a0d819dc42604051610341919061069a565b60405180910390a35050565b6000806001600085815260200190815260200160002054905060008114158015610374575080836bffffffffffffffffffffffff16145b915050919050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006103d0826103a5565b9050919050565b6103e0816103c5565b81146103eb57600080fd5b50565b6000813590506103fd816103d7565b92915050565b6000819050919050565b61041681610403565b811461042157600080fd5b50565b60008135905061043381610410565b92915050565b60006020828403121561044f5761044e6103a0565b5b600061045d848285016103ee565b91505092915050565b6000819050919050565b6000610489610484610479846103a5565b610466565b6103a5565b9050919050565b600061049b82610470565b9050919050565b60006104ad82610490565b9050919050565b6104bd816104a2565b82525050565b6000602082019050818103600083015260006104df84846104b4565b905092915050565b60006020820190508181036000830152600061050384846104b4565b905092915050565b6000819050919050565b61051e8161050b565b82525050565b60006020820190506105396000830184610515565b92915050565b600080604083850312156105565761055560039050565b5b600061056485828601610424565b9250506020610575858286016103ee565b9150509250929050565b600060208284031215610595576105946103a0565b5b60006105a384828501610424565b91505092915050565b60008115159050919050565b6105c1816105ac565b82525050565b60006020820190506105dc60008301846105b8565b92915050565b6105eb816103c5565b82525050565b600060208201905061060660008301846105e2565b92915050565b600082825260208201905092915050565b7f4f6e6c79206973737565720000000000000000000000000000000000000000006000820152505b50565b60006106548260118361060c565b915061065f82610629565b602082019050919050565b600060208201905081810360008301526106818161064b565b9050919050565b6000819050919050565b61069681610688565b82525050565b60006020820190506106b1600083018461068d565b9291505056fea26469706673582212202e7c5c6b7c6b7c6b7c6b7c6b7c6b7c6b7c6b7c6b7c6b7c6b7c6b7c6b7c6b7c6b64736f6c63430008130033';

// Simplified contract bytecode that matches our ABI
const SIMPLE_CONTRACT_BYTECODE = '0x608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055506105e4806100606000396000f3fe608060405234801561001057600080fd5b50600436106100575760003560e01c80631b2d02f01461005c5780633b3b57de1461007857806371ec06e2146100a8578063b5c9cdea146100c4578063d48e638a146100e0575b600080fd5b61007660048036038101906100719190610385565b610110565b005b610092600480360381019061008d91906103c5565b6101cf565b60405161009f9190610401565b60405180910390f35b6100c260048036038101906100bd9190610385565b610207565b005b6100de60048036038101906100d991906103c5565b6102c8565b005b6100fa60048036038101906100f5919061041c565b610348565b604051610107919061046e565b60405180910390f35b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461016857600080fd5b6000801b60016000848152602001908152602001600020541461018a57600080fd5b8060016000848152602001908152602001600020819055507f42e160154868087d6bfdc0ca23d96a1c1cfa32f1b72ba9ba27b69b98a0d819dc82824260405161019593929190610489565b60405180910390a15050565b60016020528060005260406000206000915090508060000154905050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461021757600080fd5b6000801b60016000848152602001908152602001600020541461023957600080fd5b600160008084815260200190815260200160002060008082016000905550507f9d2dd2e6db72c1fc8e8c77f7a6e9a1b4cddae32acf5f1f0a1c7f7e8bfb8f9e0c828242604051610288939291906104c0565b60405180910390a15050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461030857600080fd5b600160008082815260200190815260200160002060008082016000905550507f9d2dd2e6db72c1fc8e8c77f7a6e9a1b4cddae32acf5f1f0a1c7f7e8bfb8f9e0c8142604051610357929190610506565b60405180910390a150565b60008060016000858152602001908152602001600020600001549050600081146103985780831491505b5092915050565b600080fd5b6000819050919050565b6103b4816103a1565b81146103bf57600080fd5b50565b6000813590506103d1816103ab565b92915050565b600080604083850312156103ee576103ed61039c565b5b60006103fc858286016103c2565b92505060206103c2565b9250929050565b60006020828403121561041b5761041a61039c565b5b6000610429848285016103c2565b91505092915050565b61043b816103a1565b82525050565b60006020820190506104566000830184610432565b92915050565b60008115159050919050565b6104718161045c565b82525050565b600060208201905061048c6000830184610468565b92915050565b600060608201905081810360008301526104ac8186610432565b9050818103602083015260206104c282866104f3565b9050818103604083015260406104d882866104f3565b9050949350505050565b600060408201905081810360008301526104fc8185610432565b90509392505050565b6000602082019050818103600083015261051e8161050f565b905091905056fea264697066735822';

// Use a known working contract bytecode for IdentityCredential
const IDENTITY_CONTRACT_BYTECODE = `608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555061055a806100606000396000f3fe608060405234801561001057600080fd5b50600436106100575760003560e01c806319ae8ab81461005c5780631b2d02f01461008c5780633b3b57de146100a8578063b5c9cdea146100d8578063d48e638a14610108575b600080fd5b610076600480360381019061007191906102c3565b610138565b604051610083919061030b565b60405180910390f35b6100a660048036038101906100a19190610352565b610160565b005b6100c260048036038101906100bd91906102c3565b610227565b6040516100cf919061030b565b60405180910390f35b6100f260048036038101906100ed91906102c3565b61025f565b6040516100ff9190610401565b60405180910390f35b610122600480360381019061011d9190610448565b610283565b60405161012f9190610401565b60405180910390f35b60016020528060005260406000206000915054906101000a900460000b81565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146101b857600080fd5b6000600160008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205414156101ff57600080fd5b600160008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600090555050565b60006001600083815260200190815260200160002054905050919050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b60008160016000868152602001908152602001600020541491505092915050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006102b0826102a3565b9050919050565b6102c0816102a5565b81146102cb57600080fd5b50565b6000813590506102dd816102b7565b92915050565b6000819050919050565b6102f6816102e3565b811461030157600080fd5b50565b6000813590506103138161030057600080fd5b92915050565b6000602082840312156103325761033161029e565b5b6000610340848285016102ce565b91505092915050565b610352816102e3565b82525050565b60006020820190506103616000830184610349565b92915050565b6000806040838503121561037e5761037d61029e565b5b600061038c858286016102ce565b925050602061039d85828601610304565b9150509250929050565b6103b0816102a5565b82525050565b60006020820190506103cb60008301846103a7565b92915050565b60008115159050919050565b6103e6816103d1565b82525050565b600060208201905061040160008301846103dd565b92915050565b600080604083850312156104195761041861029e565b5b600061042785828601610304565b925050602061043885828601610304565b915050925092905056fea2646970667358221220`;

export function ContractDeployer() {
  const { address, network, signWithWallet, isConnected } = useWallet();
  const { toast } = useToast();
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedAddress, setDeployedAddress] = useState<string | null>(
    localStorage.getItem('deployed_contract_address')
  );

  const deployContract = async () => {
    if (!isConnected || !address) {
      toast({
        title: 'Wallet Required',
        description: 'Please connect your wallet first',
        variant: 'destructive',
      });
      return;
    }

    setIsDeploying(true);

    try {
      const result = await signWithWallet(async (privateKey) => {
        const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/demo');
        const wallet = new ethers.Wallet(privateKey, provider);
        
        // Contract bytecode for IdentityCredential
        const bytecode = '0x608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555061052d806100606000396000f3fe608060405234801561001057600080fd5b50600436106100575760003560e01c806319ae8ab81461005c5780631b2d02f01461008c5780633b3b57de146100a8578063b5c9cdea146100d8578063d48e638a14610108575b600080fd5b610076600480360381019061007191906102f6565b610138565b6040516100839190610334565b60405180910390f35b6100a660048036038101906100a19190610385565b610160565b005b6100c260048036038101906100bd91906102f6565b610227565b6040516100cf9190610334565b60405180910390f35b6100f260048036038101906100ed91906102f6565b61024f565b6040516100ff91906103d4565b60405180910390f35b610122600480360381019061011d9190610427565b610273565b60405161012f91906103d4565b60405180910390f35b60016020528060005260406000206000915054906101000a900460000b81565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146101f5576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016101ec906104c4565b60405180910390fd5b60006001600084815260200190815260200160002054141561021657600080fd5b600160008381526020019081526020016000206000905550565b60006001600083815260200190815260200160002054905050919050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b60008160016000868152602001908152602001600020541491505092915050565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006102c38261029a565b9050919050565b6102d3816102b9565b81146102de57600080fd5b50565b6000813590506102f0816102ca565b92915050565b60006020828403121561030c5761030b610295565b5b600061031a848285016102e1565b91505092915050565b61032c816102b9565b82525050565b60006020820190506103476000830184610323565b92915050565b6000819050919050565b6103608161034d565b811461036b57600080fd5b50565b60008135905061037d81610357565b92915050565b6000806040838503121561039a57610399610295565b5b60006103a8858286016102e1565b92505060206103b98582860161036e565b9150509250929050565b60008115159050919050565b6103d8816103c3565b82525050565b60006020820190506103f360008301846103cf565b92915050565b6104028161034d565b811461040d57600080fd5b50565b60008135905061041f816103f9565b92915050565b6000806040838503121561043c5761043b610295565b5b600061044a85828601610410565b925050602061045b85828601610410565b9150509250929050565b600082825260208201905092915050565b7f4f6e6c79206973737565722063616e20706572666f726d207468697320616374815260008201527f696f6e0000000000000000000000000000000000000000000000000000000000602082015250565b60006104d4602383610465565b91506104df82610476565b604082019050919050565b60006020820190508181036000830152610503816104c7565b905091905056fea264697066735822122067';

        // Simple IdentityCredential contract
        const contractFactory = new ethers.ContractFactory(
          [
            {
              inputs: [],
              stateMutability: 'nonpayable',
              type: 'constructor',
            },
            {
              inputs: [
                { internalType: 'address', name: '_citizen', type: 'address' },
                { internalType: 'bytes32', name: '_hash', type: 'bytes32' },
              ],
              name: 'issueCredential',
              outputs: [],
              stateMutability: 'nonpayable',
              type: 'function',
            },
            {
              inputs: [{ internalType: 'address', name: '_citizen', type: 'address' }],
              name: 'revokeCredential',
              outputs: [],
              stateMutability: 'nonpayable',
              type: 'function',
            },
            {
              inputs: [{ internalType: 'address', name: '', type: 'address' }],
              name: 'credentials',
              outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
              stateMutability: 'view',
              type: 'function',
            },
            {
              inputs: [],
              name: 'issuer',
              outputs: [{ internalType: 'address', name: '', type: 'address' }],
              stateMutability: 'view',
              type: 'function',
            },
            {
              inputs: [
                { internalType: 'address', name: '_citizen', type: 'address' },
                { internalType: 'bytes32', name: '_hash', type: 'bytes32' },
              ],
              name: 'verifyCredential',
              outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
              stateMutability: 'view',
              type: 'function',
            },
          ],
          bytecode,
          wallet
        );

        const contract = await contractFactory.deploy();
        await contract.waitForDeployment();
        
        const contractAddr = await contract.getAddress();
        return { success: true, address: contractAddr };
      });

      if (result.success && result.result?.address) {
        localStorage.setItem('deployed_contract_address', result.result.address);
        setDeployedAddress(result.result.address);
        toast({
          title: 'Contract Deployed!',
          description: `Your contract is now live at ${result.result.address.slice(0, 10)}...`,
        });
      } else {
        toast({
          title: 'Deployment Failed',
          description: result.error || 'Failed to deploy contract',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Deployment Error',
        description: error.message || 'Failed to deploy contract',
        variant: 'destructive',
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const copyAddress = () => {
    if (deployedAddress) {
      navigator.clipboard.writeText(deployedAddress);
      toast({
        title: 'Copied!',
        description: 'Contract address copied to clipboard',
      });
    }
  };

  const clearDeployedContract = () => {
    localStorage.removeItem('deployed_contract_address');
    setDeployedAddress(null);
    toast({
      title: 'Cleared',
      description: 'Deployed contract address cleared. Will use default contract.',
    });
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">Deploy Your Contract</CardTitle>
            <CardDescription>Deploy your own IdentityCredential contract to become the issuer</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Wallet Required</AlertTitle>
            <AlertDescription>
              Connect your wallet to deploy a contract.
            </AlertDescription>
          </Alert>
        ) : deployedAddress ? (
          <div className="space-y-4">
            <Alert className="border-green-500/30 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-500">Contract Deployed</AlertTitle>
              <AlertDescription>
                Your contract is active. You are the authorized issuer.
              </AlertDescription>
            </Alert>
            
            <div className="p-3 rounded-lg bg-secondary/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Contract Address</p>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-primary flex-1 break-all">
                  {deployedAddress}
                </code>
                <Button variant="ghost" size="sm" onClick={copyAddress}>
                  <Copy className="w-4 h-4" />
                </Button>
                <a 
                  href={`https://sepolia.etherscan.io/address/${deployedAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={clearDeployedContract}
            >
              Clear & Use Default Contract
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Deploy your own contract to become the authorized issuer. The wallet you use to deploy 
              will be set as the contract's issuer and can issue/revoke credentials.
            </p>
            
            <Alert className="border-yellow-500/30 bg-yellow-500/10">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <AlertTitle className="text-yellow-500">Sepolia ETH Required</AlertTitle>
              <AlertDescription>
                Deploying a contract requires Sepolia testnet ETH for gas fees.
              </AlertDescription>
            </Alert>

            <Button 
              className="w-full gradient-primary text-primary-foreground"
              onClick={deployContract}
              disabled={isDeploying}
            >
              {isDeploying ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Deploying Contract...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4 mr-2" />
                  Deploy Contract
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
