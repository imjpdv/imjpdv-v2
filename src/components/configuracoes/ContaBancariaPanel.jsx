import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Loader2, Star, Building2, ImageIcon } from 'lucide-react';
import { executeAction, notifyError, notifySuccess } from '@/lib/notify';

const TIPO_PIX = ['cpf', 'cnpj', 'email', 'telefone', 'aleatoria'];
const EMPTY_FORM = {
  nome_banco: '', agencia: '', conta: '',
  chave_pix: '', tipo_chave_pix: '',
  is_principal: false, logo_url: ''
};

export default function ContaBancariaPanel({ igrejaId }) {
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef(null);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.ContaBancaria.filter({ igreja_id: igrejaId }, '-is_principal');
    setContas(data);
    setLoading(false);
  };

  useEffect(() => { if (igrejaId) load(); }, [igrejaId]);

  const openNew = () => { setForm(EMPTY_FORM); setEditingId(null); setDialogOpen(true); };
  const openEdit = (conta) => { setForm({ ...EMPTY_FORM, ...conta }); setEditingId(conta.id); setDialogOpen(true); };

  const ensureUmaPrincipal = async (contaId) => {
    const outras = contas.filter((c) => c.id !== contaId && c.is_principal);
    for (const c of outras) {
      await base44.entities.ContaBancaria.update(c.id, { is_principal: false });
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return notifyError('Selecione uma imagem válida.');
    setUploadingLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, logo_url: file_url }));
    setUploadingLogo(false);
  };

  const handleSave = async () => {
    if (!form.nome_banco.trim()) return notifyError('Informe o nome do banco.');
    setSaving(true);
    if (form.is_principal) await ensureUmaPrincipal(editingId || null);
    const payload = { ...form, nome_banco: form.nome_banco.trim(), igreja_id: igrejaId };
    await executeAction(
      () => editingId
        ? base44.entities.ContaBancaria.update(editingId, payload)
        : base44.entities.ContaBancaria.create(payload),
      {
        success: editingId ? 'Conta atualizada com sucesso' : 'Conta criada com sucesso',
        error: editingId ? 'Erro ao atualizar conta' : 'Erro ao criar conta',
      }
    );
    setSaving(false);
    setDialogOpen(false);
    await load();
  };

  const handleDelete = async (id) => {
    await executeAction(
      () => base44.entities.ContaBancaria.delete(id),
      { success: 'Conta excluída com sucesso', error: 'Erro ao excluir conta' }
    );
    await load();
  };

  const handleTogglePrincipal = async (conta) => {
    if (conta.is_principal) return;
    await ensureUmaPrincipal(conta.id);
    await executeAction(
      () => base44.entities.ContaBancaria.update(conta.id, { is_principal: true }),
      { success: `"${conta.nome_banco}" definida como conta principal`, error: 'Erro ao atualizar conta principal' }
    );
    await load();
  };

  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground py-4"><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{contas.length} conta(s)</p>
        <Button size="sm" variant="outline" onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" /> Nova conta
        </Button>
      </div>

      <ul className="divide-y border rounded-lg overflow-hidden">
        {contas.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
            Nenhuma conta bancária cadastrada.
          </li>
        )}
        {contas.map((conta) => (
          <li key={conta.id} className="px-4 py-3 flex items-center gap-3 bg-card hover:bg-muted/30">
            {/* Logo */}
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
              {conta.logo_url
                ? <img src={conta.logo_url} alt={conta.nome_banco} className="w-full h-full object-cover" />
                : <Building2 className="w-4 h-4 text-muted-foreground" />
              }
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{conta.nome_banco}</span>
                {conta.is_principal && (
                  <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs">
                    <Star className="w-3 h-3 mr-1" /> Principal
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {conta.agencia && `Ag: ${conta.agencia}`}
                {conta.agencia && conta.conta && ' · '}
                {conta.conta && `CC: ${conta.conta}`}
                {conta.chave_pix && ` · PIX: ${conta.chave_pix}`}
              </p>
            </div>

            {!conta.is_principal && (
              <Button size="sm" variant="ghost" className="text-xs" onClick={() => handleTogglePrincipal(conta)}>
                <Star className="w-3 h-3 mr-1" /> Principal
              </Button>
            )}
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(conta)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(conta.id)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </li>
        ))}
      </ul>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar conta' : 'Nova conta bancária'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[70vh] overflow-y-auto pr-1">

            {/* Logo upload */}
            <div>
              <Label className="text-xs mb-1 block">Logo do banco</Label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-muted border flex items-center justify-center overflow-hidden shrink-0">
                  {form.logo_url
                    ? <img src={form.logo_url} alt="logo" className="w-full h-full object-cover" />
                    : <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  }
                </div>
                <div className="flex-1">
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  <Button size="sm" variant="outline" type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingLogo}>
                    {uploadingLogo ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Enviando...</> : 'Escolher imagem'}
                  </Button>
                  {form.logo_url && (
                    <Button size="sm" variant="ghost" type="button" className="ml-2 text-destructive" onClick={() => setForm(f => ({ ...f, logo_url: '' }))}>
                      Remover
                    </Button>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-1">PNG, JPG ou SVG</p>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1 block">Banco *</Label>
              <Input placeholder="Ex: Banco do Brasil, Bradesco..." value={form.nome_banco} onChange={(e) => setForm({ ...form, nome_banco: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Agência</Label>
                <Input placeholder="0000" value={form.agencia} onChange={(e) => setForm({ ...form, agencia: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Conta</Label>
                <Input placeholder="00000-0" value={form.conta} onChange={(e) => setForm({ ...form, conta: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Tipo de chave PIX</Label>
                <Select value={form.tipo_chave_pix} onValueChange={(v) => setForm({ ...form, tipo_chave_pix: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {TIPO_PIX.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Chave PIX</Label>
                <Input placeholder="Chave PIX" value={form.chave_pix} onChange={(e) => setForm({ ...form, chave_pix: e.target.value })} />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Switch checked={form.is_principal} onCheckedChange={(v) => setForm({ ...form, is_principal: v })} id="principal" />
              <Label htmlFor="principal" className="text-sm cursor-pointer">Conta principal</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || uploadingLogo}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}