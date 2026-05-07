import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { migrateMovimentacoes } from '@/lib/migrationUtils';

/**
 * Dialog genérico de migração antes de excluir categoria ou forma de pagamento.
 * Props:
 *   open, onOpenChange
 *   field: 'categoria_id' | 'forma_pagamento_id'
 *   itemExcluindo: { id, nome }
 *   opcoes: [{ id, nome }]  — opções de destino (sem o item sendo excluído)
 *   igrejaId
 *   onDelete: () => void  — chamado após migração bem-sucedida
 *   count: number  — total de movimentações afetadas
 */
export default function MigracaoDialog({
  open, onOpenChange, field, itemExcluindo, opcoes, igrejaId, onDelete, count,
}) {
  const [destinoId, setDestinoId] = useState('');
  const [migrating, setMigrating] = useState(false);
  const [progresso, setProgresso] = useState({ atual: 0, total: 0 });
  const [fase, setFase] = useState('seleção'); // 'seleção' | 'migrando' | 'concluido'

  const opcoesDestino = opcoes.filter((o) => o.id !== itemExcluindo?.id);

  const handleConfirmar = async () => {
    if (!destinoId) return;
    setMigrating(true);
    setFase('migrando');
    setProgresso({ atual: 0, total: count });

    await migrateMovimentacoes({
      field,
      fromId: itemExcluindo.id,
      toId: destinoId,
      igrejaId,
      onProgress: (atual, total) => setProgresso({ atual, total }),
    });

    setFase('concluido');
    setMigrating(false);
    onDelete();
    onOpenChange(false);
    setFase('seleção');
    setDestinoId('');
    setProgresso({ atual: 0, total: 0 });
  };

  const percentual = progresso.total > 0
    ? Math.round((progresso.atual / progresso.total) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!migrating) onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Migração obrigatória antes de excluir
          </DialogTitle>
          <DialogDescription>
            <strong className="text-foreground">{count}</strong> movimentação(ões) usa(m){' '}
            <strong className="text-foreground">"{itemExcluindo?.nome}"</strong>.
            Selecione um destino antes de excluir.
          </DialogDescription>
        </DialogHeader>

        {fase === 'seleção' && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 text-sm">
              <span className="bg-destructive/10 text-destructive px-2 py-1 rounded font-mono truncate max-w-[140px]">
                {itemExcluindo?.nome}
              </span>
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <Select value={destinoId} onValueChange={setDestinoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar destino..." />
                  </SelectTrigger>
                  <SelectContent>
                    {opcoesDestino.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Todas as movimentações serão atualizadas em lotes de 50, com pausa de 1.5s entre lotes.
            </p>
          </div>
        )}

        {fase === 'migrando' && (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Migrando... {progresso.atual} de {progresso.total}
            </div>
            <Progress value={percentual} className="h-2" />
            <p className="text-xs text-muted-foreground">Não feche esta janela.</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={migrating}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={!destinoId || migrating || fase === 'migrando'}
          >
            {migrating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Migrar e Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}