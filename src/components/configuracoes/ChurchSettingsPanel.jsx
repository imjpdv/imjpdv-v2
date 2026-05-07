import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, Upload, ImagePlus, X } from 'lucide-react';
import { executeAction, notifySuccess } from '@/lib/notify';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const QUILL_MODULES = {
  toolbar: [
    [{ header: [2, 3, false] }],
    [{ size: ['small', false, 'large'] }],
    ['bold', 'italic', 'underline'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
  ],
};

function ImageUploadField({ label, value, onChange, hint }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onChange(file_url);
    setUploading(false);
  };

  return (
    <div>
      <Label className="text-xs mb-1 block">{label}</Label>
      {value ? (
        <div className="relative">
          <img src={value} alt="Preview" className="w-full max-h-40 object-cover rounded-lg border" />
          <Button size="icon" variant="destructive" className="absolute top-2 right-2 h-7 w-7" onClick={() => onChange('')}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : (
        <label className="flex items-center gap-2 cursor-pointer border border-dashed rounded-lg p-4 hover:bg-muted/40 transition-colors">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <ImagePlus className="w-4 h-4 text-muted-foreground" />}
          <span className="text-sm text-muted-foreground">{uploading ? 'Enviando...' : 'Clique para fazer upload de imagem'}</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      )}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function RichTextField({ label, value, onChange, placeholder, hint }) {
  return (
    <div>
      <Label className="text-xs mb-1 block">{label}</Label>
      <div className="rounded-md overflow-hidden border">
        <ReactQuill
          theme="snow"
          value={value}
          onChange={onChange}
          modules={QUILL_MODULES}
          placeholder={placeholder}
          style={{ minHeight: '100px' }}
        />
      </div>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

const EMPTY_FORM = {
  church_name: '', address: '', pastors: '', logo_url: '',
  texto_institucional: '', link_pagamento_online: '', imagem_institucional: '',
  texto_pix: '', imagem_pix: '',
  texto_link_pagamento: '', imagem_link_pagamento: '',
  texto_bancario: '', imagem_bancario: '',
  texto_cartao: '', imagem_cartao: '',
  mp_public_key: '',
};

export default function ChurchSettingsPanel({ igrejaId }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingImgInst, setUploadingImgInst] = useState(false);

  useEffect(() => {
    if (!igrejaId) return;
    (async () => {
      setLoading(true);
      const data = await base44.entities.ChurchSettings.filter({ igreja_id: igrejaId });
      if (data.length > 0) {
        const rec = data[0];
        setRecordId(rec.id);
        setForm({
          church_name: rec.church_name || '',
          address: rec.address || '',
          pastors: rec.pastors || '',
          logo_url: rec.logo_url || '',
          texto_institucional: rec.texto_institucional || '',
          link_pagamento_online: rec.link_pagamento_online || '',
          imagem_institucional: rec.imagem_institucional || '',
          texto_pix: rec.texto_pix || '',
          imagem_pix: rec.imagem_pix || '',
          texto_link_pagamento: rec.texto_link_pagamento || '',
          imagem_link_pagamento: rec.imagem_link_pagamento || '',
          texto_bancario: rec.texto_bancario || '',
          imagem_bancario: rec.imagem_bancario || '',
          texto_cartao: rec.texto_cartao || '',
          imagem_cartao: rec.imagem_cartao || '',
          mp_public_key: rec.mp_public_key || '',
        });
      }
      setLoading(false);
    })();
  }, [igrejaId]);

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    await executeAction(
      async () => {
        if (recordId) {
          await base44.entities.ChurchSettings.update(recordId, { ...form, igreja_id: igrejaId });
        } else {
          const created = await base44.entities.ChurchSettings.create({ ...form, igreja_id: igrejaId });
          setRecordId(created.id);
        }
      },
      { success: 'Configurações salvas com sucesso', error: 'Erro ao salvar configurações' }
    );
    setSaving(false);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, logo_url: file_url }));
    setUploadingLogo(false);
    notifySuccess('Logo enviado. Salve para confirmar.');
  };

  const handleImageInstitucional = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImgInst(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, imagem_institucional: file_url }));
    setUploadingImgInst(false);
  };

  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground py-4"><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</div>;

  return (
    <div className="space-y-5">
      {/* Dados básicos */}
      <div>
        <Label className="text-xs mb-1 block">Nome da igreja</Label>
        <Input value={form.church_name} onChange={(e) => setForm({ ...form, church_name: e.target.value })} placeholder="Ex: Igreja Batista Central" />
      </div>
      <div>
        <Label className="text-xs mb-1 block">Endereço</Label>
        <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Rua, número, bairro, cidade..." />
      </div>
      <div>
        <Label className="text-xs mb-1 block">Pastores</Label>
        <Textarea value={form.pastors} onChange={(e) => setForm({ ...form, pastors: e.target.value })} placeholder="Nome dos pastores..." rows={2} className="resize-none" />
      </div>
      <div>
        <Label className="text-xs mb-1 block">Link de pagamento online <span className="text-muted-foreground font-normal">(Mercado Pago, etc.)</span></Label>
        <Input type="url" value={form.link_pagamento_online} onChange={(e) => setForm({ ...form, link_pagamento_online: e.target.value })} placeholder="https://mpago.la/..." />
      </div>

      {/* Texto Institucional */}
      <RichTextField
        label="Texto Institucional"
        value={form.texto_institucional}
        onChange={set('texto_institucional')}
        placeholder='Ex: "E Jesus lhes disse: Eu sou o pão da vida..." - João 6:35'
        hint="Exibido na página inicial do membro."
      />

      {/* Imagem Institucional */}
      <div>
        <Label className="text-xs mb-1 block">Imagem Institucional</Label>
        {form.imagem_institucional ? (
          <div className="relative">
            <img src={form.imagem_institucional} alt="Preview" className="w-full max-h-48 object-cover rounded-lg border" />
            <Button size="icon" variant="destructive" className="absolute top-2 right-2 h-7 w-7" onClick={() => setForm(f => ({ ...f, imagem_institucional: '' }))}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <label className="flex items-center gap-2 cursor-pointer border border-dashed rounded-lg p-4 hover:bg-muted/40 transition-colors">
            {uploadingImgInst ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <ImagePlus className="w-4 h-4 text-muted-foreground" />}
            <span className="text-sm text-muted-foreground">{uploadingImgInst ? 'Enviando...' : 'Clique para fazer upload'}</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageInstitucional} disabled={uploadingImgInst} />
          </label>
        )}
      </div>

      {/* Seção: Info. Bancárias */}
      <div className="pt-3 border-t border-border/40">
        <p className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider mb-3">Página Info. Bancárias</p>
        <div className="space-y-3">
          <ImageUploadField label="Imagem do topo" value={form.imagem_bancario} onChange={set('imagem_bancario')} hint="Exibida no topo da página Info. Bancárias." />
          <RichTextField label="Texto" value={form.texto_bancario} onChange={set('texto_bancario')} placeholder="Instruções ou mensagem para a página de Informações Bancárias..." hint="Exibido abaixo da imagem." />
        </div>
      </div>

      {/* Seção: Pix */}
      <div className="pt-3 border-t border-border/40">
        <p className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider mb-3">Página Pix</p>
        <div className="space-y-3">
          <ImageUploadField label="Imagem do topo" value={form.imagem_pix} onChange={set('imagem_pix')} hint="Exibida no topo do formulário de Pix." />
          <RichTextField label="Texto" value={form.texto_pix} onChange={set('texto_pix')} placeholder="Instruções para o membro sobre como realizar o Pix..." hint="Exibido abaixo da imagem." />
        </div>
      </div>

      {/* Seção: Cartão de Crédito */}
      <div className="pt-3 border-t border-border/40">
        <p className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider mb-3">Página Cartão de Crédito</p>
        <div className="space-y-3">
          <div>
            <Label className="text-xs mb-1 block">Public Key do Mercado Pago</Label>
            <Input
              value={form.mp_public_key}
              onChange={(e) => setForm(f => ({ ...f, mp_public_key: e.target.value }))}
              placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Encontre em: Mercado Pago Developers → Credenciais → Public Key. Use a chave de <strong>teste</strong> para homologação e <strong>produção</strong> para pagamentos reais.
            </p>
          </div>
          <ImageUploadField label="Imagem do topo" value={form.imagem_cartao} onChange={set('imagem_cartao')} hint="Exibida no topo da página de Cartão de Crédito." />
          <RichTextField label="Texto" value={form.texto_cartao} onChange={set('texto_cartao')} placeholder="Instruções sobre o pagamento com cartão..." hint="Exibido abaixo da imagem." />
        </div>
      </div>

      {/* Seção: Link de Pagamento */}
      <div className="pt-3 border-t border-border/40">
        <p className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider mb-3">Página Link de Pagamento</p>
        <div className="space-y-3">
          <ImageUploadField label="Imagem do topo" value={form.imagem_link_pagamento} onChange={set('imagem_link_pagamento')} hint="Exibida no topo da página de Link de Pagamento." />
          <RichTextField label="Texto" value={form.texto_link_pagamento} onChange={set('texto_link_pagamento')} placeholder="Descrição sobre as formas de pagamento disponíveis..." hint="Exibido abaixo da imagem." />
        </div>
      </div>

      {/* Logo */}
      <div className="pt-3 border-t border-border/40">
        <Label className="text-xs mb-1 block">Logo da igreja</Label>
        <div className="flex items-center gap-3">
          {form.logo_url && <img src={form.logo_url} alt="Logo" className="h-12 w-12 rounded object-cover border" />}
          <label className="cursor-pointer">
            <div className="flex items-center gap-2 border rounded px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
              {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploadingLogo ? 'Enviando...' : 'Enviar logo'}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </label>
          {form.logo_url && (
            <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => setForm(f => ({ ...f, logo_url: '' }))}>Remover</Button>
          )}
        </div>
      </div>

      <div className="pt-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar configurações
        </Button>
      </div>
    </div>
  );
}