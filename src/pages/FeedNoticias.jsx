import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import PostCard from '@/components/feed/PostCard';
import PostForm from '@/components/feed/PostForm';
import FiltroFeed from '@/components/feed/FiltroFeed';
import Onboarding from './Onboarding';
import AguardandoVinculacao from '@/components/AguardandoVinculacao';
import FooterIgreja from '@/components/FooterIgreja';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Newspaper } from 'lucide-react';
import { executeAction } from '@/lib/notify';

export default function FeedNoticias() {
  const { user, loading: loadingUser } = useCurrentUser();
  const igrejaId = user?.igreja_id;
  const isAdmin = user?.role === 'admin';

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  const loadPosts = async () => {
    if (!igrejaId) return;
    setLoading(true);
    const query = { igreja_id: igrejaId };
    if (!isAdmin) query.ativo = true;
    const data = await base44.entities.FeedNoticias.filter(query, '-data_publicacao', 100);
    setPosts(data);
    setLoading(false);
  };

  useEffect(() => { loadPosts(); }, [igrejaId, isAdmin]);

  const handleSaved = () => { setShowForm(false); setEditingPost(null); loadPosts(); };
  const handleEdit = (post) => { setEditingPost(post); setShowForm(true); };
  const handleDelete = async (id) => {
    await executeAction(
      () => base44.entities.FeedNoticias.delete(id),
      { success: 'Publicação excluída com sucesso', error: 'Erro ao excluir publicação' }
    );
    loadPosts();
  };

  if (loadingUser) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (user && !user.igreja_id) {
    if (user.role === 'admin') return <Onboarding user={user} onComplete={() => window.location.reload()} />;
    return <AguardandoVinculacao user={user} />;
  }

  // Ordenação: fixados primeiro, depois por data
  const filtered = posts
    .filter(p => !tipoFiltro || p.tipo === tipoFiltro)
    .sort((a, b) => {
      if (a.fixado && !b.fixado) return -1;
      if (!a.fixado && b.fixado) return 1;
      return (b.data_publicacao || b.created_date || '')
        .localeCompare(a.data_publicacao || a.created_date || '');
    });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Newspaper className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Feed de Notícias</h1>
              <p className="text-sm text-muted-foreground">Comunicados e avisos da igreja</p>
            </div>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={() => { setEditingPost(null); setShowForm(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Nova publicação
            </Button>
          )}
        </div>

        {/* Formulário (admin) */}
        {showForm && (
          <PostForm
            post={editingPost}
            igrejaId={igrejaId}
            onSaved={handleSaved}
            onCancel={() => { setShowForm(false); setEditingPost(null); }}
          />
        )}

        {/* Filtro por tipo */}
        <FiltroFeed value={tipoFiltro} onChange={setTipoFiltro} />

        {/* Posts */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border rounded-xl bg-card">
            <Newspaper className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma publicação encontrada</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(p => (
              <PostCard
                key={p.id}
                post={p}
                isAdmin={isAdmin}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <FooterIgreja />
    </div>
  );
}