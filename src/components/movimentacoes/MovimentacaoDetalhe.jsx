import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useShowValues, fmtVal } from '@/lib/useShowValues';

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2 border-b last:border-0 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}

export default function MovimentacaoDetalhe({ open, onOpenChange, mov, categorias, formas }) {
  const { show } = useShowValues();
  if (!mov) return null;
  const cat = categorias.find(c => c.id === mov.categoria_id);
  const forma = formas.find(f => f.id === mov.forma_pagamento_id);
  const isEntrada = mov.tipo === 'entrada';

  let dataFmt = '-';
  try { dataFmt = format(new Date(mov.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }); } catch {}

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Badge className={isEntrada ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
              {isEntrada ? '↑ Entrada' : '↓ Saída'}
            </Badge>
            <span className={`text-xl font-bold ${isEntrada ? 'text-green-600' : 'text-red-500'}`}>
              {fmtVal(mov.valor, show)}
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Row label="Data" value={dataFmt} />
          <Row label="Categoria" value={cat?.nome} />
          <Row label="Forma de pagamento" value={forma?.nome} />
          <Row label="Membro" value={mov.membro_nome} />
          <Row label="Descrição" value={mov.descricao} />
          <Row label="Observações" value={mov.observacoes} />
        </div>
      </DialogContent>
    </Dialog>
  );
}