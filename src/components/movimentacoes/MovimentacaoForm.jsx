import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { executeAction, notifyError } from '@/lib/notify';

const EMPTY = {
  tipo: 'entrada',
  data: new Date().toISOString().split('T')[0],
  categoria_id: '',
  forma_pagamento_id: '',
  valor: '',
  membro_id: null,
  descricao: '',
  observacoes: '',
};

export default function MovimentacaoForm({ open, onOpenChange, editData, igrejaId, categorias, formas, membros, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(editData ? { ...EMPTY, ...editData, valor: String(editData.valor || '') } : EMPTY);
  }, [open, editData]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleMembroChange = (id) => {
    set('membro_id', id === 'nenhum' ? null : id);
  };

  const categoriasFiltered = categorias.filter(c =>
    c.tipo === 'ambos' || c.tipo === form.tipo
  );

  const handleSave = async () => {
    if (!form.tipo) return notifyError('Selecione o tipo.');
    if (!form.data) return notifyError('Informe a data.');
    if (!form.categoria_id) return notifyError('Selecione a categoria.');
    if (!form.forma_pagamento_id) return notifyError('Selecione a forma de pagamento.');
    if (!form.valor || isNaN(parseFloat(form.valor))) return notifyError('Informe um valor válido.');

    setSaving(true);
    const payload = {
      tipo: form.tipo,
      data: form.data,
      categoria_id: form.categoria_id,
      forma_pagamento_id: form.forma_pagamento_id,
      valor: parseFloat(form.valor),
      membro_id: form.membro_id || null,
      descricao: form.descricao,
      observacoes: form.observacoes,
      igreja_id: igrejaId,
    };

    await executeAction(
      async () => {
        if (editData?.id) {
          await base44.entities.Movimentacao.update(editData.id, payload);
        } else {
          await base44.entities.Movimentacao.create(payload);
        }
      },
      {
        success: editData?.id ? 'Lançamento atualizado com sucesso' : 'Lançamento salvo com sucesso',
        error: editData?.id ? 'Erro ao atualizar lançamento' : 'Erro ao salvar lançamento',
      }
    );
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData ? 'Editar Movimentação' : 'Nova Movimentação'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tipo */}
          <div className="grid grid-cols-2 gap-2">
            {['entrada', 'saida'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { set('tipo', t); set('categoria_id', ''); }}
                className={`py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  form.tipo === t
                    ? t === 'entrada' ? 'bg-green-600 text-white border-green-600' : 'bg-red-500 text-white border-red-500'
                    : 'bg-background hover:bg-muted'
                }`}
              >
                {t === 'entrada' ? '↑ Entrada' : '↓ Saída'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1 block">Data *</Label>
              <Input type="date" value={form.data} onChange={(e) => set('data', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Valor (R$) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={form.valor}
                onChange={(e) => set('valor', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs mb-1 block">Categoria *</Label>
            <Select value={form.categoria_id} onValueChange={(v) => set('categoria_id', v)}>
              <SelectTrigger><SelectValue placeholder="Selecionar categoria..." /></SelectTrigger>
              <SelectContent>
                {categoriasFiltered.length === 0
                  ? <SelectItem value="_none" disabled>Nenhuma categoria disponível</SelectItem>
                  : categoriasFiltered.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)
                }
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs mb-1 block">Forma de pagamento *</Label>
            <Select value={form.forma_pagamento_id} onValueChange={(v) => set('forma_pagamento_id', v)}>
              <SelectTrigger><SelectValue placeholder="Selecionar forma..." /></SelectTrigger>
              <SelectContent>
                {formas.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs mb-1 block">Membro (opcional)</Label>
            <Select value={form.membro_id || 'nenhum'} onValueChange={handleMembroChange}>
              <SelectTrigger><SelectValue placeholder="Nenhum membro" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhum">Nenhum</SelectItem>
                {membros.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs mb-1 block">Descrição</Label>
            <Input placeholder="Descrição breve..." value={form.descricao} onChange={(e) => set('descricao', e.target.value)} />
          </div>

          <div>
            <Label className="text-xs mb-1 block">Observações</Label>
            <Textarea placeholder="Observações adicionais..." value={form.observacoes} onChange={(e) => set('observacoes', e.target.value)} rows={2} className="resize-none" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}