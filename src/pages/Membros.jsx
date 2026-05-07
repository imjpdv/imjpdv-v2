import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import MembroForm from '@/components/membros/MembroForm';
import ExcluirMembroDialog from '@/components/membros/ExcluirMembroDialog';
import Onboarding from './Onboarding';
import AguardandoVinculacao from '@/components/AguardandoVinculacao';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Search, Pencil, Trash2, Users, ShieldAlert } from 'lucide-react';

export default function Membros() {
  const { user, loading: loadingUser } = useCurrentUser();
  const [membros, setMembros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [excluirTarget, setExcluirTarget] = useState(null);

  const igrejaId = user?.igreja_id;
  const isAdmin = user?.role === 'admin';

  const load = async () => {
    if (!igrejaId) return;
    setLoading(true);
    const data = await base44.entities.Membro.filter({ igreja_id: igrejaId }, 'nome');
    setMembros(data);
    setLoading(false);
  };

  useEffect(() => { if (igrejaId) load(); }, [igrejaId]);

  const filtered = membros.filter(m => {
    if (!search) return true;
    const t = search.toLowerCase();
    return m.nome?.toLowerCase().includes(t) || m.email?.toLowerCase().includes(t) || m.telefone?.toLowerCase().includes(t);
  });

  if (loadingUser) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (user && !user.igreja_id) {
    if (user.role === 'admin') return <Onboarding user={user} onComplete={() => window.location.reload()} />;
    return <AguardandoVinculacao user={user} />;
  }

  if (!isAdmin) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-center p-8">
      <ShieldAlert className="w-10 h-10 text-destructive" />
      <h2 className="text-lg font-semibold">Acesso restrito</h2>
      <p className="text-sm text-muted-foreground max-w-sm">Apenas administradores podem gerenciar membros.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Membros</h1>
            <p className="text-sm font-body text-muted-foreground mt-0.5">
              {membros.length} membro(s) cadastrado(s)
            </p>
          </div>
          <button onClick={() => { setEditData(null); setFormOpen(true); }} className="btn-sacred px-5 py-2.5 text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> Novo Membro
          </button>
        </div>

        {/* Busca */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar membros..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-input border-0 focus-visible:ring-1 focus-visible:ring-primary focus-visible:bg-card"
          />
        </div>

        {/* Ledger de membros — sem bordas */}
        <div className="bg-card rounded-2xl shadow-sacred overflow-hidden">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="bg-muted/60">
                <th className="px-5 py-3 text-left text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-widest">Nome</th>
                <th className="px-5 py-3 text-left text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-widest">Email</th>
                <th className="px-5 py-3 text-left text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-widest">Telefone</th>
                <th className="px-5 py-3 text-right text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-16">
                  <Users className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {search ? 'Nenhum membro encontrado.' : 'Nenhum membro cadastrado.'}
                  </p>
                </td></tr>
              ) : (
                filtered.map((m, idx) => (
                  <tr key={m.id} className={`transition-colors duration-100 hover:bg-accent/40 ${idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}>
                    <td className="px-5 py-3.5 font-display font-semibold text-foreground">{m.nome}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{m.email}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{m.telefone || <span className="italic text-xs text-muted-foreground/50">—</span>}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 justify-end">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => { setEditData(m); setFormOpen(true); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setExcluirTarget(m)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <MembroForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editData={editData}
        igrejaId={igrejaId}
        onSaved={load}
      />

      <ExcluirMembroDialog
        open={!!excluirTarget}
        onOpenChange={v => { if (!v) setExcluirTarget(null); }}
        membro={excluirTarget}
        membros={membros}
        igrejaId={igrejaId}
        onDeleted={load}
      />
    </div>
  );
}