import React from 'react';
import { Loader2, ChevronDown, ChevronRight, Inbox } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useShowValues, fmtVal } from '@/lib/useShowValues';

function MovRow({ mov, formas, index, show }) {
  const forma = formas.find(f => f.id === mov.forma_pagamento_id);
  const isEntrada = mov.tipo === 'entrada';
  let dataFmt = '—';
  try { dataFmt = format(new Date(mov.data), 'dd/MM/yyyy', { locale: ptBR }); } catch {}

  return (
    <tr className={`transition-colors hover:bg-accent/40 ${index % 2 === 0 ? 'bg-card' : 'bg-muted/20'}`}>
      <td className="px-5 py-2.5 text-sm text-muted-foreground whitespace-nowrap">{dataFmt}</td>
      <td className="px-5 py-2.5">
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
          style={isEntrada
            ? { backgroundColor: '#106d2014', color: '#106d20' }
            : { backgroundColor: '#ba1a1a14', color: '#ba1a1a' }
          }
        >
          {isEntrada ? '↑ Entrada' : '↓ Saída'}
        </span>
      </td>
      <td className="px-5 py-2.5 text-sm text-foreground">{mov.membro_nome || <span className="italic text-muted-foreground/50 text-xs">—</span>}</td>
      <td className="px-5 py-2.5 text-sm text-muted-foreground">{forma?.nome || <span className="italic text-xs">—</span>}</td>
      <td className="px-5 py-2.5 text-sm text-muted-foreground max-w-[160px] truncate">{mov.observacoes || mov.descricao || <span className="italic text-xs">—</span>}</td>
      <td className="px-5 py-2.5 text-right whitespace-nowrap">
        <span className="text-sm font-display font-bold" style={{ color: isEntrada ? '#106d20' : '#ba1a1a' }}>
          {fmtVal(mov.valor, show)}
        </span>
      </td>
    </tr>
  );
}

function CategoriaCard({ grupo, aberta, onToggle, formas, show }) {
  const saldoPos = grupo.saldo >= 0;
  const movOrdenados = [...grupo.movs].sort((a, b) => b.data?.localeCompare(a.data));

  return (
    <div className="bg-card rounded-2xl shadow-sacred overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(grupo.categoria_id)}
        className="w-full flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-sm text-foreground">{grupo.nome}</p>
          <p className="text-xs text-muted-foreground mt-0.5 font-body">{grupo.movs.length} movimentação(ões)</p>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-muted-foreground font-body">Entradas</p>
            <p className="font-display font-semibold" style={{ color: '#106d20' }}>{fmtVal(grupo.entradas, show)}</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs text-muted-foreground font-body">Saídas</p>
            <p className="font-display font-semibold" style={{ color: '#ba1a1a' }}>{fmtVal(grupo.saidas, show)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground font-body">Saldo</p>
            <p className="font-display font-bold" style={{ color: saldoPos ? '#106d20' : '#ba1a1a' }}>{fmtVal(grupo.saldo, show)}</p>
          </div>
        </div>
        {aberta
          ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        }
      </button>

      {aberta && (
        <div className="bg-muted/10 overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="bg-muted/40">
                <th className="px-5 py-2 text-left text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-widest">Data</th>
                <th className="px-5 py-2 text-left text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-widest">Tipo</th>
                <th className="px-5 py-2 text-left text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-widest">Membro</th>
                <th className="px-5 py-2 text-left text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-widest">Forma Pgto</th>
                <th className="px-5 py-2 text-left text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-widest">Observações</th>
                <th className="px-5 py-2 text-right text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-widest">Valor</th>
              </tr>
            </thead>
            <tbody>
              {movOrdenados.map((m, i) => <MovRow key={m.id} mov={m} formas={formas} index={i} show={show} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AgrupamentoCategoria({ agrupado, loading, categoriaAberta, onToggle, formas }) {
  const { show } = useShowValues();
  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (agrupado.length === 0) return (
    <div className="text-center py-16 bg-card rounded-2xl shadow-sacred">
      <Inbox className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
      <p className="text-sm text-muted-foreground">Nenhuma movimentação encontrada no período selecionado</p>
    </div>
  );

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-widest px-1">
        Por categoria ({agrupado.length})
      </h2>
      {agrupado.map(g => (
        <CategoriaCard
          key={g.categoria_id}
          grupo={g}
          aberta={categoriaAberta === g.categoria_id}
          onToggle={onToggle}
          formas={formas}
          show={show}
        />
      ))}
    </div>
  );
}