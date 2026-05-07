import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export function useConfigs(igrejaId) {
  const [categorias, setCategorias] = useState([]);
  const [formas, setFormas] = useState([]);
  const [membros, setMembros] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!igrejaId) return;
    (async () => {
      setLoading(true);
      const [cats, frms, mems] = await Promise.all([
        base44.entities.CategoriaConfig.filter({ igreja_id: igrejaId }, 'nome'),
        base44.entities.FormaPagamentoConfig.filter({ igreja_id: igrejaId }, 'nome'),
        base44.entities.Membro.filter({ igreja_id: igrejaId }, 'nome'),
      ]);
      setCategorias(cats);
      setFormas(frms);
      setMembros(mems);
      setLoading(false);
    })();
  }, [igrejaId]);

  return { categorias, formas, membros, loading };
}