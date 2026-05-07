import { Toaster } from 'sonner'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from '@/components/Layout';

import Home from '@/pages/Home';
import Configuracoes from '@/pages/Configuracoes';
import Movimentacoes from '@/pages/Movimentacoes';
import Membros from '@/pages/Membros';
import Gerencia from '@/pages/Gerencia';
import PrestacaoContas from '@/pages/PrestacaoContas';
import FeedNoticias from '@/pages/FeedNoticias';
import MembroHome from '@/pages/MembroHome';
import HomeAdmin from '@/pages/HomeAdmin';
import InformacoesBancarias from '@/pages/InformacoesBancarias';
import Pix from '@/pages/Pix';
import LinkPagamento from '@/pages/LinkPagamento';
import RegraRLS from '@/pages/RegraRLS';
import MinhasContribuicoes from '@/pages/MinhasContribuicoes';
import Contribuir from '@/pages/Contribuir';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground font-body">Carregando...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  return (
    <Routes>
      {/* Rota raiz sem layout (onboarding / splash) */}
      <Route path="/" element={<Home />} />

      {/* Todas as demais rotas com Layout (sidebar) */}
      <Route element={<Layout />}>
        <Route path="/home-admin"         element={<HomeAdmin />} />
        <Route path="/configuracoes"      element={<Configuracoes />} />
        <Route path="/movimentacoes"      element={<Movimentacoes />} />
        <Route path="/membros"            element={<Membros />} />
        <Route path="/gerencia"           element={<Gerencia />} />
        <Route path="/prestacao-contas"   element={<PrestacaoContas />} />
        <Route path="/feed"               element={<FeedNoticias />} />
        <Route path="/membro"             element={<MembroHome />} />
        <Route path="/informacoes-bancarias" element={<InformacoesBancarias />} />
        <Route path="/pix" element={<Pix />} />
        <Route path="/link-pagamento" element={<LinkPagamento />} />
        <Route path="/regras-rls" element={<RegraRLS />} />
        <Route path="/minhas-contribuicoes" element={<MinhasContribuicoes />} />
        <Route path="/contribuir" element={<Contribuir />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;