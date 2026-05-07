import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus, Loader2, Check, X } from 'lucide-react';
import { executeAction, notifyError } from '@/lib/notify';
import { countMovimentacoesByField } from '@/lib/migrationUtils';
import MigracaoDialog from './MigracaoDialog';

const TIPO_LABELS = { entrada: 'Entrada', saida: 'Saída', ambos: 'Ambos' };
const TIPO_COLORS = {
  entrada: 'bg-green-100 text-green-700',
  saida: 'bg-red-100 text-red-700',
  ambos: 'bg-blue-100 text-blue-700',
};

export default function CategoriaConfigPanel({ igrejaId }) {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ nome: '', tipo: 'entrada' });
  const [newForm, setNewForm] = useState({ nome: '', tipo: 'entrada' });
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  // migração
  const [migracaoState, setMigracaoState] = useState({ open: false, item: null, count: 0 });

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.CategoriaConfig.filter({ igreja_id: igrejaId }, 'nome');
    setCategorias(data);
    setLoading(false);
  };

  useEffect(() => { if (igrejaId) load(); }, [igrejaId]);

  const handleCreate = async () => {
    if (!newForm.nome.trim()) return notifyError('Informe o nome da categoria.');
    setSaving(true);
    await executeAction(
      () => base44.entities.CategoriaConfig.create({ ...newForm, nome: newForm.nome.trim(), igreja_id: igrejaId }),
      { success: 'Categoria criada com sucesso', error: 'Erro ao criar categoria' }
    );
    setNewForm({ nome: '', tipo: 'entrada' });
    setShowNew(false);
    await load();
    setSaving(false);
  };

  const handleEdit = (cat) => {
    setEditingId(cat.id);
    setEditForm({ nome: cat.nome, tipo: cat.tipo });
  };

  const handleSaveEdit = async () => {
    if (!editForm.nome.trim()) return notifyError('Informe o nome.');
    setSaving(true);
    await executeAction(
      () => base44.entities.CategoriaConfig.update(editingId, { nome: editForm.nome.trim(), tipo: editForm.tipo }),
      { success: 'Categoria atualizada com sucesso', error: 'Erro ao atualizar categoria' }
    );
    setEditingId(null);
    await load();
    setSaving(false);
  };

  const handleDelete = async (cat) => {
    const count = await countMovimentacoesByField('categoria_id', cat.id, igrejaId);
    if (count > 0) {
      setMigracaoState({ open: true, item: cat, count });
    } else {
      await executeAction(
        () => base44.entities.CategoriaConfig.delete(cat.id),
        { success: 'Categoria excluída com sucesso', error: 'Erro ao excluir categoria' }
      );
      await load();
    }
  };

  const handlePostMigracao = async () => {
    await executeAction(
      () => base44.entities.CategoriaConfig.delete(migracaoState.item.id),
      { success: 'Categoria migrada e excluída com sucesso', error: 'Erro ao excluir categoria' }
    );
    setMigracaoState({ open: false, item: null, count: 0 });
    await load();
  };

  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground py-4"><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{categorias.length} categoria(s)</p>
        <Button size="sm" variant="outline" onClick={() => setShowNew(!showNew)}>
          <Plus className="w-4 h-4 mr-1" /> Nova
        </Button>
      </div>

      {showNew && (
        <div className="flex gap-2 items-center p-3 border rounded-lg bg-muted/30">
          <Input
            placeholder="Nome da categoria"
            value={newForm.nome}
            onChange={(e) => setNewForm({ ...newForm, nome: e.target.value })}
            className="h-8 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <Select value={newForm.tipo} onValueChange={(v) => setNewForm({ ...newForm, tipo: v })}>
            <SelectTrigger className="h-8 w-32 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="entrada">Entrada</SelectItem>
              <SelectItem value="saida">Saída</SelectItem>
              <SelectItem value="ambos">Ambos</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleCreate} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowNew(false)}><X className="w-4 h-4" /></Button>
        </div>
      )}

      <ul className="divide-y border rounded-lg overflow-hidden">
        {categorias.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
            Nenhuma categoria. Crie a primeira acima.
          </li>
        )}
        {categorias.map((cat) => (
          <li key={cat.id} className="px-4 py-3 flex items-center gap-3 bg-card hover:bg-muted/30">
            {editingId === cat.id ? (
              <>
                <Input
                  value={editForm.nome}
                  onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                  className="h-8 text-sm flex-1"
                  autoFocus
                />
                <Select value={editForm.tipo} onValueChange={(v) => setEditForm({ ...editForm, tipo: v })}>
                  <SelectTrigger className="h-8 w-28 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                    <SelectItem value="ambos">Ambos</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="icon" className="h-8 w-8" onClick={handleSaveEdit} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm font-medium">{cat.nome}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_COLORS[cat.tipo]}`}>
                  {TIPO_LABELS[cat.tipo]}
                </span>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(cat)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(cat)}>
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
        field="categoria_id"
        itemExcluindo={migracaoState.item}
        opcoes={categorias}
        igrejaId={igrejaId}
        onDelete={handlePostMigracao}
        count={migracaoState.count}
      />
    </div>
  );
}