import React from 'react';
import { Button } from '@/components/ui/button';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useShowValues, fmtVal } from '@/lib/useShowValues';

export default function MovimentacaoRow({ mov, categorias, formas, isAdmin, onEdit, onDelete, onView, index }) {
  const { show } = useShowValues();
  const cat = categorias?.find(c => c.id === mov.categoria_id);
  const forma = formas?.find(f => f.id === mov.forma_pagamento_id);
  const isEntrada = mov.tipo === 'entrada';

  let dataFmt = '—';
  try { dataFmt = format(new Date(mov.data + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }); } catch {}

  // alternating row tone — no borders
  const rowBg = (index ?? 0) % 2 === 0 ? 'bg-card' : 'bg-muted/30';

  return (
    <tr className={`${rowBg} transition-colors duration-100 hover:bg-accent/40`}>
      <td className="px-5 py-3.5 text-sm font-body text-muted-foreground whitespace-nowrap">{dataFmt}</td>
      <td className="px-5 py-3.5">
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-body font-semibold"
          style={isEntrada
            ? { backgroundColor: '#106d2014', color: '#106d20' }
            : { backgroundColor: '#ba1a1a14', color: '#ba1a1a' }
          }
        >
          {isEntrada ? '↑ Entrada' : '↓ Saída'}
        </span>
      </td>
      <td className="px-5 py-3.5 text-sm font-body text-foreground">{cat?.nome || <span className="text-muted-foreground/50 italic text-xs">—</span>}</td>
      <td className="px-5 py-3.5 text-sm font-body text-foreground">{mov.membro_nome || <span className="text-muted-foreground/50 italic text-xs">—</span>}</td>
      <td className="px-5 py-3.5 text-sm font-body text-muted-foreground">{forma?.nome || <span className="italic text-xs">—</span>}</td>
      <td className="px-5 py-3.5">
        <span className="text-sm font-display font-bold" style={{ color: isEntrada ? '#106d20' : '#ba1a1a' }}>
          {fmtVal(mov.valor, show)}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-1 justify-end">
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => onView?.(mov)}>
            <Eye className="w-3.5 h-3.5" />
          </Button>
          {isAdmin && (
            <>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => onEdit?.(mov)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete?.(mov)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}