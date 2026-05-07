import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function QrCodeDisplay({ qrCode, qrCode64, paymentId }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(qrCode);
    setCopied(true);
    toast.success('Código Pix copiado!');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="flex flex-col items-center gap-5">
      {/* QR Code image */}
      <div className="p-4 bg-white rounded-2xl shadow-sacred border border-border">
        <img
          src={`data:image/png;base64,${qrCode64}`}
          alt="QR Code Pix"
          className="w-52 h-52 object-contain"
        />
      </div>

      {/* Copia e cola */}
      <div className="w-full max-w-sm">
        <p className="text-sm font-semibold text-foreground mb-0.5 text-center">Código Pix</p>
        <p className="text-xs text-muted-foreground mb-2 text-center leading-relaxed">
          Copie o código abaixo e utilize o Pix Copia e Cola no aplicativo que você vai fazer o pagamento:
        </p>
        <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
          <p className="flex-1 text-xs font-mono text-foreground truncate">{qrCode}</p>
          <button
            onClick={handleCopy}
            className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-secondary" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <Button
        onClick={handleCopy}
        className="w-full max-w-sm btn-sacred gap-2"
        size="lg"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? 'Copiado!' : 'Copiar Código Pix'}
      </Button>

      <p className="text-xs text-muted-foreground">
        ID do pagamento: <span className="font-mono">{paymentId}</span>
      </p>
    </div>
  );
}