import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pin, Pencil, Trash2, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ImageLightbox from './ImageLightbox';

const TIPO_CONFIG = {
  aviso:      { label: 'Aviso',      class: 'bg-blue-100 text-blue-700 border-blue-200' },
  evento:     { label: 'Evento',     class: 'bg-purple-100 text-purple-700 border-purple-200' },
  noticia:    { label: 'Notícia',    class: 'bg-gray-100 text-gray-700 border-gray-200' },
  devocional: { label: 'Devocional', class: 'bg-amber-100 text-amber-700 border-amber-200' },
};

function fmtData(d) {
  if (!d) return '';
  try { return format(new Date(d), "d 'de' MMMM 'de' yyyy", { locale: ptBR }); } catch { return ''; }
}

export default function PostCard({ post, isAdmin, onEdit, onDelete }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const tipo = TIPO_CONFIG[post.tipo] || TIPO_CONFIG.noticia;
  const isUrgente = post.tipo === 'aviso' && post.fixado;

  return (
    <Card className={`overflow-hidden transition-all ${isUrgente ? 'border-red-300 shadow-md shadow-red-100' : ''}`}>
      {/* Imagem */}
      {post.imagem_url && (
        <>
          <div
            className="w-full flex items-center justify-center bg-muted/50 cursor-pointer group"
            style={{ maxHeight: '400px' }}
            onClick={() => setLightboxOpen(true)}
          >
            <img
              src={post.imagem_url}
              alt={post.titulo}
              className="transition-transform duration-200 group-hover:scale-[1.02]"
              style={{ width: '100%', height: 'auto', maxHeight: '400px', display: 'block', objectFit: 'contain' }}
            />
          </div>
          <ImageLightbox
            src={post.imagem_url}
            alt={post.titulo}
            open={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
          />
        </>
      )}

      <CardContent className="pt-4 pb-5 space-y-3">
        {/* Badges topo */}
        <div className="flex flex-wrap items-center gap-2">
          {post.fixado && (
            <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
              <Pin className="w-3 h-3" /> Fixado
            </span>
          )}
          {post.tipo && (
            <Badge className={`text-xs ${tipo.class}`}>{tipo.label}</Badge>
          )}
          {isAdmin && !post.ativo && (
            <Badge variant="outline" className="text-xs text-muted-foreground flex items-center gap-1">
              <EyeOff className="w-3 h-3" /> Inativo
            </Badge>
          )}
        </div>

        {/* Título */}
        <h2 className="text-lg font-bold leading-snug">{post.titulo}</h2>

        {/* Conteúdo rich text */}
        <div
          className="prose prose-sm max-w-none text-foreground leading-relaxed"
          dangerouslySetInnerHTML={{ __html: post.conteudo_html }}
        />

        {/* Rodapé */}
        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            {fmtData(post.data_publicacao || post.created_date)}
            {post.created_by && ` · ${post.created_by.split('@')[0]}`}
          </p>

          {isAdmin && (
            <div className="flex gap-1">
              {!confirmDel ? (
                <>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => onEdit(post)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setConfirmDel(true)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Confirmar exclusão?</span>
                  <Button size="sm" variant="destructive" className="h-6 text-xs" onClick={() => onDelete(post.id)}>Sim</Button>
                  <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setConfirmDel(false)}>Não</Button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}