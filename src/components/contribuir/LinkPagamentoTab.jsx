import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Loader2, CreditCard, ExternalLink, ShieldCheck, Lock, ScanLine } from 'lucide-react';


const DEFAULT_TEXTO_LINK = `<p>Para facilitar sua contribuição, oferecemos diversas opções de pagamento através de um ambiente totalmente criptografado e seguro.</p><p>Você pode optar por pagar via Pix, Boleto Bancário ou Cartão de Crédito, inclusive com opções de parcelamento.</p>`;

export default function LinkPagamentoTab() {
  const { user } = useCurrentUser();
  const [churchSettings, setChurchSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.igreja_id) return;
    base44.entities.ChurchSettings.filter({ igreja_id: user.igreja_id }, '-created_date', 1)
      .then(cs => { setChurchSettings(cs[0] || null); setLoading(false); });
  }, [user?.igreja_id]);

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );

  const linkPagamento = churchSettings?.link_pagamento_online;

  if (!linkPagamento) return (
    <div className="bg-card rounded-2xl border border-border/50 p-10 text-center space-y-3">
      <CreditCard className="w-10 h-10 mx-auto text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">Nenhum link de pagamento configurado.</p>
      <p className="text-xs text-muted-foreground/70">Configure em Configurações → Dados da Igreja.</p>
    </div>
  );

  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sacred">
      <div className="p-6 space-y-5">
        {churchSettings?.imagem_link_pagamento && (
        <img src={churchSettings.imagem_link_pagamento} alt="" className="w-full max-h-48 object-cover rounded-xl" />
      )}
        <div>
          <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: churchSettings?.texto_link_pagamento || DEFAULT_TEXTO_LINK }} />
        </div>

        {/* Métodos */}
        <div className="flex flex-wrap items-center gap-3 py-3 border-y border-border/40">
          <div className="flex items-center gap-1.5 opacity-60">
            <ScanLine className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Pix</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5 opacity-60">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <rect x="2" y="4" width="2" height="16"/><rect x="5" y="4" width="1" height="16"/><rect x="7" y="4" width="2" height="16"/><rect x="10" y="4" width="1" height="16"/><rect x="12" y="4" width="3" height="16"/><rect x="16" y="4" width="1" height="16"/><rect x="18" y="4" width="2" height="16"/><rect x="21" y="4" width="1" height="16"/>
            </svg>
            <span className="text-xs font-semibold uppercase tracking-wide">Boleto</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center opacity-60">
            <span className="text-xs font-bold text-blue-700 tracking-tighter">VISA</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-0.5 opacity-60">
            <div className="w-4 h-4 rounded-full bg-red-500/80" />
            <div className="w-4 h-4 rounded-full bg-yellow-400/80 -ml-2" />
          </div>
        </div>

        <a
          href={linkPagamento}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground font-display font-bold text-sm py-3.5 px-4 rounded-xl hover:bg-primary/90 transition-colors"
        >
          <Lock className="w-4 h-4" />
          Escolher Forma de Pagamento
          <ExternalLink className="w-3.5 h-3.5 opacity-70" />
        </a>

        <div className="text-center">
          <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Você será redirecionado para o ambiente seguro de pagamento
          </p>
        </div>
      </div>
    </div>
  );
}