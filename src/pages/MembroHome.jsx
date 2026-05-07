import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Link } from 'react-router-dom';
import {
  Loader2, Building2, Newspaper, Wallet, CreditCard
} from 'lucide-react';
import AguardandoVinculacao from '@/components/AguardandoVinculacao';
import FooterIgreja from '@/components/FooterIgreja';

const WELCOME_TEXT = "Bem-vindo(a) à nossa plataforma digital. Aqui, membros e administradores têm acesso a um ambiente seguro, transparente e organizado para acompanhar e gerenciar as informações financeiras da igreja com clareza e responsabilidade.";

export default function MembroHome() {
  const { user, loading: loadingUser } = useCurrentUser();
  const igrejaId = user?.igreja_id;

  const [churchSettings, setChurchSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!igrejaId || !user) return;
    (async () => {
      setLoading(true);
      const cs = await base44.entities.ChurchSettings.filter({ igreja_id: igrejaId }, '-created_date', 1);
      setChurchSettings(cs[0] || null);
      setLoading(false);
    })();
  }, [igrejaId, user]);

  if (loadingUser || loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (user && !user.igreja_id) return <AguardandoVinculacao user={user} />;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">

        {/* Logo + Nome da Igreja */}
        <div className="text-center space-y-3 pt-4">
          {churchSettings?.logo_url ? (
            <img
              src={churchSettings.logo_url}
              alt="Logo"
              className="w-20 h-20 rounded-full object-cover mx-auto shadow-sacred"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Building2 className="w-9 h-9 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">
              {churchSettings?.church_name || 'Igreja'}
            </h1>
            <p className="text-sm font-body text-primary mt-0.5">Tesouraria da igreja</p>
          </div>
        </div>

        {/* Texto Institucional (bíblico) */}
        {churchSettings?.texto_institucional && (
          <div className="bg-muted/40 border border-border/50 rounded-xl px-5 py-4">
            <div
              className="prose prose-sm max-w-none text-muted-foreground leading-relaxed"
              dangerouslySetInnerHTML={{ __html: churchSettings.texto_institucional }}
            />
          </div>
        )}

        {/* Imagem Institucional */}
        {churchSettings?.imagem_institucional && (
          <img
            src={churchSettings.imagem_institucional}
            alt="Imagem institucional"
            className="w-full max-h-64 object-cover rounded-xl border border-border/50"
          />
        )}

        {/* Texto de boas-vindas */}
        <p className="text-sm font-body text-primary leading-relaxed">
          {WELCOME_TEXT}
        </p>

        {/* Cards de navegação — grade responsiva */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/minhas-contribuicoes">
            <div className="bg-card rounded-2xl shadow-sacred p-4 hover:shadow-sacred-lg transition-all cursor-pointer flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs font-display font-bold text-foreground">Minhas Contribuições</p>
              <p className="text-[11px] font-body text-muted-foreground leading-tight">Seu histórico</p>
            </div>
          </Link>
          <Link to="/feed">
            <div className="bg-card rounded-2xl shadow-sacred p-4 hover:shadow-sacred-lg transition-all cursor-pointer flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10">
                <Newspaper className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-xs font-display font-bold text-foreground">Feed de Notícias</p>
              <p className="text-[11px] font-body text-muted-foreground leading-tight">Avisos e eventos</p>
            </div>
          </Link>
          <Link to="/contribuir" className="col-span-2">
            <div className="bg-card rounded-2xl shadow-sacred p-4 hover:shadow-sacred-lg transition-all cursor-pointer flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 shrink-0">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-display font-bold text-foreground">Contribuir</p>
                <p className="text-[11px] font-body text-muted-foreground">Pix, Boleto, Cartão e mais</p>
              </div>
            </div>
          </Link>
        </div>

      </div>

      <FooterIgreja />
    </div>
  );
}