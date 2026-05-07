import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Onboarding from './Onboarding';
import AguardandoVinculacao from '@/components/AguardandoVinculacao';

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me()
      .then(u => { setUser(u); })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && user?.igreja_id) {
      if (user.role === 'admin') navigate('/home-admin', { replace: true });
      else navigate('/membro', { replace: true });
    }
  }, [loading, user]);

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );

  if (user && !user.igreja_id) {
    if (user.role === 'admin') return <Onboarding user={user} onComplete={() => window.location.reload()} />;
    return <AguardandoVinculacao user={user} />;
  }

  return null;
}