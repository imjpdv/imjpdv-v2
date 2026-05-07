import React, { useState } from 'react';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldAlert, Loader2, Settings, Tag, CreditCard, Landmark, Building2, ArrowUpDown, ShieldCheck, Link2, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import Onboarding from './Onboarding';
import AguardandoVinculacao from '@/components/AguardandoVinculacao';
import CategoriaConfigPanel from '@/components/configuracoes/CategoriaConfigPanel';
import FormaPagamentoPanel from '@/components/configuracoes/FormaPagamentoPanel';
import ContaBancariaPanel from '@/components/configuracoes/ContaBancariaPanel';
import ChurchSettingsPanel from '@/components/configuracoes/ChurchSettingsPanel';
import ImportacaoExportacaoPanel from '@/components/configuracoes/ImportacaoExportacaoPanel';
import CorrigirVinculoPanel from '@/components/configuracoes/CorrigirVinculoPanel';
import VisibilidadePaginasPanel from '@/components/configuracoes/VisibilidadePaginasPanel';

export default function Configuracoes() {
  const { user, loading } = useCurrentUser();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-center p-8">
        <ShieldAlert className="w-10 h-10 text-muted-foreground" />
        <p className="text-muted-foreground">Você precisa estar autenticado para acessar as configurações.</p>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-center p-8">
        <ShieldAlert className="w-10 h-10 text-destructive" />
        <h2 className="text-lg font-semibold">Acesso restrito</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          Apenas administradores podem acessar as configurações do sistema.
        </p>
      </div>
    );
  }

  if (!user.igreja_id) {
    if (user.role === 'admin') return <Onboarding user={user} onComplete={() => window.location.reload()} />;
    return <AguardandoVinculacao user={user} />;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="space-y-1">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold">Configurações</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Gerencie as categorias, formas de pagamento, contas bancárias e dados da igreja.
          </p>
        </header>

        <div className="flex justify-end">
          <Link
            to="/regras-rls"
            className="flex items-center gap-2 text-xs font-body font-medium text-primary hover:underline"
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Ver Regras de Segurança (RLS)
          </Link>
        </div>

        <Tabs defaultValue="categorias">
          <TabsList className="flex flex-wrap gap-1 h-auto bg-muted p-1 rounded-xl w-full">
            <TabsTrigger value="categorias" className="flex items-center gap-1.5 text-xs py-2 px-3 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Tag className="w-3.5 h-3.5 shrink-0" /> <span>Categorias</span>
            </TabsTrigger>
            <TabsTrigger value="formas" className="flex items-center gap-1.5 text-xs py-2 px-3 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <CreditCard className="w-3.5 h-3.5 shrink-0" /> <span>Formas de Pagamento</span>
            </TabsTrigger>
            <TabsTrigger value="contas" className="flex items-center gap-1.5 text-xs py-2 px-3 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Landmark className="w-3.5 h-3.5 shrink-0" /> <span>Contas Bancárias</span>
            </TabsTrigger>
            <TabsTrigger value="igreja" className="flex items-center gap-1.5 text-xs py-2 px-3 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Building2 className="w-3.5 h-3.5 shrink-0" /> <span>Igreja</span>
            </TabsTrigger>
            <TabsTrigger value="importexport" className="flex items-center gap-1.5 text-xs py-2 px-3 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <ArrowUpDown className="w-3.5 h-3.5 shrink-0" /> <span>Importação / Exportação</span>
            </TabsTrigger>
            <TabsTrigger value="vinculos" className="flex items-center gap-1.5 text-xs py-2 px-3 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Link2 className="w-3.5 h-3.5 shrink-0" /> <span>Corrigir Vínculo</span>
            </TabsTrigger>
            <TabsTrigger value="visibilidade" className="flex items-center gap-1.5 text-xs py-2 px-3 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Eye className="w-3.5 h-3.5 shrink-0" /> <span>Visibilidade</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categorias">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Categorias de Movimentação</CardTitle>
                <CardDescription>
                  Fonte única de categorias para todas as movimentações. A exclusão requer migração.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CategoriaConfigPanel igrejaId={user.igreja_id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="formas">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Formas de Pagamento</CardTitle>
                <CardDescription>
                  Fonte única de formas de pagamento para todas as movimentações. A exclusão requer migração.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormaPagamentoPanel igrejaId={user.igreja_id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contas">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contas Bancárias</CardTitle>
                <CardDescription>
                  Gerencie as contas bancárias e chaves PIX. Apenas uma pode ser a conta principal.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ContaBancariaPanel igrejaId={user.igreja_id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="igreja">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dados da Igreja</CardTitle>
                <CardDescription>
                  Informações institucionais da igreja. Existe apenas um registro por tenant.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChurchSettingsPanel igrejaId={user.igreja_id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="importexport">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Importação / Exportação</CardTitle>
                <CardDescription>
                  Importe dados em CSV ou exporte movimentações e membros para análise externa.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ImportacaoExportacaoPanel igrejaId={user.igreja_id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vinculos">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Corrigir Vínculo de Membros</CardTitle>
                <CardDescription>
                  Registros com membro_nome preenchido mas sem membro_id. Apenas registros com membro cadastrado correspondente são exibidos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CorrigirVinculoPanel igrejaId={user.igreja_id} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="visibilidade">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Visibilidade de Páginas</CardTitle>
                <CardDescription>
                  Controle quais páginas e abas ficam visíveis para os membros da igreja.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VisibilidadePaginasPanel igrejaId={user.igreja_id} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}