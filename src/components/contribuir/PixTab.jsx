import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import QrCodeDisplay from '@/components/pix/QrCodeDisplay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ScanLine, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = 'https://api.imjpdv.com.br';
const POLLING_INTERVAL = 5000;

const DEFAULT_TEXTO_PIX = `<p>Utilize o formulário para realizar sua contribuição de forma rápida e segura. Informe o valor, seu e-mail e clique em "Gerar Pix" para criar o QR Code.</p>`;

export default function PixTab() {
  const { user } = useCurrentUser();
  const [churchSettings, setChurchSettings] = useState(null);
  const [valorCents, setValorCents] = useState(0);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState(null);
  const [status, setStatus] = useState(null);
  const pollingRef = useRef(null);

  useEffect(() => {
    if (!user?.igreja_id) return;
    base44.entities.ChurchSettings.filter({ igreja_id: user.igreja_id }, '-created_date', 1)
      .then(cs => setChurchSettings(cs[0] || null));
  }, [user?.igreja_id]);

  useEffect(() => () => clearInterval(pollingRef.current), []);

  const startPolling = (paymentId) => {
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/check_payment/${paymentId}`);
        const data = await res.json();
        if (data.status === 'approved') {
          setStatus('approved');
          clearInterval(pollingRef.current);
        }
      } catch { /* silent */ }
    }, POLLING_INTERVAL);
  };

  const fmtCents = (cents) => {
    const str = String(cents).padStart(3, '0');
    return `${str.slice(0, -2)},${str.slice(-2)}`;
  };

  const handleValorChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '');
    const num = parseInt(digits || '0', 10);
    if (num <= 9999999) setValorCents(num);
  };

  const handleGerar = async () => {
    if (valorCents <= 0) { toast.error('Informe um valor válido.'); return; }
    if (!email || !email.includes('@')) { toast.error('Informe um e-mail válido.'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/process_payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_amount: valorCents / 100, payer: { email } }),
      });
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      const data = await res.json();
      setPayment({ id: data.id, qr_code: data.qr_code, qr_code_64: data.qr_code_64 });
      setStatus('pending');
      startPolling(data.id);
    } catch {
      toast.error('Não foi possível gerar o Pix.');
    } finally {
      setLoading(false);
    }
  };

  const handleNovo = () => {
    clearInterval(pollingRef.current);
    setPayment(null); setStatus(null); setValorCents(0); setEmail('');
  };

  if (status === 'approved') return (
    <div className="bg-card rounded-2xl shadow-sacred p-8 flex flex-col items-center gap-5 text-center">
      <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center">
        <CheckCircle2 className="w-10 h-10 text-secondary" strokeWidth={1.5} />
      </div>
      <div>
        <h2 className="text-xl font-display font-bold text-secondary">Pagamento Confirmado!</h2>
        <p className="text-sm text-muted-foreground mt-1">O pagamento foi aprovado com sucesso.</p>
      </div>
      <Button onClick={handleNovo} className="btn-sacred gap-2 mt-2">
        <RefreshCw className="w-4 h-4" /> Nova Contribuição
      </Button>
    </div>
  );

  if (status === 'pending' && payment) return (
    <div className="bg-card rounded-2xl shadow-sacred p-6 space-y-4">
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground">Escaneie ou copie o código abaixo</p>
        <div className="flex items-center justify-center gap-1.5 text-xs text-amber-600">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Aguardando pagamento...
        </div>
      </div>
      <QrCodeDisplay qrCode={payment.qr_code} qrCode64={payment.qr_code_64} paymentId={payment.id} />
      <Button variant="outline" size="sm" className="w-full" onClick={handleNovo}>Cancelar e gerar novo</Button>
    </div>
  );

  return (
    <div className="bg-card rounded-2xl shadow-sacred p-6 space-y-5">
      {churchSettings?.imagem_pix && (
        <div className="flex justify-center">
          <img src={churchSettings.imagem_pix} alt="" className="max-w-full max-h-48 object-contain rounded-xl" />
        </div>
      )}
      {(churchSettings?.texto_pix || DEFAULT_TEXTO_PIX) && (
        <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed"
          dangerouslySetInnerHTML={{ __html: churchSettings?.texto_pix || DEFAULT_TEXTO_PIX }} />
      )}
      <div className="space-y-2">
        <Label htmlFor="pix-valor">Valor (R$)</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">R$</span>
          <Input id="pix-valor" type="text" inputMode="numeric" placeholder="0,00"
            value={valorCents > 0 ? fmtCents(valorCents) : ''}
            onChange={handleValorChange}
            className="pl-9 text-right font-mono text-lg" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="pix-email">E-mail do pagador</Label>
        <Input id="pix-email" type="email" placeholder="pagador@email.com"
          value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <Button className="w-full btn-sacred gap-2" size="lg" onClick={handleGerar} disabled={loading}>
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> : <><ScanLine className="w-4 h-4" /> Gerar Pix</>}
      </Button>
    </div>
  );
}