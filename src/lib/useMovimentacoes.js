import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';

const PAGE_SIZE = 50;

/**
 * Filtra movimentações em memória — função centralizada usada por
 * Movimentações e Relatórios para garantir consistência total.
 */
export function filtrarMovimentacoes(movs, filters = {}, searchTerm = '', categorias = [], formas = []) {
  const t = searchTerm?.toLowerCase().trim() || '';

  return movs.filter(m => {
    if (filters.tipo && m.tipo !== filters.tipo) return false;
    if (filters.categoria_id && m.categoria_id !== filters.categoria_id) return false;
    if (filters.data_inicio && m.data < filters.data_inicio) return false;
    if (filters.data_fim && m.data > filters.data_fim) return false;

    if (t) {
      const cat = categorias.find(c => c.id === m.categoria_id);
      const forma = formas.find(f => f.id === m.forma_pagamento_id);
      return (
        m.descricao?.toLowerCase().includes(t) ||
        m.observacoes?.toLowerCase().includes(t) ||
        m.membro_nome?.toLowerCase().includes(t) ||
        cat?.nome?.toLowerCase().includes(t) ||
        forma?.nome?.toLowerCase().includes(t) ||
        String(m.valor || '').includes(t)
      );
    }

    return true;
  });
}

/**
 * Hook de movimentações com dois modos:
 *
 * MODO NORMAL (sem busca):
 *   - Scroll infinito paginado (50/página)
 *   - Backend filtra tipo, categoria, datas
 *
 * MODO BUSCA (searchTerm ativo):
 *   - Pré-carrega até 200 registros do backend (com filtros estruturais)
 *   - Filtragem textual em memória — rápida, precisa
 *   - Scroll infinito desativado
 */
export function useMovimentacoes({ igrejaId, filters, searchTerm }) {
  // Dataset paginado (modo normal)
  const [pages, setPages] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Dataset para busca (todos os registros)
  const [searchPool, setSearchPool] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const pageRef = useRef(0);
  const fetchingRef = useRef(false);
  const searchPoolLoadedRef = useRef(''); // chave para evitar recarregar se igrejaId não mudou

  const isSearching = Boolean(searchTerm?.trim());

  // Query backend (apenas filtros estruturais — sem busca textual)
  const buildQuery = useCallback(() => {
    const q = { igreja_id: igrejaId };
    if (filters.tipo) q.tipo = filters.tipo;
    if (filters.categoria_id) q.categoria_id = filters.categoria_id;
    if (filters.data_inicio || filters.data_fim) {
      q.data = {};
      if (filters.data_inicio) q.data.$gte = filters.data_inicio;
      if (filters.data_fim) q.data.$lte = filters.data_fim;
    }
    return q;
  }, [igrejaId, filters]);

  // ── MODO NORMAL: carga inicial paginada ──────────────────────────────────
  const loadInitial = useCallback(async () => {
    if (!igrejaId || fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    pageRef.current = 0;

    try {
      const data = await base44.entities.Movimentacao.filter(buildQuery(), '-data', PAGE_SIZE, 0);
      setPages(data);
      setHasMore(data.length === PAGE_SIZE);
      pageRef.current = 1;
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [igrejaId, buildQuery]);

  // ── MODO NORMAL: carregar mais (scroll) ──────────────────────────────────
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || fetchingRef.current || isSearching) return;
    fetchingRef.current = true;
    setLoadingMore(true);

    try {
      const skip = pageRef.current * PAGE_SIZE;
      const data = await base44.entities.Movimentacao.filter(buildQuery(), '-data', PAGE_SIZE, skip);

      setPages(prev => {
        const ids = new Set(prev.map(i => i.id));
        return [...prev, ...data.filter(d => !ids.has(d.id))];
      });

      setHasMore(data.length === PAGE_SIZE);
      pageRef.current += 1;
    } finally {
      setLoadingMore(false);
      fetchingRef.current = false;
    }
  }, [buildQuery, loadingMore, hasMore, isSearching]);

  // ── MODO BUSCA: carrega TODOS os registros (sem limite) ──────────────────
  // Usa apenas igreja_id — filtros estruturais são aplicados depois em memória
  // para garantir consistência com a página Gerência > Relatórios
  const loadSearchPool = useCallback(async () => {
    if (!igrejaId) return;
    if (searchPoolLoadedRef.current === igrejaId) return; // já carregado para essa igreja
    searchPoolLoadedRef.current = igrejaId;

    setLoadingSearch(true);
    try {
      const all = [];
      let skip = 0;
      while (true) {
        const batch = await base44.entities.Movimentacao.filter(
          { igreja_id: igrejaId }, '-data', 200, skip
        );
        all.push(...batch);
        if (batch.length < 200) break;
        skip += 200;
      }
      setSearchPool(all);
    } finally {
      setLoadingSearch(false);
    }
  }, [igrejaId]);

  // Recarregar dataset normal quando filtros estruturais mudam
  const filtersKey = JSON.stringify(filters);
  useEffect(() => {
    if (!igrejaId) return;
    loadInitial();
  }, [igrejaId, filtersKey]);

  // Invalidar pool se igrejaId mudar
  useEffect(() => {
    searchPoolLoadedRef.current = '';
    setSearchPool([]);
  }, [igrejaId]);

  // Expor função de invalidação do pool para uso externo (ex: após salvar/excluir)
  const invalidatePool = useCallback(() => {
    searchPoolLoadedRef.current = '';
    setSearchPool([]);
  }, []);

  // Pré-carregar pool quando entra no modo busca
  useEffect(() => {
    if (!igrejaId || !isSearching) return;
    loadSearchPool();
  }, [igrejaId, isSearching, loadSearchPool]);

  // Itens finais:
  // - modo busca → aplica filtrarMovimentacoes() sobre TODOS os registros (igual Gerência)
  // - modo normal → pages paginadas
  const items = useMemo(() => {
    if (isSearching) {
      return filtrarMovimentacoes(searchPool, filters, searchTerm);
    }
    return pages;
  }, [isSearching, searchPool, searchTerm, filters, pages]);

  const isLoading = isSearching ? loadingSearch : loading;

  const reloadAll = useCallback(() => {
    invalidatePool();
    loadInitial();
  }, [invalidatePool, loadInitial]);

  return {
    items,
    loading: isLoading,
    loadingMore: isSearching ? false : loadingMore,
    hasMore: isSearching ? false : hasMore,
    loadMore,
    reload: reloadAll,
    isSearching,
  };
}