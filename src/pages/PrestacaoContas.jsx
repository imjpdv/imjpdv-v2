import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useConfigs } from '@/lib/useConfigs';
import ResumoContas from '@/components/prestacao/ResumoContas';
import FiltrosPrestacao from '@/components/prestacao/FiltrosPrestacao';
import AgrupamentoCategoria from '@/components/prestacao/AgrupamentoCategoria';
import ExportarRelatorio from '@/components/prestacao/ExportarRelatorio';
import Onboarding from './Onboarding';
import AguardandoVinculacao from '@/components/AguardandoVinculacao';
import { Loader2, ShieldAlert, FileText } from 'lucide-react';

const EMPTY_FILTERS = { ano: '', mes: '', data_inicio: '', data_fim: '' };

export default function PrestacaoContas() {
  const { user, loading: loadingUser } = useCurrentUser();
  const igrejaId = user?.igreja_id;
  const isAdmin = user?.role === 'admin';

  const { categorias, formas } = useConfigs(igrejaId);

  const [allMovs, setAllMovs] = useState([]);
  const [loadingMovs, setLoadingMovs] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [categoriaAberta, setCategoriaAberta] = useState(null);

  // Carrega todas as movimentações uma vez
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

  // Movimentações do período (filtradas)
  const movsPeríodo = useMemo(() => {
    return allMovs.filter(m => {
      if (filters.data_inicio && m.data < filters.data_inicio) return false;
      if (filters.data_fim && m.data > filters.data_fim) return false;
      if (filters.ano || filters.mes) {
        const d = m.data ? new Date(m.data) : null;
        if (!d) return false;
        if (filters.ano && String(d.getFullYear()) !== filters.ano) return false;
        if (filters.mes && String(d.getMonth() + 1).padStart(2, '0') !== filters.mes) return false;
      }
      return true;
    });
  }, [allMovs, filters]);

  // Saldo histórico total (sem filtro de período)
  const saldoCaixa = useMemo(() => {
    return allMovs.reduce((s, m) => m.tipo === 'entrada' ? s + (m.valor || 0) : s - (m.valor || 0), 0);
  }, [allMovs]);

  // Totais do período
  const totaisPeriodo = useMemo(() => {
    const entradas = movsPeríodo.filter(m => m.tipo === 'entrada').reduce((s, m) => s + (m.valor || 0), 0);
    const saidas = movsPeríodo.filter(m => m.tipo === 'saida').reduce((s, m) => s + (m.valor || 0), 0);
    return { entradas, saidas, saldo: entradas - saidas };
  }, [movsPeríodo]);

  // Agrupamento por categoria
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
      <p className="text-sm text-muted-foreground max-w-sm">Apenas administradores podem acessar a Prestação de Contas.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">Prestação de Contas</h1>
              <p className="text-sm text-muted-foreground">Relatório consolidado por período</p>
            </div>
          </div>
          <ExportarRelatorio
            movsPeríodo={movsPeríodo}
            agrupado={agrupado}
            totaisPeriodo={totaisPeriodo}
            saldoCaixa={saldoCaixa}
            categorias={categorias}
            formas={formas}
            filters={filters}
          />
        </div>

        {/* Filtros */}
        <FiltrosPrestacao filters={filters} onFilters={setFilters} emptyFilters={EMPTY_FILTERS} />

        {/* Cards resumo */}
        <ResumoContas saldoCaixa={saldoCaixa} totaisPeriodo={totaisPeriodo} loading={loadingMovs} />

        {/* Agrupamento por categoria */}
        <AgrupamentoCategoria
          agrupado={agrupado}
          loading={loadingMovs}
          categoriaAberta={categoriaAberta}
          onToggle={(id) => setCategoriaAberta(prev => prev === id ? null : id)}
          formas={formas}
        />
      </div>
    </div>
  );
}