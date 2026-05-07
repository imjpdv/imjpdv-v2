import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Loader2, Landmark, Building2, Copy, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import AguardandoVinculacao from '@/components/AguardandoVinculacao';

const TIPO_LABELS = {
  cpf: 'CPF', cnpj: 'CNPJ', email: 'E-MAIL',
  telefone: 'TELEFONE', aleatoria: 'ALEATÓRIA',
};

function ContaCard({ conta }) {
  const [copied, setCopied] = useState(false);

  function copyPix() {
    navigator.clipboard.writeText(conta.chave_pix).then(() => {
      setCopied(true);
      toast.success('Chave PIX copiada!');
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div className="bg-muted/40 rounded-2xl border border-border/50 overflow-hidden">
      <div className="flex items-start gap-4 px-5 pt-5 pb-4">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
          {conta.logo_url
            ? <img src={conta.logo_url} alt={conta.nome_banco} className="w-full h-full object-cover" />
            : <Building2 className="w-6 h-6 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-display font-bold text-base text-foreground">{conta.nome_banco}</p>
            {conta.is_principal && (
              <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 px-2">Principal</Badge>
            )}
          </div>
          <div className="mt-0.5 space-y-0.5">
            {conta.agencia && <p className="text-xs text-muted-foreground">Agência: <span className="font-medium text-foreground">{conta.agencia}</span></p>}
            {conta.conta   && <p className="text-xs text-muted-foreground">Conta: <span className="font-medium text-foreground">{conta.conta}</span></p>}
          </div>
        </div>
        {conta.chave_pix && (
          <span className="text-[10px] font-semibold text-secondary bg-secondary/10 px-2 py-0.5 rounded-md shrink-0">PIX</span>
        )}
      </div>
      {conta.chave_pix && (
        <div className="mx-5 mb-5 flex items-center justify-between gap-3 border-t border-border/40 pt-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">
              Chave PIX {conta.tipo_chave_pix ? `(${TIPO_LABELS[conta.tipo_chave_pix] || conta.tipo_chave_pix})` : ''}
            </p>
            <p className="text-sm font-mono text-foreground break-all">{conta.chave_pix}</p>
          </div>
          <button
            onClick={copyPix}
            className="shrink-0 flex items-center gap-1.5 border border-secondary text-secondary font-semibold text-xs px-3 py-1.5 rounded-lg hover:bg-secondary/10 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function InformacoesBancariasTab() {
  const { user } = useCurrentUser();
  const [contas, setContas] = useState([]);
  const [churchSettings, setChurchSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.igreja_id) return;
    Promise.all([
      base44.entities.ContaBancaria.filter({ igreja_id: user.igreja_id }, '-is_principal', 20),
      base44.entities.ChurchSettings.filter({ igreja_id: user.igreja_id }, '-created_date', 1),
    ]).then(([cts, cs]) => { setContas(cts); setChurchSettings(cs[0] || null); setLoading(false); });
  }, [user?.igreja_id]);

  if (!user?.igreja_id) return <AguardandoVinculacao user={user} />;

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-4">
      {churchSettings?.imagem_bancario && (
        <img src={churchSettings.imagem_bancario} alt="" className="w-full max-h-48 object-cover rounded-xl" />
      )}
      {churchSettings?.texto_bancario && (
        <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed"
          dangerouslySetInnerHTML={{ __html: churchSettings.texto_bancario }} />
      )}
      {contas.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border/50 p-10 text-center">
          <Landmark className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma conta bancária cadastrada.</p>
        </div>
      ) : (
        contas.map(c => <ContaCard key={c.id} conta={c} />)
      )}
    </div>
  );
}