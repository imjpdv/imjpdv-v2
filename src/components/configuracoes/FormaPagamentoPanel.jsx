import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Trash2, Loader2, Check, X } from 'lucide-react';
import { executeAction, notifyError } from '@/lib/notify';
import { countMovimentacoesByField } from '@/lib/migrationUtils';
import MigracaoDialog from './MigracaoDialog';

export default function FormaPagamentoPanel({ igrejaId }) {
  const [formas, setFormas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editNome, setEditNome] = useState('');
  const [newNome, setNewNome] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [migracaoState, setMigracaoState] = useState({ open: false, item: null, count: 0 });

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.FormaPagamentoConfig.filter({ igreja_id: igrejaId }, 'nome');
    setFormas(data);
    setLoading(false);
  };

  useEffect(() => { if (igrejaId) load(); }, [igrejaId]);

  const handleCreate = async () => {
    if (!newNome.trim()) return notifyError('Informe o nome da forma de pagamento.');
    setSaving(true);
    await executeAction(
      () => base44.entities.FormaPagamentoConfig.create({ nome: newNome.trim(), igreja_id: igrejaId }),
      { success: 'Forma de pagamento criada com sucesso', error: 'Erro ao criar forma de pagamento' }
    );
    setNewNome('');
    setShowNew(false);
    await load();
    setSaving(false);
  };

  const handleSaveEdit = async () => {
    if (!editNome.trim()) return notifyError('Informe o nome.');
    setSaving(true);
    await executeAction(
      () => base44.entities.FormaPagamentoConfig.update(editingId, { nome: editNome.trim() }),
      { success: 'Forma de pagamento atualizada com sucesso', error: 'Erro ao atualizar forma de pagamento' }
    );
    setEditingId(null);
    await load();
    setSaving(false);
  };

  const handleDelete = async (forma) => {
    const count = await countMovimentacoesByField('forma_pagamento_id', forma.id, igrejaId);
    if (count > 0) {
      setMigracaoState({ open: true, item: forma, count });
    } else {
      await executeAction(
        () => base44.entities.FormaPagamentoConfig.delete(forma.id),
        { success: 'Forma de pagamento excluída com sucesso', error: 'Erro ao excluir forma de pagamento' }
      );
      await load();
    }
  };

  const handlePostMigracao = async () => {
    await executeAction(
      () => base44.entities.FormaPagamentoConfig.delete(migracaoState.item.id),
      { success: 'Forma migrada e excluída com sucesso', error: 'Erro ao excluir forma de pagamento' }
    );
    setMigracaoState({ open: false, item: null, count: 0 });
    await load();
  };

  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground py-4"><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{formas.length} forma(s)</p>
        <Button size="sm" variant="outline" onClick={() => setShowNew(!showNew)}>
          <Plus className="w-4 h-4 mr-1" /> Nova
        </Button>
      </div>

      {showNew && (
        <div className="flex gap-2 items-center p-3 border rounded-lg bg-muted/30">
          <Input
            placeholder="Ex: Dízimo, Oferta, PIX..."
            value={newNome}
            onChange={(e) => setNewNome(e.target.value)}
            className="h-8 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <Button size="sm" onClick={handleCreate} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowNew(false)}><X className="w-4 h-4" /></Button>
        </div>
      )}

      <ul className="divide-y border rounded-lg overflow-hidden">
        {formas.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
            Nenhuma forma de pagamento. Crie a primeira acima.
          </li>
        )}
        {formas.map((forma) => (
          <li key={forma.id} className="px-4 py-3 flex items-center gap-3 bg-card hover:bg-muted/30">
            {editingId === forma.id ? (
              <>
                <Input
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  className="h-8 text-sm flex-1"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                />
                <Button size="icon" className="h-8 w-8" onClick={handleSaveEdit} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm font-medium">{forma.nome}</span>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingId(forma.id); setEditNome(forma.nome); }}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(forma)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>

      <MigracaoDialog
        open={migracaoState.open}
        onOpenChange={(v) => setMigracaoState((s) => ({ ...s, open: v }))}
        field="forma_pagamento_id"
        itemExcluindo={migracaoState.item}
        opcoes={formas}
        igrejaId={igrejaId}
        onDelete={handlePostMigracao}
        count={migracaoState.count}
      />
    </div>
  );
}