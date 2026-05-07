import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useMovimentacoes } from '@/lib/useMovimentacoes';
import { useConfigs } from '@/lib/useConfigs';
import { useShowValues } from '@/lib/useShowValues';
import SaldoCards from '@/components/movimentacoes/SaldoCards';
import FiltrosMovimentacao from '@/components/movimentacoes/FiltrosMovimentacao';
import MovimentacaoRow from '@/components/movimentacoes/MovimentacaoRow';
import MovimentacaoForm from '@/components/movimentacoes/MovimentacaoForm';
import MovimentacaoDetalhe from '@/components/movimentacoes/MovimentacaoDetalhe';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Onboarding from './Onboarding';
import AguardandoVinculacao from '@/components/AguardandoVinculacao';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Inbox, Eye, EyeOff } from 'lucide-react';
import { executeAction } from '@/lib/notify';

export default function Movimentacoes() {
  const { user, loading: loadingUser } = useCurrentUser();
  const [filters, setFilters] = useState({ tipo: '', categoria_id: '', data_inicio: '', data_fim: '' });
  const [rawSearch, setRawSearch] = useState('');
  const [search, setSearch] = useState(''); // debounced
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [detalheData, setDetalheData] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // mov a excluir
  const sentinelRef = useRef(null);
  const { show, toggle } = useShowValues();

  // Debounce: só atualiza `search` após 300ms sem digitar
  useEffect(() => {
    const id = setTimeout(() => setSearch(rawSearch), 300);
    return () => clearTimeout(id);
  }, [rawSearch]);

  const igrejaId = user?.igreja_id;
  const isAdmin = user?.role === 'admin';

  const { categorias, formas, membros } = useConfigs(igrejaId);

  const { items, loading, loadingMore, hasMore, loadMore, reload, isSearching } = useMovimentacoes({
    igrejaId,
    filters,
    searchTerm: search,
  });

  // Totais calculados direto dos dados reais (query separada, sem cache)
  const [totais, setTotais] = useState({ entradas: 0, saidas: 0 });
  const [loadingTotais, setLoadingTotais] = useState(false);

  const loadTotais = useCallback(async () => {
    if (!igrejaId) return;
    setLoadingTotais(true);
    let totalEntradas = 0;
    let totalSaidas = 0;
    let skip = 0;
    while (true) {
      const batch = await base44.entities.Movimentacao.filter({ igreja_id: igrejaId }, '-data', 200, skip);
      for (const m of batch) {
        if (m.tipo === 'entrada') totalEntradas += Number(m.valor || 0);
        else totalSaidas += Number(m.valor || 0);
      }
      if (batch.length < 200) break;
      skip += 200;
    }
    setTotais({ entradas: totalEntradas, saidas: totalSaidas });
    setLoadingTotais(false);
  }, [igrejaId]);

  useEffect(() => { loadTotais(); }, [loadTotais]);

  // Intersection Observer para scroll infinito
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) loadMore();
    }, { threshold: 0.1 });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  const handleEdit = (mov) => { setEditData(mov); setFormOpen(true); };
  const handleNew = () => { setEditData(null); setFormOpen(true); };

  const handleDelete = (mov) => setConfirmDelete(mov);

  const handleConfirmDelete = async () => {
    const mov = confirmDelete;
    setConfirmDelete(null);
    await executeAction(
      async () => {
        await base44.entities.Movimentacao.delete(mov.id);
      },
      { success: 'Movimentação excluída com sucesso', error: 'Erro ao excluir movimentação' }
    );
    reload();
    loadTotais();
  };

  if (loadingUser) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (user && !user.igreja_id) {
    if (user.role === 'admin') return <Onboarding user={user} onComplete={() => window.location.reload()} />;
    return <AguardandoVinculacao user={user} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Movimentações</h1>
            <p className="text-sm font-body text-muted-foreground mt-0.5">Entradas e saídas financeiras da igreja</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggle}
              className="h-9 w-9 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-primary hover:bg-accent/60 transition-all"
              title={show ? 'Ocultar valores' : 'Exibir valores'}
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            {isAdmin && (
              <button onClick={handleNew} className="btn-sacred px-5 py-2.5 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" /> Nova Movimentação
              </button>
            )}
          </div>
        </div>

        {/* Saldo — calculado diretamente dos registros reais */}
        <SaldoCards totais={totais} />

        {/* Filtros */}
        <FiltrosMovimentacao
          search={rawSearch}
          onSearch={(v) => { setRawSearch(v); if (v === '') setSearch(''); }}
          filters={filters}
          onFilters={setFilters}
          categorias={categorias}
        />

        {/* Ledger — no borders, surface hierarchy */}
        <div className="bg-card rounded-2xl shadow-sacred overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="bg-muted/60">
                  <th className="px-5 py-3 text-left text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-widest">Data</th>
                  <th className="px-5 py-3 text-left text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-widest">Tipo</th>
                  <th className="px-5 py-3 text-left text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-widest">Categoria</th>
                  <th className="px-5 py-3 text-left text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-widest">Membro</th>
                  <th className="px-5 py-3 text-left text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-widest">Forma Pgto</th>
                  <th className="px-5 py-3 text-left text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-widest">Valor</th>
                  <th className="px-5 py-3 text-right text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-widest">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-16">
                    <Inbox className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Nenhuma movimentação encontrada</p>
                  </td></tr>
                ) : (
                  items.map((mov, idx) => (
                    <MovimentacaoRow
                      key={mov.id}
                      index={idx}
                      mov={mov}
                      categorias={categorias}
                      formas={formas}
                      isAdmin={isAdmin}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onView={setDetalheData}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Sentinel — scroll infinito (modo normal) / contagem (modo busca) */}
          <div ref={sentinelRef} className="py-4 text-center">
            {loadingMore && <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />}
            {isSearching && !loading && (
              <p className="text-xs text-muted-foreground">{items.length} registro(s) encontrado(s)</p>
            )}
            {!isSearching && !hasMore && items.length > 0 && (
              <p className="text-xs text-muted-foreground">Todos os registros carregados ({items.length})</p>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      <MovimentacaoForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editData={editData}
        igrejaId={igrejaId}
        categorias={categorias}
        formas={formas}
        membros={membros}
        onSaved={() => { reload(); loadTotais(); }}
      />

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => { if (!v) setConfirmDelete(null); }}
        title="Excluir movimentação"
        description={confirmDelete ? `Deseja excluir esta movimentação de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(confirmDelete.valor)}? Esta ação não pode ser desfeita.` : ''}
        onConfirm={handleConfirmDelete}
        confirmLabel="Excluir"
        destructive
      />

      {/* Detalhe */}
      <MovimentacaoDetalhe
        open={!!detalheData}
        onOpenChange={(v) => { if (!v) setDetalheData(null); }}
        mov={detalheData}
        categorias={categorias}
        formas={formas}
      />
    </div>
  );
}