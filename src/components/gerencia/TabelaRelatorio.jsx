import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useShowValues, fmtVal } from '@/lib/useShowValues';

const PAGE_SIZE = 30;

export default function TabelaRelatorio({ items, categorias, formas, loading }) {
  const { show } = useShowValues();
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [items.length]);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pageItems = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
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
              <th className="px-5 py-3 text-left text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-widest">Descrição</th>
              <th className="px-5 py-3 text-right text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-widest">Valor</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-14">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">Carregando movimentações...</p>
              </td></tr>
            ) : pageItems.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16">
                <Inbox className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum registro encontrado</p>
              </td></tr>
            ) : (
              pageItems.map((m, idx) => {
                const cat = categorias.find(c => c.id === m.categoria_id);
                const forma = formas.find(f => f.id === m.forma_pagamento_id);
                const isEntrada = m.tipo === 'entrada';

                let dataFmt = '—';
                try { dataFmt = format(new Date(m.data), 'dd/MM/yyyy', { locale: ptBR }); } catch {}

                return (
                  <tr key={m.id} className={`transition-colors duration-100 hover:bg-accent/40 ${idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}>
                    <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">{dataFmt}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={isEntrada
                          ? { backgroundColor: '#106d2014', color: '#106d20' }
                          : { backgroundColor: '#ba1a1a14', color: '#ba1a1a' }
                        }
                      >
                        {isEntrada ? '↑ Entrada' : '↓ Saída'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-foreground">{cat?.nome || <span className="text-muted-foreground/50 italic text-xs">—</span>}</td>
                    <td className="px-5 py-3.5 text-foreground">{m.membro_nome || <span className="text-muted-foreground/50 italic text-xs">—</span>}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{forma?.nome || <span className="italic text-xs">—</span>}</td>
                    <td className="px-5 py-3.5 text-muted-foreground max-w-[160px] truncate">{m.descricao || <span className="italic text-xs">—</span>}</td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <span className="font-display font-bold text-sm" style={{ color: isEntrada ? '#106d20' : '#ba1a1a' }}>
                        {fmtVal(m.valor, show)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {!loading && items.length > 0 && (
        <div className="flex items-center justify-between px-5 py-3 bg-muted/30 text-sm text-muted-foreground">
          <span className="text-xs font-body">{items.length} registro(s) · página {page + 1} de {totalPages}</span>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPage(p => p - 1)} disabled={page === 0}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}