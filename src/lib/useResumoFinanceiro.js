/**
 * useResumoFinanceiro.js
 * Hook que busca o MovimentacaoResumo da igreja (um único registro).
 * Se não existir, recalcula do zero automaticamente.
 * Retorna { resumo, loading, reload }
 */
import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { recalcularResumo } from '@/lib/resumoUtils';

export function useResumoFinanceiro(igrejaId) {
  const [resumo, setResumo] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!igrejaId) return;
    setLoading(true);
    const list = await base44.entities.MovimentacaoResumo.filter({ igreja_id: igrejaId });
    if (list.length > 0) {
      setResumo(list[0]);
    } else {
      // Primeiro acesso: recalcula do zero para criar o registro
      await recalcularResumo(igrejaId);
      const updated = await base44.entities.MovimentacaoResumo.filter({ igreja_id: igrejaId });
      setResumo(updated[0] || { total_entrada: 0, total_saida: 0, saldo: 0 });
    }
    setLoading(false);
  }, [igrejaId]);

  useEffect(() => { load(); }, [load]);

  return { resumo, loading, reload: load };
}