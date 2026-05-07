import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Eye, EyeOff } from 'lucide-react';
import { executeAction } from '@/lib/notify';

const PAGINAS = [
  { key: 'minhas_contribuicoes', label: 'Minhas Contribuições', desc: 'Histórico de contribuições do membro' },
  { key: 'feed', label: 'Feed de Notícias', desc: 'Notícias, avisos e eventos da igreja' },
  { key: 'contribuir', label: 'Contribuir', desc: 'Página geral de contribuição' },
  { key: 'contribuir_pix', label: '↳ Aba Pix', desc: 'Contribuição via Pix' },
  { key: 'contribuir_cartao', label: '↳ Aba Cartão de Crédito', desc: 'Contribuição via cartão' },
  { key: 'contribuir_bancario', label: '↳ Aba Info. Bancárias', desc: 'Dados bancários e chave Pix' },
  { key: 'contribuir_link', label: '↳ Aba Link de Pagamento', desc: 'Link externo de pagamento' },
];

const DEFAULT_VISIVEL = {
  minhas_contribuicoes: true,
  feed: true,
  contribuir: true,
  contribuir_pix: true,
  contribuir_cartao: true,
  contribuir_bancario: true,
  contribuir_link: true,
};

export default function VisibilidadePaginasPanel({ igrejaId }) {
  const [recordId, setRecordId] = useState(null);
  const [paginas, setPaginas] = useState(DEFAULT_VISIVEL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!igrejaId) return;
    (async () => {
      setLoading(true);
      const data = await base44.entities.ChurchSettings.filter({ igreja_id: igrejaId });
      if (data.length > 0) {
        setRecordId(data[0].id);
        setPaginas({ ...DEFAULT_VISIVEL, ...(data[0].paginas_visiveis || {}) });
      }
      setLoading(false);
    })();
  }, [igrejaId]);

  const toggle = (key) => setPaginas(p => ({ ...p, [key]: !p[key] }));

  const handleSave = async () => {
    setSaving(true);
    await executeAction(
      async () => {
        if (recordId) {
          await base44.entities.ChurchSettings.update(recordId, { paginas_visiveis: paginas });
        } else {
          const created = await base44.entities.ChurchSettings.create({ paginas_visiveis: paginas, igreja_id: igrejaId });
          setRecordId(created.id);
        }
      },
      { success: 'Visibilidade salva com sucesso', error: 'Erro ao salvar' }
    );
    setSaving(false);
  };

  if (loading) return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
      <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Defina quais páginas ficam visíveis no menu e na interface dos membros.
      </p>

      <div className="space-y-2">
        {PAGINAS.map(({ key, label, desc }) => {
          const visivel = paginas[key] !== false;
          return (
            <div
              key={key}
              onClick={() => toggle(key)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                visivel
                  ? 'bg-card border-border/50 hover:bg-accent/40'
                  : 'bg-muted/40 border-border/30 hover:bg-muted/60 opacity-60'
              }`}
            >
              <div>
                <p className={`text-sm font-medium ${key.startsWith('contribuir_') ? 'pl-2 text-muted-foreground' : ''}`}>
                  {label}
                </p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <div className={`flex items-center gap-1.5 text-xs font-semibold ${visivel ? 'text-secondary' : 'text-muted-foreground'}`}>
                {visivel
                  ? <><Eye className="w-4 h-4" /> Visível</>
                  : <><EyeOff className="w-4 h-4" /> Oculto</>}
              </div>
            </div>
          );
        })}
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Salvar Visibilidade
      </Button>
    </div>
  );
}