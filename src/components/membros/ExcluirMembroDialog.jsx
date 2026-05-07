import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Loader2, UserX, UserCheck } from 'lucide-react';
import { executeAction, notifyError } from '@/lib/notify';
import { resumoOnDelete } from '@/lib/resumoUtils';

const BATCH_SIZE = 50;
const BATCH_DELAY = 1500;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchAllMovimentacoesMembro(membroId, igrejaId) {
  const all = [];
  let skip = 0;
  while (true) {
    const batch = await base44.entities.Movimentacao.filter({ membro_id: membroId, igreja_id: igrejaId }, '-data', BATCH_SIZE, skip);
    all.push(...batch);
    if (batch.length < BATCH_SIZE) break;
    skip += BATCH_SIZE;
  }
  return all;
}

export default function ExcluirMembroDialog({ open, onOpenChange, membro, membros, igrejaId, onDeleted }) {
  const [movCount, setMovCount] = useState(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [opcao, setOpcao] = useState(''); // 'migrar' | 'desvincular'
  const [membroDestino, setMembroDestino] = useState('');
  const [executando, setExecutando] = useState(false);
  const [progresso, setProgresso] = useState({ atual: 0, total: 0 });

  useEffect(() => {
    if (open && membro) {
      setOpcao('');
      setMembroDestino('');
      setProgresso({ atual: 0, total: 0 });
      setLoadingCount(true);
      fetchAllMovimentacoesMembro(membro.id, igrejaId)
        .then(movs => setMovCount(movs.length))
        .finally(() => setLoadingCount(false));
    }
  }, [open, membro, igrejaId]);

  const outrosMembros = membros.filter(m => m.id !== membro?.id);

  const handleExecutar = async () => {
    if (movCount > 0 && !opcao) return notifyError('Selecione uma opção.');
    if (opcao === 'migrar' && !membroDestino) return notifyError('Selecione o membro de destino.');

    setExecutando(true);

    if (movCount > 0) {
      const movs = await fetchAllMovimentacoesMembro(membro.id, igrejaId);
      setProgresso({ atual: 0, total: movs.length });

      for (let i = 0; i < movs.length; i += BATCH_SIZE) {
        const batch = movs.slice(i, i + BATCH_SIZE);
        for (const mov of batch) {
          if (opcao === 'migrar') {
            const destino = outrosMembros.find(m => m.id === membroDestino);
            await base44.entities.Movimentacao.update(mov.id, {
              membro_id: membroDestino,
              membro_nome: destino?.nome || '',
            });
            // migrar não altera valores — sem delta no resumo
          } else {
            await base44.entities.Movimentacao.update(mov.id, { membro_id: '' });
            // desvincular não altera valores — sem delta no resumo
          }
          setProgresso(p => ({ ...p, atual: p.atual + 1 }));
        }
        if (i + BATCH_SIZE < movs.length) await sleep(BATCH_DELAY);
      }
    }

    await executeAction(
      async () => {
        // Busca novamente as movimentações para garantir o delta correto antes de excluir o membro
        // (caso "desvincular" tenha sido escolhido, as movs ainda existem mas não serão deletadas)
        await base44.entities.Membro.delete(membro.id);
      },
      { success: 'Membro excluído com sucesso', error: 'Erro ao excluir membro' }
    );
    setExecutando(false);
    onOpenChange(false);
    onDeleted();
  };

  const percentual = progresso.total > 0 ? Math.round((progresso.atual / progresso.total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={v => { if (!executando) onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Excluir membro
          </DialogTitle>
          <DialogDescription>
            Excluindo <strong>{membro?.nome}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {loadingCount ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Verificando movimentações...
            </div>
          ) : movCount === 0 ? (
            <p className="text-sm text-muted-foreground">Este membro não possui movimentações. A exclusão é segura.</p>
          ) : (
            <div className="space-y-4">
              <p className="text-sm">
                Este membro possui <strong>{movCount}</strong> movimentação(ões) vinculada(s). Escolha como proceder:
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOpcao('migrar')}
                  className={`p-3 rounded-lg border text-left text-sm transition-colors ${opcao === 'migrar' ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}
                >
                  <UserCheck className="w-4 h-4 mb-1 text-primary" />
                  <div className="font-medium">Migrar</div>
                  <div className="text-xs text-muted-foreground">Transferir para outro membro</div>
                </button>
                <button
                  type="button"
                  onClick={() => setOpcao('desvincular')}
                  className={`p-3 rounded-lg border text-left text-sm transition-colors ${opcao === 'desvincular' ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}
                >
                  <UserX className="w-4 h-4 mb-1 text-muted-foreground" />
                  <div className="font-medium">Desvincular</div>
                  <div className="text-xs text-muted-foreground">Manter nome, remover vínculo</div>
                </button>
              </div>

              {opcao === 'migrar' && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Membro de destino:</p>
                  <Select value={membroDestino} onValueChange={setMembroDestino}>
                    <SelectTrigger><SelectValue placeholder="Selecionar membro..." /></SelectTrigger>
                    <SelectContent>
                      {outrosMembros.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {executando && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processando {progresso.atual} de {progresso.total}...
                  </div>
                  <Progress value={percentual} className="h-2" />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={executando}>Cancelar</Button>
          <Button
            variant="destructive"
            onClick={handleExecutar}
            disabled={executando || loadingCount || (movCount > 0 && !opcao) || (opcao === 'migrar' && !membroDestino)}
          >
            {executando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {movCount === 0 ? 'Excluir' : 'Confirmar e Excluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}