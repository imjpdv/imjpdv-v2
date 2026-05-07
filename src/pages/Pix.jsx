import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import QrCodeDisplay from '@/components/pix/QrCodeDisplay';
import Onboarding from './Onboarding';
import AguardandoVinculacao from '@/components/AguardandoVinculacao';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ScanLine, CheckCircle2, RefreshCw } from 'lucide-react';
import FooterIgreja from '@/components/FooterIgreja';
import { toast } from 'sonner';

const API_BASE = 'https://api.imjpdv.com.br';
const POLLING_INTERVAL = 5000;

const DEFAULT_TEXTO_PIX = `<p>Utilize o formulário para realizar sua contribuição de forma rápida e segura. O processo é simples:</p><ul><li><strong>Informe o valor:</strong> Digite a quantia que deseja enviar no campo "Valor (R$)".</li><li><strong>Identifique-se:</strong> Insira o seu endereço de e-mail no campo "E-mail do pagador" para receber a confirmação da transação.</li><li><strong>Gere o código:</strong> Clique no botão "Gerar Pix" para criar o QR Code.</li><li>Após clicar, basta escanear o código com o aplicativo do seu banco ou copiar a chave "Pix Copia e Cola" para finalizar a operação instantaneamente.</li></ul>`;

export default function Pix() {
  const { user, loading: loadingUser } = useCurrentUser();
  const [churchSettings, setChurchSettings] = useState(null);

  useEffect(() => {
    if (!user?.igreja_id) return;
    base44.entities.ChurchSettings.filter({ igreja_id: user.igreja_id }, '-created_date', 1)
      .then(cs => setChurchSettings(cs[0] || null));
  }, [user?.igreja_id]);

  const [valorCents, setValorCents] = useState(0); // armazena em centavos
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState(null); // { id, qr_code, qr_code_64, status }
  const [status, setStatus] = useState(null);   // 'pending' | 'approved'
  const pollingRef = useRef(null);

  // Stop polling on unmount
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
      } catch {
        // silent — keep polling
      }
    }, POLLING_INTERVAL);
  };

  // Formata centavos para exibição: 150 → "1,50"
  const fmtCents = (cents) => {
    const str = String(cents).padStart(3, '0');
    const reais = str.slice(0, -2);
    const centavos = str.slice(-2);
    return `${reais},${centavos}`;
  };

  const handleValorChange = (e) => {
    // Remove tudo que não é dígito
    const digits = e.target.value.replace(/\D/g, '');
    const num = parseInt(digits || '0', 10);
    if (num <= 9999999) setValorCents(num);
  };

  const handleGerar = async () => {
    if (valorCents <= 0) {
      toast.error('Informe um valor válido.');
      return;
    }
    if (!email || !email.includes('@')) {
      toast.error('Informe um e-mail válido do pagador.');
      return;
    }

    const valorNum = valorCents / 100;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/process_payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_amount: valorNum,
          payer: { email },
        }),
      });

      if (!res.ok) throw new Error(`Erro ${res.status}`);
      const data = await res.json();

      setPayment({
        id: data.id,
        qr_code: data.qr_code,
        qr_code_64: data.qr_code_64,
      });
      setStatus('pending');
      startPolling(data.id);
    } catch (err) {
      toast.error('Não foi possível gerar o Pix. Verifique a conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleNovo = () => {
    clearInterval(pollingRef.current);
    setPayment(null);
    setStatus(null);
    setValorCents(0);
    setEmail('');
  };

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (loadingUser) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
  if (user && !user.igreja_id) {
    if (user.role === 'admin') return <Onboarding user={user} onComplete={() => window.location.reload()} />;
    return <AguardandoVinculacao user={user} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-4 md:p-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <ScanLine className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Pix</h1>
            <p className="text-sm font-body text-muted-foreground">Gere sua contribuição via QR Code de forma instantânea.</p>
          </div>
        </div>

        {/* ── Sucesso ── */}
        {status === 'approved' && (
          <div className="bg-card rounded-2xl shadow-sacred p-8 flex flex-col items-center gap-5 text-center">
            <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-secondary" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-secondary">Pagamento Confirmado!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                O pagamento foi aprovado com sucesso.
              </p>
            </div>
            <Button onClick={handleNovo} className="btn-sacred gap-2 mt-2">
            <RefreshCw className="w-4 h-4" /> Nova Contribuição
            </Button>
          </div>
        )}

        {/* ── QR Code exibido ── */}
        {status === 'pending' && payment && (
          <div className="bg-card rounded-2xl shadow-sacred p-6 space-y-4">
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">Escaneie ou copie o código abaixo</p>
              <div className="flex items-center justify-center gap-1.5 text-xs text-amber-600">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Aguardando pagamento...
              </div>
            </div>
            <QrCodeDisplay
              qrCode={payment.qr_code}
              qrCode64={payment.qr_code_64}
              paymentId={payment.id}
            />
            <Button variant="outline" size="sm" className="w-full" onClick={handleNovo}>
              Cancelar e gerar novo
            </Button>
          </div>
        )}

        {/* ── Formulário ── */}
        {!status && (
          <div className="bg-card rounded-2xl shadow-sacred p-6 space-y-5">
            {/* Instruções */}
            {(churchSettings?.texto_pix || DEFAULT_TEXTO_PIX) && (
              <div className="bg-muted/50 rounded-xl px-4 py-4">
                <div
                  className="prose prose-sm max-w-none text-muted-foreground leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: churchSettings?.texto_pix || DEFAULT_TEXTO_PIX }}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">R$</span>
                <Input
                  id="valor"
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={valorCents > 0 ? fmtCents(valorCents) : ''}
                  onChange={handleValorChange}
                  className="pl-9 text-right font-mono text-lg"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail do pagador</Label>
              <Input
                id="email"
                type="email"
                placeholder="pagador@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button
              className="w-full btn-sacred gap-2"
              size="lg"
              onClick={handleGerar}
              disabled={loading}
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
                : <><ScanLine className="w-4 h-4" /> Gerar Pix</>
              }
            </Button>
          </div>
        )}

      </div>

      <FooterIgreja />
    </div>
  );
}