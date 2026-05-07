import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Loader2, TrendingUp, TrendingDown, DollarSign, ArrowDownLeft, Inbox } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AguardandoVinculacao from '@/components/AguardandoVinculacao';
import FooterIgreja from '@/components/FooterIgreja';

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}
function fmtData(d) {
  try { return format(new Date(d + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }); } catch { return '—'; }
}

function SummaryCard({ label, value, icon: Icon, color, loading }) {
  return (
    <div className="bg-card rounded-2xl shadow-sacred p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-body font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '18' }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
      </div>
      {loading
        ? <div className="h-7 w-24 bg-muted animate-pulse rounded" />
        : <p className="text-xl font-display font-bold" style={{ color }}>{fmt(value)}</p>
      }
    </div>
  );
}

export default function MinhasContribuicoes() {
  const { user, loading: loadingUser } = useCurrentUser();
  const igrejaId = user?.igreja_id;

  const [membroRecord, setMembroRecord] = useState(null);
  const [allMovs, setAllMovs] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [formas, setFormas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriodo, setSelectedPeriodo] = useState('atual');

  const hoje = new Date();
  const mesAtual  = { inicio: format(startOfMonth(hoje), 'yyyy-MM-dd'), fim: format(endOfMonth(hoje), 'yyyy-MM-dd') };
  const mesAnt    = { inicio: format(startOfMonth(subMonths(hoje, 1)), 'yyyy-MM-dd'), fim: format(endOfMonth(subMonths(hoje, 1)), 'yyyy-MM-dd') };
  const periodo   = selectedPeriodo === 'atual' ? mesAtual : mesAnt;
  const periodoLabel = selectedPeriodo === 'atual' ? 'Mês Atual' : 'Mês Anterior';

  const loadData = useCallback(async () => {
    if (!igrejaId || !user?.email) return;
    setLoading(true);

    const [membros, cats, fps] = await Promise.all([
      base44.entities.Membro.filter({ igreja_id: igrejaId }, 'nome', 500),
      base44.entities.CategoriaConfig.filter({ igreja_id: igrejaId }, 'nome', 100),
      base44.entities.FormaPagamentoConfig.filter({ igreja_id: igrejaId }, 'nome', 100),
    ]);

    setCategorias(cats);
    setFormas(fps);

    const membro = membros.find(mb => mb.email?.toLowerCase() === user.email?.toLowerCase()) || null;
    setMembroRecord(membro);

    const all = [];
    let skip = 0;
    while (true) {
      const batch = await base44.entities.Movimentacao.filter({ igreja_id: igrejaId }, '-data', 200, skip);
      all.push(...batch);
      if (batch.length < 200) break;
      skip += 200;
    }

    setAllMovs(all);
    setLoading(false);
  }, [igrejaId, user?.email]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loadingUser) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (user && !user.igreja_id) return <AguardandoVinculacao user={user} />;

  // ── Dados do membro ────────────────────────────────────────────────────────
  const minhasMovs = membroRecord
    ? allMovs.filter(m => m.membro_id === membroRecord.id)
    : [];

  const minhasEntradas = minhasMovs
    .filter(m => m.tipo === 'entrada')
    .reduce((s, m) => s + (m.valor || 0), 0);

  const minhasSaidas = minhasMovs
    .filter(m => m.tipo === 'saida')
    .reduce((s, m) => s + (m.valor || 0), 0);

  // ── Dados da Igreja (filtrados por período selecionado) ───────────────────
  const movsPeriodo = allMovs.filter(m => m.data >= periodo.inicio && m.data <= periodo.fim);
  const entradasIgreja = movsPeriodo.filter(m => m.tipo === 'entrada').reduce((s, m) => s + (m.valor || 0), 0);
  const saidasIgreja   = movsPeriodo.filter(m => m.tipo === 'saida').reduce((s, m) => s + (m.valor || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Minhas Contribuições</h1>
          <p className="text-sm font-body text-muted-foreground mt-0.5">
            Olá, {user?.full_name || 'Membro'}
            {membroRecord && <span className="text-primary"> · {membroRecord.nome}</span>}
          </p>
        </div>

        {/* Cards do Membro */}
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard label="Minhas Contribuições" value={minhasEntradas} icon={DollarSign} color="#715824" loading={loading} />
          <SummaryCard label="Saídas em meu nome"   value={minhasSaidas}  icon={ArrowDownLeft} color="#ba1a1a" loading={loading} />
        </div>

        {/* Tabela: Minhas Contribuições */}
        <div className="bg-card rounded-2xl shadow-sacred overflow-hidden">
          <div className="px-5 py-4 border-b border-border/40">
            <p className="text-sm font-display font-bold text-foreground">Minhas Contribuições</p>
            <p className="text-xs font-body text-muted-foreground mt-0.5">
              {membroRecord ? `Registros vinculados a: ${membroRecord.nome}` : 'Nenhum cadastro de membro encontrado para seu email'}
            </p>
          </div>

          {loading ? (
            <div className="py-12 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : minhasMovs.length === 0 ? (
            <div className="py-12 text-center px-6">
              <Inbox className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">
                {membroRecord
                  ? 'Nenhum lançamento vinculado ao seu cadastro ainda.'
                  : 'Seu email não corresponde a nenhum cadastro de membro. Consulte o administrador.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-body">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-4 py-3 text-left text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-widest">Data</th>
                    <th className="px-4 py-3 text-left text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-widest">Categoria</th>
                    <th className="px-4 py-3 text-left text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-widest hidden sm:table-cell">Forma Pgto</th>
                    <th className="px-4 py-3 text-left text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-widest hidden md:table-cell">Descrição</th>
                    <th className="px-4 py-3 text-right text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-widest">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {minhasMovs.map((m, i) => {
                    const cat   = categorias.find(c => c.id === m.categoria_id);
                    const forma = formas.find(f => f.id === m.forma_pagamento_id);
                    const isEntrada = m.tipo === 'entrada';
                    return (
                      <tr key={m.id} className={i % 2 === 0 ? 'bg-card' : 'bg-muted/10'}>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtData(m.data)}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{cat?.nome || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{forma?.nome || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{m.descricao || '—'}</td>
                        <td className="px-4 py-3 text-right font-display font-bold whitespace-nowrap" style={{ color: isEntrada ? '#106d20' : '#ba1a1a' }}>
                          {isEntrada ? '+' : '-'}{fmt(m.valor)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Cards da Igreja */}
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard label={`Entradas da igreja (${periodoLabel})`} value={entradasIgreja} icon={TrendingUp}   color="#106d20" loading={loading} />
          <SummaryCard label={`Saídas da igreja (${periodoLabel})`}   value={saidasIgreja}   icon={TrendingDown} color="#ba1a1a" loading={loading} />
        </div>

        {/* Lançamentos da Igreja */}
        <div className="bg-card rounded-2xl shadow-sacred overflow-hidden">
          <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-display font-bold text-foreground">Lançamentos da Igreja</p>
              <p className="text-xs font-body text-muted-foreground mt-0.5">{periodoLabel}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setSelectedPeriodo('atual')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  selectedPeriodo === 'atual'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                Mês Atual
              </button>
              <button
                onClick={() => setSelectedPeriodo('anterior')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  selectedPeriodo === 'anterior'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                Mês Anterior
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : movsPeriodo.length === 0 ? (
            <div className="py-12 text-center">
              <Inbox className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum lançamento neste período.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30 max-h-96 overflow-y-auto">
              {movsPeriodo.map(m => {
                const cat = categorias.find(c => c.id === m.categoria_id);
                const isEntrada = m.tipo === 'entrada';
                return (
                  <div key={m.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isEntrada ? 'bg-secondary/10' : 'bg-destructive/10'}`}>
                        {isEntrada
                          ? <TrendingUp className="w-3.5 h-3.5 text-secondary" />
                          : <TrendingDown className="w-3.5 h-3.5 text-destructive" />}
                      </div>
                      <div>
                        <p className="text-sm font-body font-medium text-foreground">{cat?.nome || '—'}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmtData(m.data)}
                          {m.membro_nome
                            ? m.membro_id && membroRecord && m.membro_id === membroRecord.id
                              ? ` · ${m.membro_nome}`
                              : ` · ${'•'.repeat(12)}`
                            : ''}
                          {m.descricao ? ` · ${m.descricao}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-display font-bold shrink-0 ml-4" style={{ color: isEntrada ? '#106d20' : '#ba1a1a' }}>
                      {isEntrada ? '+' : '-'}{fmt(m.valor)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      <FooterIgreja />
    </div>
  );
}