import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useShowValues, fmtVal } from '@/lib/useShowValues';
import {
  TrendingUp, TrendingDown, Scale, Users,
  RefreshCw, ArrowRight, AlertTriangle, CheckCircle2,
  Info, Eye, EyeOff, Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, subMonths, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function fmtDate(str) {
  if (!str) return '—';
  try { return format(new Date(str + 'T12:00:00'), 'dd/MM/yyyy'); } catch { return str; }
}

function pctDiff(curr, prev) {
  if (!prev || prev === 0) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

// ── Card financeiro principal ─────────────────────────────────────────────────
function FinCard({ label, value, icon: Icon, color, badge, loading }) {
  const { show } = useShowValues();
  return (
    <div className="bg-card rounded-2xl p-5 shadow-sacred flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-body font-medium text-muted-foreground uppercase tracking-widest">{label}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '18' }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      {loading
        ? <div className="h-8 w-28 bg-muted animate-pulse rounded-lg" />
        : <p className="text-2xl font-display font-bold" style={{ color }}>{fmtVal(value, show)}</p>
      }
      {!loading && badge && (
        <p className="text-xs font-body" style={{ color: badge.positive ? '#106d20' : badge.neutral ? '#715824' : '#ba1a1a' }}>
          {badge.text}
        </p>
      )}
    </div>
  );
}

// ── Insight card ──────────────────────────────────────────────────────────────
function InsightCard({ icon: Icon, color, bg, title, desc, link, linkLabel }) {
  return (
    <div className={`rounded-xl ${bg} p-4 flex flex-col gap-2`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color} shrink-0`} />
        <p className="text-sm font-display font-semibold text-foreground">{title}</p>
      </div>
      <p className="text-xs font-body text-muted-foreground leading-relaxed">{desc}</p>
      {link && (
        <Link to={link} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 mt-auto">
          {linkLabel} <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function HomeAdmin() {
  const { user } = useCurrentUser();
  const { show, toggle } = useShowValues();
  const igrejaId = user?.igreja_id;

  const [allMovs, setAllMovs] = useState([]);
  const [membros, setMembros] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Carrega TODOS os dados reais — sem limite, sem cache
  const loadData = useCallback(async (silent = false) => {
    if (!igrejaId) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      // Movimentações: todas, sem filtro de período
      const allMovsBatch = [];
      let skip = 0;
      while (true) {
        const batch = await base44.entities.Movimentacao.filter({ igreja_id: igrejaId }, '-data', 200, skip);
        allMovsBatch.push(...batch);
        if (batch.length < 200) break;
        skip += 200;
      }

      const [mbs, cats] = await Promise.all([
        base44.entities.Membro.filter({ igreja_id: igrejaId }, 'nome', 500),
        base44.entities.CategoriaConfig.filter({ igreja_id: igrejaId }, 'nome', 100),
      ]);

      setAllMovs(allMovsBatch);
      setMembros(mbs);
      setCategorias(cats);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [igrejaId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Atualização automática quando houver nova movimentação
  useEffect(() => {
    if (!igrejaId) return;
    const unsub = base44.entities.Movimentacao.subscribe(() => {
      loadData(true);
    });
    return () => unsub();
  }, [igrejaId, loadData]);

  // ── Períodos — últimos 30 dias vs 30 dias anteriores ──────────────────────
  const now = new Date();
  const inicioAtual = subDays(now, 30).toISOString().slice(0, 10);
  const fimAtual = now.toISOString().slice(0, 10);
  const inicioAnt = subDays(now, 60).toISOString().slice(0, 10);
  const fimAnt = subDays(now, 31).toISOString().slice(0, 10);

  const movsAtual = useMemo(() =>
    allMovs.filter(m => m.data >= inicioAtual && m.data <= fimAtual),
    [allMovs, inicioAtual, fimAtual]);

  const movsAnt = useMemo(() =>
    allMovs.filter(m => m.data >= inicioAnt && m.data <= fimAnt),
    [allMovs, inicioAnt, fimAnt]);

  // ── Totais ──────────────────────────────────────────────────────────────────
  const totAtual = useMemo(() => ({
    entradas: movsAtual.filter(m => m.tipo === 'entrada').reduce((s, m) => s + (m.valor || 0), 0),
    saidas: movsAtual.filter(m => m.tipo === 'saida').reduce((s, m) => s + (m.valor || 0), 0),
  }), [movsAtual]);

  const totAnt = useMemo(() => ({
    entradas: movsAnt.filter(m => m.tipo === 'entrada').reduce((s, m) => s + (m.valor || 0), 0),
    saidas: movsAnt.filter(m => m.tipo === 'saida').reduce((s, m) => s + (m.valor || 0), 0),
  }), [movsAnt]);

  // Saldo GLOBAL (todos os registros)
  const saldoGlobal = useMemo(() => {
    const e = allMovs.filter(m => m.tipo === 'entrada').reduce((s, m) => s + (m.valor || 0), 0);
    const s = allMovs.filter(m => m.tipo === 'saida').reduce((s, m) => s + (m.valor || 0), 0);
    return e - s;
  }, [allMovs]);

  const saldoAtual = totAtual.entradas - totAtual.saidas;
  const saldoAnt = totAnt.entradas - totAnt.saidas;

  // ── Membros novos este mês ───────────────────────────────────────────────────
  const mesKey = startOfMonth(now).toISOString().slice(0, 7);
  const membrosNovosMes = useMemo(() =>
    membros.filter(m => m.created_date?.slice(0, 7) === mesKey).length,
    [membros, mesKey]);

  // ── Últimas 10 movimentações ─────────────────────────────────────────────────
  const recentMovs = useMemo(() => allMovs.slice(0, 10), [allMovs]);

  // ── Badges de comparação ─────────────────────────────────────────────────────
  function buildBadge(curr, prev) {
    const p = pctDiff(curr, prev);
    if (p === null) return null;
    const abs = Math.abs(p).toFixed(1);
    if (p > 0) return { text: `▲ ${abs}% vs mês anterior`, positive: true };
    if (p < 0) return { text: `▼ ${abs}% vs mês anterior`, positive: false };
    return { text: 'Igual ao mês anterior', neutral: true };
  }

  // ── Insights acionáveis ──────────────────────────────────────────────────────
  const insights = useMemo(() => {
    const list = [];

    // 1. Déficit no mês atual
    if (saldoAtual < 0) {
      list.push({
        icon: AlertTriangle,
        color: 'text-destructive',
        bg: 'bg-destructive/8',
        title: 'Déficit neste mês',
        desc: `As saídas superam as entradas em ${fmt(Math.abs(saldoAtual))} este mês. Revise as despesas ou estimule contribuições.`,
        link: '/gerencia',
        linkLabel: 'Analisar saídas',
      });
    }

    // 2. Categoria com maior custo
    const saidasMes = movsAtual.filter(m => m.tipo === 'saida');
    if (saidasMes.length > 0) {
      const porCat = {};
      for (const m of saidasMes) {
        porCat[m.categoria_id] = (porCat[m.categoria_id] || 0) + (m.valor || 0);
      }
      const [topCatId, topVal] = Object.entries(porCat).sort((a, b) => b[1] - a[1])[0];
      const totalSaidas = totAtual.saidas;
      const porcento = totalSaidas > 0 ? ((topVal / totalSaidas) * 100).toFixed(0) : 0;
      if (porcento >= 30) {
        const catNome = categorias.find(c => c.id === topCatId)?.nome || 'categoria';
        list.push({
          icon: TrendingDown,
          color: 'text-destructive',
          bg: 'bg-destructive/8',
          title: 'Principal despesa',
          desc: `"${catNome}" representa ${porcento}% das saídas deste mês (${fmt(topVal)}). Avalie se é essencial.`,
          link: '/gerencia',
          linkLabel: 'Ver por categoria',
        });
      }
    }

    // 3. Queda de arrecadação (entradas mês atual < mês anterior)
    const quedaEntradas = pctDiff(totAtual.entradas, totAnt.entradas);
    if (quedaEntradas !== null && quedaEntradas < -10) {
      list.push({
        icon: AlertTriangle,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        title: 'Queda na arrecadação',
        desc: `As entradas deste mês estão ${Math.abs(quedaEntradas).toFixed(0)}% abaixo do mês anterior (${fmt(totAnt.entradas)} → ${fmt(totAtual.entradas)}).`,
        link: '/movimentacoes',
        linkLabel: 'Ver entradas',
      });
    }

    // 4. Crescimento positivo
    const crescimento = pctDiff(totAtual.entradas, totAnt.entradas);
    if (crescimento !== null && crescimento >= 10 && saldoAtual >= 0) {
      list.push({
        icon: TrendingUp,
        color: 'text-secondary',
        bg: 'bg-secondary/8',
        title: 'Arrecadação crescendo',
        desc: `Entradas cresceram ${crescimento.toFixed(0)}% vs mês anterior (${fmt(totAnt.entradas)} → ${fmt(totAtual.entradas)}). Excelente resultado!`,
        link: '/gerencia',
        linkLabel: 'Ver relatório',
      });
    }

    // 5. Sem entradas este mês
    if (totAtual.entradas === 0 && movsAtual.length === 0) {
      list.push({
        icon: Info,
        color: 'text-primary',
        bg: 'bg-primary/8',
        title: 'Sem lançamentos este mês',
        desc: 'Nenhuma movimentação registrada neste mês. Verifique se os dados foram lançados.',
        link: '/movimentacoes',
        linkLabel: 'Registrar movimentação',
      });
    }

    // 6. Membros sem contribuição (últimos 3 meses)
    const inicio3m = subDays(now, 90).toISOString().slice(0, 10);
    const movs3m = allMovs.filter(m => m.data >= inicio3m);
    const membrosSemContrib = membros.filter(m =>
      !movs3m.some(mv => mv.membro_id === m.id)
    );
    if (membrosSemContrib.length > 0 && list.length < 3) {
      list.push({
        icon: Users,
        color: 'text-primary',
        bg: 'bg-primary/8',
        title: 'Membros sem contribuição',
        desc: `${membrosSemContrib.length} membro(s) sem nenhuma contribuição nos últimos 3 meses.`,
        link: '/membros',
        linkLabel: 'Ver membros',
      });
    }

    // 7. Saldo global saudável (fallback positivo)
    if (list.length === 0 && saldoGlobal > 0) {
      list.push({
        icon: CheckCircle2,
        color: 'text-secondary',
        bg: 'bg-secondary/8',
        title: 'Caixa saudável',
        desc: `Saldo geral da igreja é ${fmt(saldoGlobal)}. Receitas estão superando despesas.`,
        link: '/gerencia',
        linkLabel: 'Ver relatório completo',
      });
    }

    return list.slice(0, 3);
  }, [saldoAtual, saldoGlobal, movsAtual, totAtual, totAnt, categorias, membros, allMovs]);

  // ── Label do período atual ───────────────────────────────────────────────────
  const periodoLabel = `Últimos 30 dias`;
  const periodoLabel2 = `30 dias anteriores`;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground capitalize">
              {periodoLabel}
            </h1>
            <p className="text-sm font-body text-muted-foreground mt-0.5">
              Comparado com {periodoLabel2}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="h-9 w-9 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-primary hover:bg-accent/60 transition-all"
              title={show ? 'Ocultar valores' : 'Exibir valores'}
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="h-9 w-9 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-primary hover:bg-accent/60 transition-all disabled:opacity-50"
              title="Atualizar"
            >
              {refreshing
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <RefreshCw className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Cards financeiros */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <FinCard
            label="Entradas"
            value={totAtual.entradas}
            icon={TrendingUp}
            color="#106d20"
            badge={buildBadge(totAtual.entradas, totAnt.entradas)}
            loading={loading}
          />
          <FinCard
            label="Saídas"
            value={totAtual.saidas}
            icon={TrendingDown}
            color="#ba1a1a"
            badge={buildBadge(totAtual.saidas, totAnt.saidas)}
            loading={loading}
          />
          <FinCard
            label="Saldo do Mês"
            value={saldoAtual}
            icon={Scale}
            color={saldoAtual >= 0 ? '#106d20' : '#ba1a1a'}
            badge={saldoAtual >= 0
              ? { text: 'Superávit no período', positive: true }
              : { text: `Déficit de ${fmt(Math.abs(saldoAtual))}`, positive: false }
            }
            loading={loading}
          />
          <FinCard
            label="Membros"
            value={membros.length}
            icon={Users}
            color="#715824"
            badge={membrosNovosMes > 0
              ? { text: `+${membrosNovosMes} novo(s) este mês`, positive: true }
              : null
            }
            loading={loading}
          />
        </div>

        {/* Saldo global */}
        {!loading && (
          <div className={`rounded-2xl px-5 py-4 flex items-center justify-between shadow-sacred ${saldoGlobal >= 0 ? 'bg-secondary/8' : 'bg-destructive/8'}`}>
            <div>
              <p className="text-xs font-body font-medium text-muted-foreground uppercase tracking-widest mb-1">Saldo Geral da Igreja (todos os registros)</p>
              <p className={`text-xl font-display font-bold ${saldoGlobal >= 0 ? 'text-secondary' : 'text-destructive'}`}>
                {fmtVal(saldoGlobal, show)}
              </p>
            </div>
            <Link to="/gerencia" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 shrink-0">
              Análise completa <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* Insights acionáveis */}
        {!loading && insights.length > 0 && (
          <div className="bg-card rounded-2xl shadow-sacred p-5">
            <p className="text-sm font-display font-bold text-foreground mb-4">Alertas e Insights</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {insights.map((ins, i) => <InsightCard key={i} {...ins} />)}
            </div>
          </div>
        )}

        {/* Últimas movimentações */}
        <div className="bg-card rounded-2xl shadow-sacred overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4">
            <p className="text-sm font-display font-bold text-foreground">Últimas movimentações</p>
            <Link to="/movimentacoes" className="text-xs font-body font-semibold text-primary hover:underline flex items-center gap-1">
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="py-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
            </div>
          ) : recentMovs.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Nenhuma movimentação registrada.</div>
          ) : (
            <div className="divide-y divide-border/30">
              {recentMovs.map((m) => {
                const cat = categorias.find(c => c.id === m.categoria_id);
                const isEntrada = m.tipo === 'entrada';
                return (
                  <div key={m.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-accent/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isEntrada ? 'bg-secondary/10' : 'bg-destructive/10'}`}>
                        {isEntrada
                          ? <TrendingUp className="w-3.5 h-3.5 text-secondary" />
                          : <TrendingDown className="w-3.5 h-3.5 text-destructive" />}
                      </div>
                      <div>
                        <p className="text-sm font-body font-medium text-foreground">{cat?.nome || '—'}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmtDate(m.data)}{m.membro_nome ? ` · ${m.membro_nome}` : ''}{m.descricao ? ` · ${m.descricao}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-display font-bold shrink-0 ${isEntrada ? 'text-secondary' : 'text-destructive'}`}>
                      {isEntrada ? '+' : '-'}{fmtVal(m.valor, show)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="px-5 py-4 border-t border-border/40">
            <Link to="/movimentacoes">
              <button className="w-full text-sm font-body font-semibold text-primary border border-primary/30 rounded-xl py-2.5 hover:bg-primary/5 transition-colors">
                Ver todas as movimentações
              </button>
            </Link>
          </div>
        </div>

        {/* Footer */}
        {lastUpdated && (
          <p className="text-center text-xs text-muted-foreground pb-2">
            Atualizado em {format(lastUpdated, "dd/MM/yyyy 'às' HH:mm")}
          </p>
        )}

      </div>
    </div>
  );
}