import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useConfigs } from '@/lib/useConfigs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Gerência — Movimentações
import ResumoCards from '@/components/gerencia/ResumoCards';
import FiltrosGerencia from '@/components/gerencia/FiltrosGerencia';
import TabelaRelatorio from '@/components/gerencia/TabelaRelatorio';

// Prestação de Contas (movido para dentro de Gerência)
import ResumoContas from '@/components/prestacao/ResumoContas';
import FiltrosPrestacao from '@/components/prestacao/FiltrosPrestacao';
import AgrupamentoCategoria from '@/components/prestacao/AgrupamentoCategoria';
import ExportarRelatorio from '@/components/prestacao/ExportarRelatorio';

import { filtrarMovimentacoes } from '@/lib/useMovimentacoes';
import Onboarding from './Onboarding';
import AguardandoVinculacao from '@/components/AguardandoVinculacao';
import { Loader2, ShieldAlert, BarChart3, TrendingUp, FileText, Eye, EyeOff } from 'lucide-react';
import { useShowValues } from '@/lib/useShowValues';

const EMPTY_FILTERS_GERENCIA = {
  tipo: '', categoria_id: '', forma_pagamento_id: '', membro_id: '',
  ano: '', mes: '', data_inicio: '', data_fim: '',
};
const EMPTY_FILTERS_PRESTACAO = { ano: '', mes: '', data_inicio: '', data_fim: '' };

export default function Gerencia() {
  const { user, loading: loadingUser } = useCurrentUser();
  const igrejaId = user?.igreja_id;
  const isAdmin = user?.role === 'admin';
  const { categorias, formas, membros } = useConfigs(igrejaId);
  const { show, toggle } = useShowValues();

  // Resumo calculado diretamente dos dados reais (sem cache)

  // Movimentações filtradas — carregadas sob demanda para relatórios
  const [allMovs, setAllMovs] = useState([]);
  const [loadingMovs, setLoadingMovs] = useState(false);

  // Gerência filters
  const [search, setSearch] = useState('');
  const [filtersG, setFiltersG] = useState(EMPTY_FILTERS_GERENCIA);

  // Prestação filters
  const [filtersP, setFiltersP] = useState(EMPTY_FILTERS_PRESTACAO);
  const [categoriaAberta, setCategoriaAberta] = useState(null);

  // Carrega movimentações para relatórios (aba Relatórios e Prestação de Contas)
  useEffect(() => {
    if (!igrejaId || !isAdmin) return;
    (async () => {
      setLoadingMovs(true);
      const all = [];
      let skip = 0;
      while (true) {
        const batch = await base44.entities.Movimentacao.filter({ igreja_id: igrejaId }, '-data', 200, skip);
        all.push(...batch);
        if (batch.length < 200) break;
        skip += 200;
      }
      setAllMovs(all);
      setLoadingMovs(false);
    })();
  }, [igrejaId, isAdmin]);

  // ── Gerência: filtragem ────────────────────────────────────────────────────
  const filteredG = useMemo(() => {
    // Filtros extras do Gerência (ano, mes, forma, membro) que não existem no hook base
    const preFiltered = allMovs.filter(m => {
      if (filtersG.forma_pagamento_id && m.forma_pagamento_id !== filtersG.forma_pagamento_id) return false;
      if (filtersG.membro_id && m.membro_id !== filtersG.membro_id) return false;
      if (filtersG.ano || filtersG.mes) {
        const d = m.data ? new Date(m.data) : null;
        if (!d) return false;
        if (filtersG.ano && String(d.getFullYear()) !== filtersG.ano) return false;
        if (filtersG.mes && String(d.getMonth() + 1).padStart(2, '0') !== filtersG.mes) return false;
      }
      return true;
    });
    // Usa função centralizada para filtros estruturais + busca textual
    return filtrarMovimentacoes(preFiltered, {
      tipo: filtersG.tipo,
      categoria_id: filtersG.categoria_id,
      data_inicio: filtersG.data_inicio,
      data_fim: filtersG.data_fim,
    }, search, categorias, formas);
  }, [allMovs, filtersG, search, categorias, formas]);

  const hasActiveFilters = !!(filtersG.tipo || filtersG.categoria_id || filtersG.forma_pagamento_id ||
    filtersG.membro_id || filtersG.ano || filtersG.mes || filtersG.data_inicio || filtersG.data_fim || search);

  const totaisG = useMemo(() => {
    // Sempre calcular a partir dos dados reais — nunca usar cache
    const base = hasActiveFilters ? filteredG : allMovs;
    const entradas = base.filter(m => m.tipo === 'entrada').reduce((s, m) => s + Number(m.valor || 0), 0);
    const saidas   = base.filter(m => m.tipo === 'saida').reduce((s, m) => s + Number(m.valor || 0), 0);
    return { entradas, saidas, saldo: entradas - saidas, total: base.length };
  }, [filteredG, hasActiveFilters, allMovs]);

  // ── Prestação: filtragem ───────────────────────────────────────────────────
  const movsPeríodo = useMemo(() => {
    return allMovs.filter(m => {
      if (filtersP.data_inicio && m.data < filtersP.data_inicio) return false;
      if (filtersP.data_fim && m.data > filtersP.data_fim) return false;
      if (filtersP.ano || filtersP.mes) {
        const d = m.data ? new Date(m.data) : null;
        if (!d) return false;
        if (filtersP.ano && String(d.getFullYear()) !== filtersP.ano) return false;
        if (filtersP.mes && String(d.getMonth() + 1).padStart(2, '0') !== filtersP.mes) return false;
      }
      return true;
    });
  }, [allMovs, filtersP]);

  // saldoCaixa global — calculado diretamente de todos os registros
  const saldoCaixa = useMemo(() => {
    const entradas = allMovs.filter(m => m.tipo === 'entrada').reduce((s, m) => s + Number(m.valor || 0), 0);
    const saidas   = allMovs.filter(m => m.tipo === 'saida').reduce((s, m) => s + Number(m.valor || 0), 0);
    return entradas - saidas;
  }, [allMovs]);

  const totaisPeriodo = useMemo(() => {
    const entradas = movsPeríodo.filter(m => m.tipo === 'entrada').reduce((s, m) => s + (m.valor || 0), 0);
    const saidas = movsPeríodo.filter(m => m.tipo === 'saida').reduce((s, m) => s + (m.valor || 0), 0);
    return { entradas, saidas, saldo: entradas - saidas };
  }, [movsPeríodo]);

  const agrupado = useMemo(() => {
    const map = {};
    for (const m of movsPeríodo) {
      const cid = m.categoria_id || '__sem_categoria';
      if (!map[cid]) map[cid] = { entradas: 0, saidas: 0, movs: [] };
      if (m.tipo === 'entrada') map[cid].entradas += m.valor || 0;
      else map[cid].saidas += m.valor || 0;
      map[cid].movs.push(m);
    }
    return Object.entries(map)
      .map(([cid, v]) => ({
        categoria_id: cid,
        nome: categorias.find(c => c.id === cid)?.nome || 'Sem categoria',
        ...v,
        saldo: v.entradas - v.saidas,
      }))
      .sort((a, b) => (b.entradas + b.saidas) - (a.entradas + a.saidas));
  }, [movsPeríodo, categorias]);

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (loadingUser) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (user && !user.igreja_id) {
    if (user.role === 'admin') return <Onboarding user={user} onComplete={() => window.location.reload()} />;
    return <AguardandoVinculacao user={user} />;
  }

  if (!isAdmin) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-center p-8">
      <ShieldAlert className="w-10 h-10 text-destructive" />
      <h2 className="text-lg font-semibold">Acesso restrito</h2>
      <p className="text-sm text-muted-foreground max-w-sm">Apenas administradores podem acessar a Gerência.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Gerência</h1>
            <p className="text-sm font-body text-muted-foreground">Análise financeira e prestação de contas</p>
          </div>
          <div className="ml-auto">
            <button
              onClick={toggle}
              className="h-9 w-9 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-primary hover:bg-accent/60 transition-all"
              title={show ? 'Ocultar valores' : 'Exibir valores'}
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Abas */}
        <Tabs defaultValue="movimentacoes">
          <TabsList className="mb-2">
            <TabsTrigger value="movimentacoes" className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Relatórios
            </TabsTrigger>
            <TabsTrigger value="prestacao" className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Prestação de Contas
            </TabsTrigger>
          </TabsList>

          {/* ── Aba: Movimentações ── */}
          <TabsContent value="movimentacoes" className="space-y-6">
            <ResumoCards totais={totaisG} loading={loadingMovs} />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div />
              <ExportarRelatorio
                movsPeríodo={filteredG}
                agrupado={[]}
                totaisPeriodo={totaisG}
                saldoCaixa={totaisG.saldo}
                categorias={categorias}
                formas={formas}
                filters={filtersG}
              />
            </div>
            <FiltrosGerencia
              search={search}
              onSearch={setSearch}
              filters={filtersG}
              onFilters={setFiltersG}
              categorias={categorias}
              formas={formas}
              membros={membros}
              emptyFilters={EMPTY_FILTERS_GERENCIA}
            />
            <TabelaRelatorio
              items={filteredG}
              categorias={categorias}
              formas={formas}
              loading={loadingMovs}
            />
          </TabsContent>

          {/* ── Aba: Prestação de Contas ── */}
          <TabsContent value="prestacao" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm font-body text-muted-foreground">Relatório consolidado por período e categoria</p>
              <ExportarRelatorio
                movsPeríodo={movsPeríodo}
                agrupado={agrupado}
                totaisPeriodo={totaisPeriodo}
                saldoCaixa={saldoCaixa}
                categorias={categorias}
                formas={formas}
                filters={filtersP}
              />
            </div>
            <FiltrosPrestacao filters={filtersP} onFilters={setFiltersP} emptyFilters={EMPTY_FILTERS_PRESTACAO} />
            <ResumoContas saldoCaixa={saldoCaixa} totaisPeriodo={totaisPeriodo} loading={loadingMovs} />
            <AgrupamentoCategoria
              agrupado={agrupado}
              loading={loadingMovs}
              categoriaAberta={categoriaAberta}
              onToggle={(id) => setCategoriaAberta(prev => prev === id ? null : id)}
              formas={formas}
            />
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}