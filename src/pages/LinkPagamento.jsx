import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import {
  Loader2, CreditCard, ExternalLink, ShieldCheck,
  Zap, Lock, ScanLine
} from 'lucide-react';
import AguardandoVinculacao from '@/components/AguardandoVinculacao';
import FooterIgreja from '@/components/FooterIgreja';

const DEFAULT_TEXTO_LINK = `<p>Para facilitar sua contribuição, oferecemos diversas opções de pagamento através de um ambiente totalmente criptografado e seguro.</p><p>Você pode optar por pagar via Pix, Boleto Bancário ou Cartão de Crédito, inclusive com opções de parcelamento.</p><p>Todo o processamento financeiro é realizado pelo Mercado Pago, garantindo a proteção total dos seus dados.</p><p>Ao clicar no botão "Escolher Forma de Pagamento", você será redirecionado para a página oficial do Mercado Pago para concluir a transação com segurança e tranquilidade.</p>`;

export default function LinkPagamento() {
  const { user, loading: loadingUser } = useCurrentUser();
  const igrejaId = user?.igreja_id;

  const [churchSettings, setChurchSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!igrejaId) return;
    base44.entities.ChurchSettings.filter({ igreja_id: igrejaId }, '-created_date', 1)
      .then(cs => { setChurchSettings(cs[0] || null); setLoading(false); });
  }, [igrejaId]);

  if (loadingUser || loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (user && !user.igreja_id) return <AguardandoVinculacao user={user} />;

  const linkPagamento = churchSettings?.link_pagamento_online;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto w-full p-4 md:p-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Link de Pagamento</h1>
            <p className="text-sm font-body text-muted-foreground">Contribua de forma digital e segura</p>
          </div>
        </div>

        {linkPagamento ? (
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sacred">
            <div className="p-6 space-y-5">

              {/* Título + Descrição */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-display font-bold text-xl text-foreground">Pagamento Digital Seguro</p>
                  <div
                    className="prose prose-sm max-w-none text-muted-foreground mt-1 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: churchSettings?.texto_link_pagamento || DEFAULT_TEXTO_LINK }}
                  />
                </div>
              </div>

              {/* Trust badges — métodos de pagamento */}
              <div className="flex flex-wrap items-center gap-3 py-3 border-y border-border/40">
                {/* Pix */}
                <div className="flex items-center gap-1.5 opacity-60">
                  <ScanLine className="w-4 h-4 text-foreground" />
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Pix</span>
                </div>
                <div className="w-px h-4 bg-border" />
                {/* Boleto */}
                <div className="flex items-center gap-1.5 opacity-60">
                  <svg className="w-4 h-4 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <path d="M6 9h1v6H6zm3 0h2v6H9zm4 0h1v6h-1zm3 0h2v6h-2z" fill="currentColor" stroke="none" />
                  </svg>
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Boleto</span>
                </div>
                <div className="w-px h-4 bg-border" />
                {/* Visa */}
                <div className="flex items-center opacity-60">
                  <span className="text-xs font-bold text-blue-700 tracking-tighter">VISA</span>
                </div>
                <div className="w-px h-4 bg-border" />
                {/* Mastercard */}
                <div className="flex items-center gap-0.5 opacity-60">
                  <div className="w-4 h-4 rounded-full bg-red-500/80" />
                  <div className="w-4 h-4 rounded-full bg-yellow-400/80 -ml-2" />
                </div>
                <div className="w-px h-4 bg-border" />
                {/* Elo */}
                <div className="flex items-center opacity-60">
                  <span className="text-xs font-bold text-foreground tracking-tighter">ELO</span>
                </div>
              </div>

              {/* Botão principal */}
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

              {/* Rodapé segurança */}
              <div className="text-center space-y-1">
                <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Você será redirecionado para o ambiente seguro de pagamento
                </p>
                <p className="text-[10px] text-muted-foreground/70">
                  Pagamentos processados via Mercado Pago
                </p>
              </div>

            </div>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border/50 p-10 text-center space-y-3">
            <CreditCard className="w-10 h-10 mx-auto text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhum link de pagamento configurado.</p>
            <p className="text-xs text-muted-foreground/70">
              Configure o link em Configurações → Dados da Igreja.
            </p>
          </div>
        )}

      </div>

      <FooterIgreja />
    </div>
  );
}