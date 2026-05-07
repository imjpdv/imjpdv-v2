import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { executeAction, notifyError } from '@/lib/notify';

const EMPTY = { nome: '', email: '', telefone: '', perfil: 'membro' };

export default function MembroForm({ open, onOpenChange, editData, igrejaId, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(editData ? { nome: editData.nome || '', email: editData.email || '', telefone: editData.telefone || '', perfil: editData.perfil || 'membro' } : EMPTY);
  }, [open, editData]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.nome.trim()) return notifyError('Informe o nome completo.');
    if (!form.email.trim()) return notifyError('Informe o email.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return notifyError('Email inválido.');

    setSaving(true);

    // Verificar duplicidade de email na mesma igreja (exceto o próprio em edição)
    const existing = await base44.entities.Membro.filter({ email: form.email.trim(), igreja_id: igrejaId });
    const duplicate = existing.find(m => !editData || m.id !== editData.id);
    if (duplicate) {
      notifyError('Já existe um membro com este email nesta igreja.');
      setSaving(false);
      return;
    }

    const payload = { nome: form.nome.trim(), email: form.email.trim(), telefone: form.telefone.trim(), perfil: form.perfil, igreja_id: igrejaId };

    if (editData?.id) {
      await executeAction(
        async () => {
          await base44.entities.Membro.update(editData.id, payload);
          const movs = await base44.entities.Movimentacao.filter({ membro_id: editData.id, igreja_id: igrejaId });
          for (const m of movs) {
            await base44.entities.Movimentacao.update(m.id, { membro_nome: form.nome.trim() });
          }
        },
        { success: 'Membro atualizado com sucesso', error: 'Erro ao atualizar membro' }
      );
    } else {
      await executeAction(
        async () => {
          await base44.entities.Membro.create(payload);
          await base44.users.inviteUser(form.email.trim(), form.perfil === 'admin' ? 'admin' : 'user');
        },
        { success: 'Membro criado e convite enviado', error: 'Erro ao criar membro' }
      );
    }

    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editData ? 'Editar Membro' : 'Novo Membro'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs mb-1 block">Nome completo *</Label>
            <Input placeholder="Nome do membro" value={form.nome} onChange={e => set('nome', e.target.value)} autoFocus />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Email *</Label>
            <Input type="email" placeholder="email@exemplo.com" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Telefone</Label>
            <Input placeholder="(00) 00000-0000" value={form.telefone} onChange={e => set('telefone', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Perfil</Label>
            <Select value={form.perfil} onValueChange={v => set('perfil', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar perfil..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="membro">Membro</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
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