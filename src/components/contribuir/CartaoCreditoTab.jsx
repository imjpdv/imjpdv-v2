import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CreditCard, CheckCircle2, RefreshCw, ShieldCheck, Lock, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

// ─── Helpers ────────────────────────────────────────────────────────────────

function loadMPScript() {
  return new Promise((resolve, reject) => {
    if (window.MercadoPago) { resolve(); return; }
    const existing = document.querySelector('script[src="https://sdk.mercadopago.com/js/v2"]');
    if (existing) {
      existing.addEventListener('load', resolve);
      existing.addEventListener('error', reject);
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://sdk.mercadopago.com/js/v2';
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function formatCardNumber(v) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function formatExpiry(v) {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

function formatCpf(v) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function fmtCents(cents) {
  const s = String(cents).padStart(3, '0');
  return `${s.slice(0, -2)},${s.slice(-2)}`;
}

// Brand icons as simple SVG-like badges
const BRAND_LOGOS = [
  { label: 'Mastercard', color: '#EB001B', color2: '#F79E1B' },
  { label: 'Visa', color: '#1A1F71' },
  { label: 'Elo', color: '#FFD500' },
  { label: 'Hipercard', color: '#B30000' },
  { label: 'Amex', color: '#2E77BC' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function CartaoCreditoTab() {
  const { user } = useCurrentUser();
  const mpRef = useRef(null);

  const [churchSettings, setChurchSettings] = useState(null);
  const [mpReady, setMpReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // null | 'approved' | 'pending'

  // Form fields
  const [valorCents, setValorCents] = useState(0);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [docType, setDocType] = useState('CPF');
  const [docNumber, setDocNumber] = useState('');
  const [email, setEmail] = useState('');

  // Derived from BIN lookup
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [issuerId, setIssuerId] = useState('');
  const [installmentOptions, setInstallmentOptions] = useState([]);
  const [selectedInstallment, setSelectedInstallment] = useState(1);
  const [detectedBrand, setDetectedBrand] = useState('');

  // ── Load church settings + MP SDK
  useEffect(() => {
    if (!user?.igreja_id) return;
    base44.entities.ChurchSettings.filter({ igreja_id: user.igreja_id }, '-created_date', 1)
      .then(cs => setChurchSettings(cs[0] || null));
  }, [user?.igreja_id]);

  useEffect(() => {
    if (!churchSettings) return;
    const publicKey = (churchSettings.mp_public_key || '').trim();
    if (!publicKey) { setLoadError('Public Key do Mercado Pago não configurada.'); return; }

    let mounted = true;
    loadMPScript().then(() => {
      if (!mounted) return;
      try {
        const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR', advancedFraudPrevention: true });
        mpRef.current = mp;
        console.log('[MP] SDK inicializado. Env:', publicKey.startsWith('TEST-') ? 'TESTE' : 'PRODUÇÃO');
        setMpReady(true);
      } catch (e) {
        console.error('[MP] Erro ao inicializar SDK:', e);
        setLoadError('Falha ao inicializar o SDK do Mercado Pago.');
      }
    }).catch(e => {
      console.error('[MP] Erro ao carregar script:', e);
      if (mounted) setLoadError('Erro ao carregar o script do Mercado Pago.');
    });
    return () => { mounted = false; };
  }, [churchSettings]);

  // ── BIN lookup: paymentMethod + issuer + installments
  useEffect(() => {
    const bin = cardNumber.replace(/\s/g, '');
    if (bin.length < 6 || !mpRef.current || valorCents <= 0) return;

    const lookup = async () => {
      try {
        console.log('[MP] BIN lookup:', bin.slice(0, 6));

        // 1. Payment method
        const methods = await mpRef.current.getPaymentMethods({ bin: bin.slice(0, 6) });
        const method = methods?.results?.[0];
        if (!method) { setPaymentMethodId(''); setDetectedBrand(''); return; }
        setPaymentMethodId(method.id);
        setDetectedBrand(method.name);
        console.log('[MP] payment_method_id:', method.id, '| marca:', method.name);

        // 2. Issuer
        const issuers = await mpRef.current.getIssuers({ paymentMethodId: method.id, bin: bin.slice(0, 6) });
        const issuer = issuers?.[0];
        if (issuer) {
          setIssuerId(String(issuer.id));
          console.log('[MP] issuer_id:', issuer.id, '| banco:', issuer.name);
        }

        // 3. Installments
        const instData = await mpRef.current.getInstallments({
          amount: String(valorCents / 100),
          bin: bin.slice(0, 6),
          paymentMethodId: method.id,
        });
        const opts = instData?.[0]?.payer_costs || [];
        setInstallmentOptions(opts);
        if (opts.length > 0) setSelectedInstallment(opts[0].installments);
        console.log('[MP] Parcelas disponíveis:', opts.map(o => o.installments));
      } catch (e) {
        console.warn('[MP] BIN lookup falhou:', e.message);
      }
    };

    const timer = setTimeout(lookup, 400);
    return () => clearTimeout(timer);
  }, [cardNumber, valorCents]);

  // ── Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (valorCents <= 0) { toast.error('Informe um valor válido.'); return; }
    if (!email || !email.includes('@')) { toast.error('Informe um e-mail válido.'); return; }
    if (cardNumber.replace(/\s/g, '').length < 15) { toast.error('Número do cartão inválido.'); return; }
    if (expiry.length < 5) { toast.error('Data de validade inválida.'); return; }
    if (cvv.length < 3) { toast.error('CVV inválido.'); return; }
    if (!cardName.trim()) { toast.error('Informe o nome no cartão.'); return; }
    if (docNumber.replace(/\D/g, '').length < 11) { toast.error('Informe o CPF do titular.'); return; }
    if (!paymentMethodId) { toast.error('Não foi possível identificar a bandeira do cartão.'); return; }
    if (!mpRef.current) { toast.error('SDK do Mercado Pago não carregado.'); return; }

    setLoading(true);
    try {
      const [expMonth, expYearRaw] = expiry.split('/');
      const expYear = expYearRaw.length === 4 ? expYearRaw.slice(-2) : expYearRaw;

      console.log('[MP] Tokenizando cartão...');
      const tokenData = await mpRef.current.createCardToken({
        cardNumber: cardNumber.replace(/\s/g, ''),
        cardholderName: cardName,
        cardExpirationMonth: expMonth,
        cardExpirationYear: expYear,
        securityCode: cvv,
        identificationType: docType,
        identificationNumber: docNumber.replace(/\D/g, ''),
      });

      if (!tokenData?.id) throw new Error('Tokenização falhou — token não retornado.');
      console.log('[MP] Token gerado:', tokenData.id, '| length:', tokenData.id.length);

      const deviceId = window.MP_DEVICE_SESSION_ID || '';
      console.log('[MP] device_id:', deviceId || '(não disponível)');

      // Separa primeiro nome e sobrenome do titular
      const nameParts = cardName.trim().split(/\s+/);
      const payerFirstName = nameParts[0] || '';
      const payerLastName = nameParts.slice(1).join(' ') || '';

      console.log('[MP] Enviando pagamento ao backend...');
      const response = await base44.functions.invoke('processarCartao', {
        transaction_amount: valorCents / 100,
        token: tokenData.id,
        description: 'Contribuição via Cartão',
        installments: Number(selectedInstallment),
        payment_method_id: paymentMethodId,
        issuer_id: issuerId ? Number(issuerId) : undefined,
        email,
        doc_type: docType,
        doc_number: docNumber.replace(/\D/g, ''),
        device_id: deviceId,
        payer_first_name: payerFirstName,
        payer_last_name: payerLastName,
      });

      const result = response.data;
      console.log('[MP] Resposta do backend:', JSON.stringify(result));

      if (result.error) {
        const causas = result.causes?.map(c => `[${c.code}] ${c.description}`).join(' | ');
        toast.error(`Erro: ${causas || result.error}`);
        return;
      }

      if (result.requires_3ds && result.three_ds_url) {
        window.open(result.three_ds_url, '_blank', 'width=600,height=700');
        toast.info('Complete a autenticação na janela aberta.');
        setStatus('pending');
        return;
      }

      const st = result.payment?.status;
      const detail = result.payment?.status_detail;

      const REJECT_MSGS = {
        cc_rejected_high_risk: 'Cartão recusado por segurança. Tente outro cartão.',
        cc_rejected_insufficient_amount: 'Saldo insuficiente.',
        cc_rejected_bad_filled_security_code: 'CVV incorreto.',
        cc_rejected_bad_filled_date: 'Data de validade incorreta.',
        cc_rejected_bad_filled_card_number: 'Número do cartão incorreto.',
        cc_rejected_call_for_authorize: 'Autorize a compra com seu banco.',
        cc_rejected_card_disabled: 'Cartão desativado.',
        cc_rejected_duplicated_payment: 'Pagamento duplicado.',
      };

      if (st === 'approved') {
        console.log('[MP] Pagamento APROVADO. ID:', result.payment?.id);
        setStatus('approved');
      } else if (st === 'in_process' || st === 'pending') {
        console.log('[MP] Pagamento PENDENTE. ID:', result.payment?.id);
        setStatus('pending');
      } else {
        const msg = REJECT_MSGS[detail] || `Recusado: ${detail || st}`;
        console.warn('[MP] Pagamento recusado:', st, detail);
        toast.error(msg);
      }
    } catch (err) {
      console.error('[MP] Erro inesperado:', err);
      toast.error(err.message || 'Erro ao processar pagamento.');
    } finally {
      setLoading(false);
    }
  };

  const handleNovo = () => {
    setStatus(null);
    setValorCents(0);
    setCardNumber('');
    setExpiry('');
    setCvv('');
    setCardName('');
    setDocNumber('');
    setEmail('');
    setPaymentMethodId('');
    setIssuerId('');
    setInstallmentOptions([]);
    setSelectedInstallment(1);
    setDetectedBrand('');
  };

  // ── Status screens
  if (status === 'approved') return (
    <div className="bg-card rounded-2xl shadow-sacred p-8 flex flex-col items-center gap-5 text-center">
      <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center">
        <CheckCircle2 className="w-10 h-10 text-secondary" strokeWidth={1.5} />
      </div>
      <div>
        <h2 className="text-xl font-display font-bold text-secondary">Pagamento Aprovado!</h2>
        <p className="text-sm text-muted-foreground mt-1">Sua contribuição foi processada com sucesso.</p>
      </div>
      <Button onClick={handleNovo} className="btn-sacred gap-2 mt-2">
        <RefreshCw className="w-4 h-4" /> Nova Contribuição
      </Button>
    </div>
  );

  if (status === 'pending') return (
    <div className="bg-card rounded-2xl shadow-sacred p-8 flex flex-col items-center gap-5 text-center">
      <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center">
        <CreditCard className="w-10 h-10 text-amber-600" strokeWidth={1.5} />
      </div>
      <div>
        <h2 className="text-xl font-display font-bold text-amber-600">Pagamento em Análise</h2>
        <p className="text-sm text-muted-foreground mt-1">Seu pagamento está sendo processado. Você receberá uma confirmação em breve.</p>
      </div>
      <Button onClick={handleNovo} variant="outline" className="gap-2 mt-2">
        <RefreshCw className="w-4 h-4" /> Nova Contribuição
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Imagem e texto configuráveis */}
      {churchSettings?.imagem_cartao && (
        <img src={churchSettings.imagem_cartao} alt="" className="w-full max-h-48 object-cover rounded-xl" />
      )}
      {churchSettings?.texto_cartao && (
        <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed"
          dangerouslySetInnerHTML={{ __html: churchSettings.texto_cartao }} />
      )}

      {/* Erros de carregamento */}
      {loadError && (
        <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">{loadError}</div>
      )}

      {/* Loading SDK */}
      {!mpReady && !loadError && (
        <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Carregando formulário seguro...</span>
        </div>
      )}

      {/* Formulário */}
      {mpReady && (
        <div className="bg-card rounded-2xl shadow-sacred p-6">

          {/* Header do card */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-display font-semibold text-foreground">Cartão de crédito ou débito</h2>
            <div className="flex items-center gap-1.5">
              {/* Brand badges */}
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-600 text-white">MC</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-800 text-white">VISA</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-400 text-black">ELO</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-700 text-white">HIPER</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500 text-white">AMEX</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Valor */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Valor (R$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input
                  type="text" inputMode="numeric" placeholder="0,00"
                  value={valorCents > 0 ? fmtCents(valorCents) : ''}
                  onChange={e => {
                    const n = parseInt(e.target.value.replace(/\D/g, '') || '0', 10);
                    if (n <= 9999999) setValorCents(n);
                  }}
                  className="pl-9 text-right font-mono text-base border-0 border-b border-border/60 rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary px-0 pl-9"
                />
              </div>
            </div>

            {/* Número do cartão */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Número do cartão</Label>
              <div className="relative">
                <Input
                  type="text" inputMode="numeric" placeholder="1234 1234 1234 1234"
                  value={cardNumber}
                  onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                  maxLength={19}
                  className="border-0 border-b border-border/60 rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary px-0"
                />
                {detectedBrand && (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-primary font-semibold">{detectedBrand}</span>
                )}
              </div>
            </div>

            {/* Validade + CVV */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Data de vencimento</Label>
                <Input
                  type="text" inputMode="numeric" placeholder="mm/aa"
                  value={expiry}
                  onChange={e => setExpiry(formatExpiry(e.target.value))}
                  maxLength={5}
                  className="border-0 border-b border-border/60 rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary px-0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Código de segurança</Label>
                <div className="relative">
                  <Input
                    type="text" inputMode="numeric" placeholder="123"
                    value={cvv}
                    onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    maxLength={4}
                    className="border-0 border-b border-border/60 rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary px-0 pr-6"
                  />
                  <ShieldCheck className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                </div>
              </div>
            </div>

            {/* Nome no cartão */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Nome do titular como aparece no cartão</Label>
              <Input
                type="text" placeholder="Maria Santos Pereira"
                value={cardName}
                onChange={e => setCardName(e.target.value.toUpperCase())}
                className="border-0 border-b border-border/60 rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary px-0"
              />
            </div>

            {/* Documento do titular */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Documento do titular</Label>
              <div className="flex gap-2 items-center border-b border-border/60">
                <div className="relative">
                  <select
                    value={docType}
                    onChange={e => setDocType(e.target.value)}
                    className="appearance-none bg-transparent text-sm font-medium text-foreground pr-5 py-1.5 focus:outline-none cursor-pointer"
                  >
                    <option value="CPF">CPF</option>
                    <option value="CNPJ">CNPJ</option>
                  </select>
                  <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                </div>
                <div className="w-px h-4 bg-border/60" />
                <Input
                  type="text" inputMode="numeric"
                  placeholder={docType === 'CPF' ? '999.999.999-99' : '99.999.999/0001-99'}
                  value={docNumber}
                  onChange={e => setDocNumber(docType === 'CPF' ? formatCpf(e.target.value) : e.target.value.replace(/\D/g, '').slice(0, 14))}
                  className="border-0 bg-transparent focus-visible:ring-0 px-0 flex-1"
                />
              </div>
            </div>

            {/* Parcelas — só exibe quando há opções do emissor */}
            {installmentOptions.length > 1 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Parcelas</Label>
                <div className="relative border-b border-border/60">
                  <select
                    value={selectedInstallment}
                    onChange={e => setSelectedInstallment(Number(e.target.value))}
                    className="appearance-none w-full bg-transparent text-sm text-foreground py-1.5 pr-6 focus:outline-none cursor-pointer"
                  >
                    {installmentOptions.map(opt => (
                      <option key={opt.installments} value={opt.installments}>
                        {opt.recommended_message || `${opt.installments}x`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            )}

            {/* Seção dados do pagador */}
            <div className="pt-2">
              <p className="text-sm font-semibold text-foreground mb-3">Preencha seus dados</p>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">E-mail</Label>
                <Input
                  type="email" placeholder="exemplo@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="border-0 border-b border-border/60 rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary px-0"
                />
              </div>
            </div>

            {/* Botão pagar */}
            <div className="pt-2">
              <Button
                type="submit"
                className="w-full btn-sacred gap-2 h-11 text-base"
                disabled={loading}
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</>
                  : <><Lock className="w-4 h-4" /> Pagar</>}
              </Button>
              <p className="text-center text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Pagamento seguro via Mercado Pago
              </p>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}