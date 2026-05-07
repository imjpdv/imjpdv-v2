import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { base44 } from '@/api/base44Client';
import {
  BarChart3, Users, Settings, Newspaper,
  Home, Wallet, LogOut, Menu, X, Building2, TrendingUp, CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';


const ADMIN_NAV = [
  { to: '/home-admin',        label: 'Início',        icon: Home },
  { to: '/movimentacoes',     label: 'Movimentações', icon: TrendingUp },
  { to: '/gerencia',          label: 'Gerência',      icon: BarChart3 },
  { to: '/membros',           label: 'Membros',       icon: Users },
  { to: '/feed',              label: 'Feed de Notícias', icon: Newspaper },
  { to: '/contribuir',        label: 'Contribuir',    icon: CreditCard },
  { to: '/configuracoes',     label: 'Configurações', icon: Settings },
];

const MEMBRO_NAV = [
  { to: '/membro',                    label: 'Início',                icon: Home },
  { to: '/minhas-contribuicoes',      label: 'Minhas Contribuições',  icon: Wallet },
  { to: '/feed',                      label: 'Feed de Notícias',      icon: Newspaper },
  { to: '/contribuir',                label: 'Contribuir',            icon: CreditCard },
];

function NavItem({ item, onClick }) {
  const { pathname } = useLocation();
  const active = pathname === item.to;
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
        active
          ? 'bg-accent text-primary font-semibold shadow-sacred'
          : 'text-foreground/60 hover:bg-accent/60 hover:text-primary'
      )}
    >
      <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-primary' : 'text-foreground/40')} />
      {item.label}
    </Link>
  );
}

function SidebarContent({ isAdmin, nav, user, onClose }) {
  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Brand */}
      <div className="px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-display font-bold text-primary leading-tight tracking-widest uppercase">
              Tesouraria
            </p>
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
              {isAdmin ? 'Administrador' : 'Portal do Membro'}
            </p>
          </div>
        </div>
      </div>

      {/* Divider via surface shift — no border */}
      <div className="mx-4 h-px bg-border/40 mb-2" />

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {nav.map(item => (
          <NavItem key={item.to} item={item} onClick={onClose} />
        ))}
      </nav>

      {/* User + logout */}
      <div className="mx-4 h-px bg-border/40 mb-3" />
      <div className="px-4 pb-5">
        {user && (
          <div className="mb-2.5">
            <p className="text-xs font-medium text-foreground truncate">{user.full_name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/8 gap-2 px-2"
          onClick={() => base44.auth.logout()}
        >
          <LogOut className="w-4 h-4" /> Sair
        </Button>
      </div>
    </div>
  );
}

export default function Layout() {
  const { user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [pagVisivel, setPagVisivel] = useState({});
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!user?.igreja_id || isAdmin) return;
    base44.entities.ChurchSettings.filter({ igreja_id: user.igreja_id }, '-created_date', 1)
      .then(cs => { if (cs[0]?.paginas_visiveis) setPagVisivel(cs[0].paginas_visiveis); });
  }, [user?.igreja_id, isAdmin]);

  const membroNav = MEMBRO_NAV.filter(item => {
    if (item.to === '/minhas-contribuicoes') return pagVisivel.minhas_contribuicoes !== false;
    if (item.to === '/feed') return pagVisivel.feed !== false;
    if (item.to === '/contribuir') return pagVisivel.contribuir !== false;
    return true;
  });

  const nav = isAdmin ? ADMIN_NAV : membroNav;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar desktop — no hard border, shadow separates */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 shadow-sacred bg-sidebar">
      <SidebarContent isAdmin={isAdmin} nav={nav} user={user} />
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-56 flex flex-col bg-sidebar shadow-sacred-lg">
            <div className="flex items-center justify-between px-4 py-4">
              <p className="text-sm font-display font-bold text-primary tracking-wide uppercase">Tesouraria</p>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => setOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <SidebarContent isAdmin={isAdmin} nav={nav} user={user} onClose={() => setOpen(false)} />
          </div>
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar mobile */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-card/80 backdrop-blur-md">
          <button
            onClick={() => setOpen(true)}
            className="h-11 w-11 flex items-center justify-center rounded-xl text-foreground bg-transparent hover:bg-accent active:bg-accent/80 active:scale-95 transition-all duration-150"
            aria-label="Abrir menu"
          >
            <Menu className="w-6 h-6" strokeWidth={2.5} />
          </button>
          <p className="text-sm font-display font-bold text-primary tracking-widest uppercase">Tesouraria</p>
        </header>

        <main className="flex-1 overflow-y-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}