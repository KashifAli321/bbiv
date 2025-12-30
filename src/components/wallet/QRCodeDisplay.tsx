import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { QrCode, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRCodeDisplayProps {
  value: string;
  title?: string;
  size?: number;
  showCopyButton?: boolean;
}

export function QRCodeDisplay({ value, title = "QR Code", size = 200, showCopyButton = true }: QRCodeDisplayProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Value copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="p-4 bg-white rounded-lg">
        <QRCodeSVG
          value={value}
          size={size}
          level="H"
          includeMargin={true}
        />
      </div>
      <p className="text-xs text-muted-foreground font-mono break-all max-w-[250px] text-center">
        {value.length > 42 ? `${value.slice(0, 20)}...${value.slice(-20)}` : value}
      </p>
      {showCopyButton && (
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </>
          )}
        </Button>
      )}
    </div>
  );
}

interface QRCodeButtonProps {
  value: string;
  title?: string;
  buttonText?: string;
  buttonVariant?: 'default' | 'outline' | 'ghost' | 'secondary';
}

export function QRCodeButton({ value, title = "QR Code", buttonText = "Show QR", buttonVariant = "outline" }: QRCodeButtonProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size="sm">
          <QrCode className="w-4 h-4 mr-2" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center py-4">
          <QRCodeDisplay value={value} title={title} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
