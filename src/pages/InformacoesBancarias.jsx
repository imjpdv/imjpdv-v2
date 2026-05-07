import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import {
  Loader2, Landmark, Copy, Check, Building2,
} from 'lucide-react';
import AguardandoVinculacao from '@/components/AguardandoVinculacao';
import FooterIgreja from '@/components/FooterIgreja';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const TIPO_LABELS = {
  cpf: 'CPF', cnpj: 'CNPJ', email: 'E-MAIL',
  telefone: 'TELEFONE', aleatoria: 'ALEATÓRIA',
};

function ContaCard({ conta }) {
  const [copied, setCopied] = useState(false);

  function copyPix() {
    navigator.clipboard.writeText(conta.chave_pix).then(() => {
      setCopied(true);
      toast.success('Chave PIX copiada com sucesso!');
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
      {/* Linha superior: logo + dados + badge PIX */}
      <div className="flex items-start gap-4 px-5 pt-5 pb-4">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
          {conta.logo_url
            ? <img src={conta.logo_url} alt={conta.nome_banco} className="w-full h-full object-cover" />
            : <Building2 className="w-6 h-6 text-muted-foreground" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-display font-bold text-base text-foreground">{conta.nome_banco}</p>
            {conta.is_principal && (
              <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 px-2">Principal</Badge>
            )}
          </div>
          <div className="mt-0.5 space-y-0.5">
            {conta.agencia && (
              <p className="text-xs font-body text-muted-foreground">Agência: <span className="text-foreground font-medium">{conta.agencia}</span></p>
            )}
            {conta.conta && (
              <p className="text-xs font-body text-muted-foreground">Conta: <span className="text-foreground font-medium">{conta.conta}</span></p>
            )}
          </div>
        </div>

        {conta.chave_pix && (
          <span className="text-[10px] font-semibold text-secondary bg-secondary/10 px-2 py-0.5 rounded-md shrink-0">PIX</span>
        )}
      </div>

      {/* Linha chave PIX + botão copiar */}
      {conta.chave_pix && (
        <div className="mx-5 mb-5 flex items-center justify-between gap-3 border-t border-border/40 pt-3">
          <div className="min-w-0">
            <p className="text-[10px] font-body font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">
              Chave PIX {conta.tipo_chave_pix ? `(${TIPO_LABELS[conta.tipo_chave_pix] || conta.tipo_chave_pix})` : ''}
            </p>
            <p className="text-sm font-mono text-foreground break-all">{conta.chave_pix}</p>
          </div>
          <button
            onClick={copyPix}
            className="shrink-0 flex items-center gap-1.5 border border-secondary text-secondary font-body font-semibold text-xs px-3 py-1.5 rounded-lg hover:bg-secondary/10 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copiado' : 'Copiar chave'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function InformacoesBancarias() {
  const { user, loading: loadingUser } = useCurrentUser();
  const igrejaId = user?.igreja_id;

  const [contas, setContas] = useState([]);
  const [churchSettings, setChurchSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!igrejaId) return;
    (async () => {
      const [cts, cs] = await Promise.all([
        base44.entities.ContaBancaria.filter({ igreja_id: igrejaId }, '-is_principal', 20),
        base44.entities.ChurchSettings.filter({ igreja_id: igrejaId }, '-created_date', 1),
      ]);
      setContas(cts);
      setChurchSettings(cs[0] || null);
      setLoading(false);
    })();
  }, [igrejaId]);

  if (loadingUser || loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (user && !user.igreja_id) return <AguardandoVinculacao user={user} />;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto w-full p-4 md:p-8 space-y-8">

        {/* 1. Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Landmark className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Informações Bancárias</h1>
            <p className="text-sm font-body text-muted-foreground">Contas e formas para contribuição</p>
          </div>
        </div>



        {/* 3. Lista de contas bancárias */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Landmark className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-display font-bold text-base text-foreground">Contas Bancárias</p>
              <p className="text-xs font-body text-muted-foreground">Use as chaves PIX ou dados das contas para contribuir</p>
            </div>
          </div>

          {contas.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border/50 p-10 text-center">
              <Landmark className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma conta bancária cadastrada.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {contas.map(c => <ContaCard key={c.id} conta={c} />)}
            </div>
          )}
        </div>

      </div>

      <FooterIgreja />
    </div>
  );
}