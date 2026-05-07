import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldAlert, Search, CheckCircle2, AlertTriangle, HelpCircle, Link2, SkipForward } from 'lucide-react';
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

export default function CorrigirVinculoMembros() {
  const { user, loading: loadingUser } = useCurrentUser();
  const igrejaId = user?.igreja_id;

  const [registros, setRegistros] = useState(null); // null = não carregado ainda
  const [membros, setMembros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [vinculoLocal, setVinculoLocal] = useState({}); // { movId: membroId | 'ignorar' }
  const [salvando, setSalvando] = useState(false);
  const [loteRunning, setLoteRunning] = useState(false);

  // ── Carrega dados (apenas ao clicar no botão) ─────────────────────────────
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

    // Filtro: membro_id nulo + membro_nome preenchido + existe membro com nome correspondente
    const pendentes = allMovs.filter(m => {
      if (m.membro_id || !m.membro_nome?.trim()) return false;
      const s = matchStatus(m.membro_nome, mbs);
      return s.type === 'exact' || s.type === 'ambiguous'; // visitantes (notfound) são excluídos
    });

    // Pré-seleciona sugestão onde há match único
    const inicial = {};
    for (const m of pendentes) {
      const s = matchStatus(m.membro_nome, mbs);
      if (s.type === 'exact') inicial[m.id] = s.match.id;
    }

    setVinculoLocal(inicial);
    setRegistros(pendentes);
    setLoading(false);
  }, [igrejaId]);

  // ── Salvar vínculo individual ─────────────────────────────────────────────
  const salvarUm = async (movId) => {
    const membroId = vinculoLocal[movId];
    if (!membroId || membroId === 'ignorar') {
      toast.info('Selecione um membro ou escolha "Ignorar".');
      return;
    }
    setSalvando(true);
    await base44.entities.Movimentacao.update(movId, { membro_id: membroId });
    setRegistros(prev => prev.filter(r => r.id !== movId));
    toast.success('Vínculo salvo com sucesso.');
    setSalvando(false);
  };

  // ── Ignorar registro individual ───────────────────────────────────────────
  const ignorarUm = (movId) => {
    setRegistros(prev => prev.filter(r => r.id !== movId));
  };

  // ── Vincular em lote (apenas matches únicos) ──────────────────────────────
  const vincularLote = async () => {
    const paraVincular = registros.filter(r => {
      const s = matchStatus(r.membro_nome, membros);
      return s.type === 'exact';
    });
    if (paraVincular.length === 0) {
      toast.info('Nenhum registro com correspondência exata para vincular.');
      return;
    }
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

  // ── Guards ────────────────────────────────────────────────────────────────
  if (loadingUser) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (user?.role !== 'admin') return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-center p-8">
      <ShieldAlert className="w-10 h-10 text-destructive" />
      <h2 className="text-lg font-semibold">Acesso restrito</h2>
      <p className="text-sm text-muted-foreground">Apenas administradores podem acessar esta página.</p>
    </div>
  );

  const exactCount = registros
    ? registros.filter(r => matchStatus(r.membro_nome, membros).type === 'exact').length
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Link2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Corrigir Vínculo de Membros</h1>
            <p className="text-sm font-body text-muted-foreground">
              Registros com <code className="font-mono bg-muted px-1 rounded">membro_nome</code> preenchido mas sem <code className="font-mono bg-muted px-1 rounded">membro_id</code>
            </p>
          </div>
        </div>

        {/* Aviso */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm font-body text-amber-800">
            Esta página corrige apenas registros com nome preenchido. Registros <strong>sem membro</strong> não são alterados.
            Nenhuma correção ocorre automaticamente ao carregar a tela.
          </p>
        </div>

        {/* Botão carregar */}
        {registros === null && (
          <div className="text-center py-10">
            <Button onClick={carregar} disabled={loading} size="lg" className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Buscar registros pendentes
            </Button>
            <p className="text-xs text-muted-foreground mt-3">A busca é iniciada manualmente.</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Carregando registros...</span>
          </div>
        )}

        {/* Resultados */}
        {registros !== null && !loading && (
          <>
            {/* Sumário + lote */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-4 text-sm font-body">
                <span className="text-muted-foreground">
                  <strong className="text-foreground">{registros.length}</strong> registros pendentes
                </span>
                {exactCount > 0 && (
                  <span className="text-secondary font-medium">
                    <strong>{exactCount}</strong> com match único
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={carregar} disabled={loading || loteRunning} className="gap-1">
                  <Search className="w-3.5 h-3.5" /> Recarregar
                </Button>
                <Button
                  size="sm"
                  onClick={vincularLote}
                  disabled={loteRunning || exactCount === 0}
                  className="gap-1"
                >
                  {loteRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                  Vincular todos com correspondência exata ({exactCount})
                </Button>
              </div>
            </div>

            {/* Tabela */}
            {registros.length === 0 ? (
              <div className="bg-card rounded-2xl shadow-sacred py-16 text-center">
                <CheckCircle2 className="w-10 h-10 mx-auto text-secondary mb-3" />
                <p className="text-sm font-display font-semibold text-foreground">Tudo em ordem!</p>
                <p className="text-xs text-muted-foreground mt-1">Nenhum registro pendente de vínculo.</p>
              </div>
            ) : (
              <div className="bg-card rounded-2xl shadow-sacred overflow-hidden">
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
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.color}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 min-w-[200px]">
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
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs gap-1"
                                  disabled={!selecionado || selecionado === 'ignorar' || salvando}
                                  onClick={() => salvarUm(r.id)}
                                >
                                  <CheckCircle2 className="w-3 h-3" /> Vincular
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs text-muted-foreground"
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
    </div>
  );
}