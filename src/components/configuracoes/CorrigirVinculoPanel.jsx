import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Search, CheckCircle2, AlertTriangle, Link2, SkipForward } from 'lucide-react';
import { toast } from 'sonner';

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}
function fmtData(d) {
  try {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  } catch { return d || '—'; }
}
function normalize(s) {
  return (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}
function matchStatus(membro_nome, membros) {
  const n = normalize(membro_nome);
  const matches = membros.filter(mb => normalize(mb.nome) === n);
  if (matches.length === 1) return { type: 'exact', match: matches[0] };
  if (matches.length > 1)  return { type: 'ambiguous', match: null };
  return { type: 'notfound', match: null };
}

const STATUS_BADGE = {
  exact:     { label: 'Match único',    color: 'bg-secondary/10 text-secondary' },
  ambiguous: { label: 'Ambíguo',        color: 'bg-amber-100 text-amber-700' },
  notfound:  { label: 'Não encontrado', color: 'bg-destructive/10 text-destructive' },
};

export default function CorrigirVinculoPanel({ igrejaId }) {
  const [registros, setRegistros] = useState(null);
  const [membros, setMembros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [vinculoLocal, setVinculoLocal] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [loteRunning, setLoteRunning] = useState(false);

  const carregar = useCallback(async () => {
    if (!igrejaId) return;
    setLoading(true);
    setRegistros(null);
    setVinculoLocal({});

    const [mbs, allMovs] = await Promise.all([
      base44.entities.Membro.filter({ igreja_id: igrejaId }, 'nome', 500),
      (async () => {
        const all = [];
        let skip = 0;
        while (true) {
          const batch = await base44.entities.Movimentacao.filter({ igreja_id: igrejaId }, '-data', 200, skip);
          all.push(...batch);
          if (batch.length < 200) break;
          skip += 200;
        }
        return all;
      })(),
    ]);

    setMembros(mbs);

    const pendentes = allMovs.filter(m => {
      if (m.membro_id || !m.membro_nome?.trim()) return false;
      const s = matchStatus(m.membro_nome, mbs);
      return s.type === 'exact' || s.type === 'ambiguous';
    });

    const inicial = {};
    for (const m of pendentes) {
      const s = matchStatus(m.membro_nome, mbs);
      if (s.type === 'exact') inicial[m.id] = s.match.id;
    }

    setVinculoLocal(inicial);
    setRegistros(pendentes);
    setLoading(false);
  }, [igrejaId]);

  const salvarUm = async (movId) => {
    const membroId = vinculoLocal[movId];
    if (!membroId || membroId === 'ignorar') { toast.info('Selecione um membro.'); return; }
    setSalvando(true);
    await base44.entities.Movimentacao.update(movId, { membro_id: membroId });
    setRegistros(prev => prev.filter(r => r.id !== movId));
    toast.success('Vínculo salvo com sucesso.');
    setSalvando(false);
  };

  const ignorarUm = (movId) => setRegistros(prev => prev.filter(r => r.id !== movId));

  const vincularLote = async () => {
    const paraVincular = registros.filter(r => matchStatus(r.membro_nome, membros).type === 'exact');
    if (paraVincular.length === 0) { toast.info('Nenhum registro com correspondência exata.'); return; }
    setLoteRunning(true);
    let ok = 0;
    await Promise.all(paraVincular.map(async (r) => {
      const s = matchStatus(r.membro_nome, membros);
      await base44.entities.Movimentacao.update(r.id, { membro_id: s.match.id });
      ok++;
    }));
    setRegistros(prev => prev.filter(r => matchStatus(r.membro_nome, membros).type !== 'exact'));
    toast.success(`${ok} registro(s) vinculado(s) com sucesso.`);
    setLoteRunning(false);
  };

  const exactCount = registros
    ? registros.filter(r => matchStatus(r.membro_nome, membros).type === 'exact').length
    : 0;

  return (
    <div className="space-y-5">

      {/* Aviso */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm font-body text-amber-800">
          Exibe apenas registros com <strong>nome preenchido</strong> e que possuem membro cadastrado correspondente.
          Visitantes sem cadastro <strong>não aparecem</strong>. Nenhuma correção ocorre automaticamente.
        </p>
      </div>

      {/* Botão carregar */}
      {registros === null && !loading && (
        <div className="text-center py-8">
          <Button onClick={carregar} size="lg" className="gap-2">
            <Search className="w-4 h-4" /> Buscar registros pendentes
          </Button>
          <p className="text-xs text-muted-foreground mt-3">A busca é iniciada manualmente.</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Carregando registros...</span>
        </div>
      )}

      {/* Resultados */}
      {registros !== null && !loading && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-4 text-sm font-body">
              <span className="text-muted-foreground">
                <strong className="text-foreground">{registros.length}</strong> registros pendentes
              </span>
              {exactCount > 0 && (
                <span className="text-secondary font-medium"><strong>{exactCount}</strong> com match único</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={carregar} disabled={loading || loteRunning} className="gap-1">
                <Search className="w-3.5 h-3.5" /> Recarregar
              </Button>
              <Button size="sm" onClick={vincularLote} disabled={loteRunning || exactCount === 0} className="gap-1">
                {loteRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                Vincular exatos ({exactCount})
              </Button>
            </div>
          </div>

          {registros.length === 0 ? (
            <div className="rounded-2xl border border-border/50 bg-muted/20 py-12 text-center">
              <CheckCircle2 className="w-10 h-10 mx-auto text-secondary mb-3" />
              <p className="text-sm font-display font-semibold text-foreground">Tudo em ordem!</p>
              <p className="text-xs text-muted-foreground mt-1">Nenhum registro pendente de vínculo.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-body">
                  <thead>
                    <tr className="bg-muted/60">
                      {['Data', 'Tipo', 'Valor', 'membro_nome', 'Status', 'Membro', 'Ação'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {registros.map((r, i) => {
                      const status = matchStatus(r.membro_nome, membros);
                      const badge = STATUS_BADGE[status.type];
                      const selecionado = vinculoLocal[r.id];
                      return (
                        <tr key={r.id} className={i % 2 === 0 ? 'bg-card' : 'bg-muted/10'}>
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{fmtData(r.data)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.tipo === 'entrada' ? 'bg-secondary/10 text-secondary' : 'bg-destructive/10 text-destructive'}`}>
                              {r.tipo}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-display font-bold whitespace-nowrap" style={{ color: r.tipo === 'entrada' ? '#106d20' : '#ba1a1a' }}>
                            {fmt(r.valor)}
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{r.membro_nome}</code>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
                          </td>
                          <td className="px-4 py-3 min-w-[180px]">
                            <select
                              className="w-full text-xs border border-input bg-background rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
                              value={selecionado || ''}
                              onChange={e => setVinculoLocal(prev => ({ ...prev, [r.id]: e.target.value }))}
                            >
                              <option value="">— Selecionar membro —</option>
                              {membros.map(mb => (
                                <option key={mb.id} value={mb.id}>{mb.nome}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1"
                                disabled={!selecionado || selecionado === 'ignorar' || salvando}
                                onClick={() => salvarUm(r.id)}
                              >
                                <CheckCircle2 className="w-3 h-3" /> Vincular
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground"
                                onClick={() => ignorarUm(r.id)}
                              >
                                <SkipForward className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}