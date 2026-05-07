import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, ImagePlus, X } from 'lucide-react';
import { executeAction, notifyError } from '@/lib/notify';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const EMPTY = {
  titulo: '', conteudo_html: '', imagem_url: '', tipo: 'aviso',
  data_publicacao: '', fixado: false, ativo: true,
};

const QUILL_MODULES = {
  toolbar: [
    [{ header: [2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'image'],
    ['clean'],
  ],
};

export default function PostForm({ post, igrejaId, onSaved, onCancel }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  useEffect(() => {
    if (post) {
      setForm({
        titulo: post.titulo || '',
        conteudo_html: post.conteudo_html || '',
        imagem_url: post.imagem_url || '',
        tipo: post.tipo || 'aviso',
        data_publicacao: post.data_publicacao ? post.data_publicacao.split('T')[0] : '',
        fixado: post.fixado ?? false,
        ativo: post.ativo ?? true,
      });
    } else {
      setForm({ ...EMPTY, data_publicacao: new Date().toISOString().split('T')[0] });
    }
  }, [post]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('imagem_url', file_url);
    setUploadingImg(false);
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) return notifyError('Título obrigatório.');
    if (!form.conteudo_html.trim() || form.conteudo_html === '<p><br></p>') return notifyError('Conteúdo obrigatório.');
    setSaving(true);
    const payload = {
      ...form,
      data_publicacao: form.data_publicacao ? new Date(form.data_publicacao).toISOString() : new Date().toISOString(),
      igreja_id: igrejaId,
    };
    await executeAction(
      () => post
        ? base44.entities.FeedNoticias.update(post.id, payload)
        : base44.entities.FeedNoticias.create(payload),
      {
        success: post ? 'Publicação atualizada com sucesso' : 'Publicação criada com sucesso',
        error: post ? 'Erro ao atualizar publicação' : 'Erro ao criar publicação',
      }
    );
    setSaving(false);
    onSaved();
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{post ? 'Editar publicação' : 'Nova publicação'}</CardTitle>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onCancel}><X className="w-4 h-4" /></Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Título */}
        <div className="space-y-1.5">
          <Label>Título *</Label>
          <Input placeholder="Título da publicação" value={form.titulo} onChange={e => set('titulo', e.target.value)} />
        </div>

        {/* Conteúdo rich text */}
        <div className="space-y-1.5">
          <Label>Conteúdo *</Label>
          <div className="rounded-md overflow-hidden border">
            <ReactQuill
              theme="snow"
              value={form.conteudo_html}
              onChange={v => set('conteudo_html', v)}
              modules={QUILL_MODULES}
              placeholder="Escreva o conteúdo da publicação..."
              style={{ minHeight: '160px' }}
            />
          </div>
        </div>

        {/* Imagem */}
        <div className="space-y-1.5">
          <Label>Imagem</Label>
          {form.imagem_url ? (
            <div className="relative">
              <img src={form.imagem_url} alt="Preview" className="w-full max-h-48 object-cover rounded-lg border" />
              <Button
                size="icon" variant="destructive"
                className="absolute top-2 right-2 h-7 w-7"
                onClick={() => set('imagem_url', '')}
              ><X className="w-3.5 h-3.5" /></Button>
            </div>
          ) : (
            <label className="flex items-center gap-2 cursor-pointer border border-dashed rounded-lg p-4 hover:bg-muted/40 transition-colors">
              {uploadingImg
                ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                : <ImagePlus className="w-4 h-4 text-muted-foreground" />}
              <span className="text-sm text-muted-foreground">
                {uploadingImg ? 'Enviando imagem...' : 'Clique para fazer upload de imagem'}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImage} disabled={uploadingImg} />
            </label>
          )}
        </div>

        {/* Tipo + Data */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={v => set('tipo', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="aviso">Aviso</SelectItem>
                <SelectItem value="evento">Evento</SelectItem>
                <SelectItem value="noticia">Notícia</SelectItem>
                <SelectItem value="devocional">Devocional</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Data de publicação</Label>
            <Input type="date" value={form.data_publicacao} onChange={e => set('data_publicacao', e.target.value)} />
          </div>
        </div>

        {/* Fixado + Ativo */}
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <Switch checked={form.fixado} onCheckedChange={v => set('fixado', v)} id="fixado" />
            <Label htmlFor="fixado" className="cursor-pointer">Fixar no topo</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.ativo} onCheckedChange={v => set('ativo', v)} id="ativo" />
            <Label htmlFor="ativo" className="cursor-pointer">Publicação ativa</Label>
          </div>
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {post ? 'Salvar alterações' : 'Publicar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}