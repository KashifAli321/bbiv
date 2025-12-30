import { Shield, Users, FileCheck, Lock, Zap, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
  {
    icon: Shield,
    title: 'Blockchain Security',
    description: 'Credentials are stored on the Ethereum blockchain, making them immutable and tamper-proof.',
  },
  {
    icon: Lock,
    title: 'Cryptographic Verification',
    description: 'Advanced cryptography ensures only authorized issuers can create valid credentials.',
  },
  {
    icon: Globe,
    title: 'Multi-Network Support',
    description: 'Support for multiple testnets and mainnets including Sepolia, Polygon, BSC, and more.',
  },
  {
    icon: Zap,
    title: 'Instant Verification',
    description: 'Verify any credential instantly by querying the blockchain directly.',
  },
  {
    icon: Users,
    title: 'Decentralized Identity',
    description: 'Users control their own identity without relying on central authorities.',
  },
  {
    icon: FileCheck,
    title: 'Verifiable Credentials',
    description: 'Issue and verify identity credentials that can be cryptographically proven.',
  },
];

const roles = [
  {
    title: 'User Portal',
    description: 'View your identity credentials and manage your blockchain wallet',
    icon: Users,
    path: '/user',
    color: 'from-blue-500 to-purple-600',
  },
  {
    title: 'Credential Issuer',
    description: 'Issue verifiable identity credentials to citizens on the blockchain',
    icon: FileCheck,
    path: '/issuer',
    color: 'from-green-500 to-teal-600',
  },
  {
    title: 'Credential Verifier',
    description: 'Verify the authenticity of identity credentials',
    icon: Shield,
    path: '/verifier',
    color: 'from-orange-500 to-red-600',
  },
];

export default function Index() {
  return (
    <div className="container mx-auto px-4">
      {/* Welcome Message */}
      <section className="text-center py-8">
        <Card className="border-primary/30 bg-primary/5 animate-fade-in hover-scale">
          <CardContent className="pt-6 flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mb-4 animate-scale-in shadow-[0_0_20px_hsl(var(--primary)/0.5)] animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]">
              <Shield className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-primary mb-2">Welcome to BlockID</h2>
            <p className="text-muted-foreground">
              <span className="font-semibold">Complete Name:</span> Blockchain Based Identity Verification
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Hero Section */}
      <section className="text-center py-12 md:py-20">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-sm text-primary">Powered by Blockchain Technology</span>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          <span className="text-gradient">Blockchain Based</span>
          <br />
          <span className="text-foreground">Identity Verification</span>
        </h1>
        
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          A secure, decentralized identity verification system built on Ethereum. 
          Issue, manage, and verify identity credentials with cryptographic certainty.
        </p>
        
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/wallet">
            <Button size="lg" className="gradient-primary text-primary-foreground glow-primary">
              <Lock className="w-5 h-5 mr-2" />
              Connect Wallet
            </Button>
          </Link>
          <Link to="/verifier">
            <Button size="lg" variant="outline" className="border-primary/50">
              <Shield className="w-5 h-5 mr-2" />
              Verify Credential
            </Button>
          </Link>
        </div>
      </section>

      {/* Role Cards */}
      <section className="py-12">
        <h2 className="text-2xl font-bold text-center mb-8">Choose Your Role</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Link key={role.path} to={role.path}>
                <Card className="h-full border-border bg-card hover:border-primary/50 transition-all hover:-translate-y-1 cursor-pointer group">
                  <CardHeader>
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <CardTitle>{role.title}</CardTitle>
                    <CardDescription>{role.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Features */}
      <section className="py-12">
        <h2 className="text-2xl font-bold text-center mb-2">Why Blockchain Identity?</h2>
        <p className="text-muted-foreground text-center mb-8 max-w-xl mx-auto">
          Traditional identity systems are centralized and vulnerable. Blockchain provides a secure, tamper-proof alternative.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="border-border bg-card/50">
                <CardHeader>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Smart Contract Info */}
      <section className="py-12">
        <Card className="border-border bg-card border-glow">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Smart Contract</CardTitle>
            <CardDescription>
              Identity credentials are managed by a verified smart contract on the Sepolia testnet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg bg-secondary font-mono text-sm text-center break-all">
              0xfB5E4033246E11851d9AC9f19109F734400f2Fc0
            </div>
            <div className="flex justify-center mt-4">
              <Button
                variant="outline"
                onClick={() => window.open('https://sepolia.etherscan.io/address/0xfB5E4033246E11851d9AC9f19109F734400f2Fc0', '_blank')}
              >
                View on Etherscan
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center border-t border-border mt-12">
        <p className="text-sm text-muted-foreground">
          Final Year Project by Kashif Sattar • The Islamia University of Bahawalpur
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Supervisor: Ma'am Tayyaba Rashid • Session 2022-2026
        </p>
      </footer>
    </div>
  );
}
