import { NETWORKS, TESTNET_IDS, MAINNET_IDS, Network } from '@/lib/networks';
import { useWallet } from '@/contexts/WalletContext';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export function NetworkSelector() {
  const { network, setNetwork } = useWallet();

  return (
    <Select value={network.id} onValueChange={setNetwork}>
      <SelectTrigger className="w-full sm:w-[200px] bg-secondary border-border">
        <SelectValue>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${network.isTestnet ? 'bg-warning' : 'bg-green-500'}`} />
            <span>{network.name}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-card border-border">
        <SelectGroup>
          <SelectLabel className="text-muted-foreground">Testnets</SelectLabel>
          {TESTNET_IDS.map((id) => {
            const net = NETWORKS[id];
            return (
              <SelectItem key={id} value={id} className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-warning" />
                  <span>{net.name}</span>
                  <Badge variant="outline" className="text-xs ml-auto">
                    {net.symbol}
                  </Badge>
                </div>
              </SelectItem>
            );
          })}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel className="text-muted-foreground">Mainnets</SelectLabel>
          {MAINNET_IDS.map((id) => {
            const net = NETWORKS[id];
            return (
              <SelectItem key={id} value={id} className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>{net.name}</span>
                  <Badge variant="outline" className="text-xs ml-auto">
                    {net.symbol}
                  </Badge>
                </div>
              </SelectItem>
            );
          })}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
