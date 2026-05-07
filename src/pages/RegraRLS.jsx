import React from 'react';
import { useCurrentUser } from '@/lib/useCurrentUser';
import {
  ShieldCheck, AlertTriangle, CheckCircle2, Info, Lock,
  Eye, Edit, Trash2, Plus, AlertCircle
} from 'lucide-react';

const ENTITIES = [
  { name: 'Movimentacao',        read: 'Usuários da igreja', create: 'Admin', update: 'Admin', delete: 'Admin' },
  { name: 'Membro',              read: 'Usuários da igreja', create: 'Admin', update: 'Admin', delete: 'Admin' },
  { name: 'CategoriaConfig',     read: 'Usuários da igreja', create: 'Admin', update: 'Admin', delete: 'Admin' },
  { name: 'FormaPagamentoConfig',read: 'Usuários da igreja', create: 'Admin', update: 'Admin', delete: 'Admin' },
  { name: 'ContaBancaria',       read: 'Usuários da igreja', create: 'Admin', update: 'Admin', delete: 'Admin' },
  { name: 'FeedNoticias',        read: 'Usuários da igreja', create: 'Admin', update: 'Admin', delete: 'Admin' },
  { name: 'ChurchSettings',      read: 'Usuários da igreja', create: 'Admin', update: 'Admin', delete: null },
];

const PROIBICOES = [
  'OR (||) nas regras',
  'created_by como critério de acesso',
  'email como critério de acesso',
  'membro_nome como critério de acesso',
  'Lógica de negócio dentro do RLS',
  'Fallbacks automáticos',
];

const STATUS_ITEMS = [
  'RLS ativo em todas as entidades',
  'Isolamento por igreja_id funcionando',
  'Admins com acesso completo à sua igreja',
  'Usuários carregam dados da igreja conforme RLS',
  'Filtragem por membro ocorre no frontend',
  'ChurchSettings sem permissão de exclusão',
];

function CodeBlock({ children }) {
  return (
    <pre className="bg-muted rounded-lg px-4 py-3 text-xs font-mono text-foreground overflow-x-auto whitespace-pre leading-relaxed">
      {children}
    </pre>
  );
}

function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <h2 className="text-base font-display font-bold text-foreground">{title}</h2>
    </div>
  );
}

export default function RegraRLS() {
  const { user } = useCurrentUser();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Regras de Segurança (RLS)</h1>
            <p className="text-sm font-body text-muted-foreground">Página informativa — nenhuma alteração é feita aqui</p>
          </div>
        </div>

        {/* Visão Geral */}
        <div className="bg-card rounded-2xl shadow-sacred p-6">
          <SectionTitle icon={Info} title="Visão Geral" />
          <p className="text-sm font-body text-muted-foreground leading-relaxed mb-4">
            O sistema utiliza isolamento por <strong className="text-foreground">igreja_id</strong> para garantir que cada
            igreja acesse apenas seus próprios dados. As regras abaixo definem quem pode acessar e modificar informações no banco de dados.
          </p>
          <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
            <p className="text-sm font-display font-semibold text-primary">
              Toda entidade é protegida por <code className="font-mono bg-primary/10 px-1.5 py-0.5 rounded">igreja_id</code>
            </p>
          </div>
        </div>

        {/* Princípio Base */}
        <div className="bg-card rounded-2xl shadow-sacred p-6">
          <SectionTitle icon={Lock} title="Princípio Base" />
          <CodeBlock>{`READ:
  igreja_id === auth.user.igreja_id`}</CodeBlock>
          <p className="text-xs font-body text-muted-foreground mt-3">
            O banco de dados retorna apenas registros da mesma igreja do usuário logado.
          </p>
        </div>

        {/* Padrão Global */}
        <div className="bg-card rounded-2xl shadow-sacred p-6 border border-primary/20">
          <SectionTitle icon={Lock} title="Padrão Global de Acesso" />
          <p className="text-sm font-body text-muted-foreground mb-3">Regras aplicadas na maioria das entidades:</p>
          <CodeBlock>{`READ:
  igreja_id === auth.user.igreja_id

CREATE:
  auth.user.role === "admin" && data.igreja_id === auth.user.igreja_id

UPDATE:
  auth.user.role === "admin" && data.igreja_id === auth.user.igreja_id

DELETE:
  auth.user.role === "admin" && data.igreja_id === auth.user.igreja_id`}</CodeBlock>
        </div>

        {/* Regras por Entidade */}
        <div className="bg-card rounded-2xl shadow-sacred p-6">
          <SectionTitle icon={ShieldCheck} title="Regras por Entidade" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="bg-muted/60">
                  <th className="px-4 py-3 text-left text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-widest">Entidade</th>
                  <th className="px-4 py-3 text-left text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-widest">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />Ler</span>
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-widest">
                    <span className="flex items-center gap-1"><Plus className="w-3 h-3" />Criar</span>
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-widest">
                    <span className="flex items-center gap-1"><Edit className="w-3 h-3" />Editar</span>
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-widest">
                    <span className="flex items-center gap-1"><Trash2 className="w-3 h-3" />Excluir</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {ENTITIES.map((e, i) => (
                  <tr key={e.name} className={i % 2 === 0 ? 'bg-card' : 'bg-muted/20'}>
                    <td className="px-4 py-3">
                      <code className="font-mono text-xs bg-primary/8 text-primary px-1.5 py-0.5 rounded">{e.name}</code>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{e.read}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{e.create}</span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{e.update}</span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {e.delete
                        ? <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{e.delete}</span>
                        : <span className="bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">Não permitido</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            * "Usuários da igreja" = qualquer usuário com o mesmo <code className="font-mono bg-muted px-1 rounded">igreja_id</code>
          </p>
        </div>

        {/* Proibições */}
        <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
            <h2 className="text-base font-display font-bold text-destructive">Proibições Críticas</h2>
          </div>
          <p className="text-sm font-body text-muted-foreground mb-3">Nunca utilizar nas regras de segurança:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PROIBICOES.map((p) => (
              <div key={p} className="flex items-center gap-2 bg-destructive/5 rounded-lg px-3 py-2.5">
                <span className="text-destructive font-bold text-base leading-none">×</span>
                <span className="text-sm font-body text-foreground">{p}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Como o sistema usa RLS */}
        <div className="bg-card rounded-2xl shadow-sacred p-6">
          <SectionTitle icon={Info} title="Como o sistema utiliza o RLS" />
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Lock className="w-3 h-3 text-primary" />
              </div>
              <div>
                <p className="text-sm font-display font-semibold text-foreground">RLS controla quem PODE acessar os dados</p>
                <p className="text-xs font-body text-muted-foreground mt-0.5">O banco libera apenas registros da mesma igreja do usuário logado.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-secondary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Eye className="w-3 h-3 text-secondary" />
              </div>
              <div>
                <p className="text-sm font-display font-semibold text-foreground">O frontend controla quais dados o usuário DEVE ver</p>
                <p className="text-xs font-body text-muted-foreground mt-0.5">Filtragem por membro_id, data, categoria, etc. é feita no código da tela.</p>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs font-body text-muted-foreground mb-2">Fluxo correto:</p>
            <CodeBlock>{`// 1. O banco libera todos os dados da igreja (via RLS)
const movimentacoes = await base44.entities.Movimentacao
  .filter({ igreja_id: igrejaId });

// 2. O frontend filtra os dados conforme a regra de negócio
const minhas = movimentacoes.filter(m => m.membro_id === membro.id);

// IMPORTANTE: membro.id é o ID da entidade Membro
// NÃO usar user.id diretamente sem vínculo garantido`}</CodeBlock>
          </div>
        </div>

        {/* Alerta Crítico — Vínculo de Dados */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <h2 className="text-base font-display font-bold text-amber-700">Alerta Crítico — Vínculo de Dados</h2>
          </div>
          <p className="text-sm font-body text-amber-800 mb-4">
            Se um registro de <code className="font-mono bg-amber-100 px-1 rounded">Movimentacao</code> <strong>não tiver</strong> <code className="font-mono bg-amber-100 px-1 rounded">membro_id</code> preenchido:
          </p>
          <div className="bg-amber-100/60 rounded-xl px-4 py-3 mb-4">
            <p className="text-sm font-display font-semibold text-amber-700">→ Ele NÃO aparecerá para o membro no frontend</p>
            <p className="text-xs text-amber-600 mt-1">Isso NÃO é problema de RLS. É um problema de vínculo entre dados.</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-body">
              <span className="text-destructive font-bold">×</span>
              <span className="text-amber-800">Registro <strong>sem</strong> membro_id → invisível para o membro</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-body">
              <span className="text-secondary font-bold">✓</span>
              <span className="text-amber-800">Registro <strong>com</strong> membro_id correto → visível normalmente</span>
            </div>
          </div>
        </div>

        {/* Diagnóstico */}
        <div className="bg-card rounded-2xl shadow-sacred p-6">
          <SectionTitle icon={ShieldCheck} title="Diagnóstico do Usuário Atual" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-muted/40 rounded-xl px-4 py-3 space-y-1">
              <p className="text-[11px] font-body font-semibold text-muted-foreground uppercase tracking-widest">Role</p>
              <p className="text-sm font-display font-bold">
                {user?.role === 'admin'
                  ? <span className="text-primary">Administrador</span>
                  : <span className="text-foreground">Membro</span>
                }
              </p>
            </div>
            <div className="bg-muted/40 rounded-xl px-4 py-3 space-y-1">
              <p className="text-[11px] font-body font-semibold text-muted-foreground uppercase tracking-widest">Igreja ID</p>
              <p className="text-xs font-mono font-medium text-foreground break-all">{user?.igreja_id || '—'}</p>
            </div>
          </div>
          <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
            <p className="text-sm font-body text-primary">
              Você está acessando dados da igreja: <strong className="font-mono">{user?.igreja_id || '(não vinculado)'}</strong>
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="bg-card rounded-2xl shadow-sacred p-6">
          <SectionTitle icon={CheckCircle2} title="Status do Sistema" />
          <div className="space-y-2">
            {STATUS_ITEMS.map((item) => (
              <div key={item} className="flex items-center gap-3 bg-secondary/5 rounded-lg px-4 py-2.5">
                <CheckCircle2 className="w-4 h-4 text-secondary shrink-0" />
                <span className="text-sm font-body text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Observação Final */}
        <div className="bg-muted/40 border border-border/60 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-muted-foreground shrink-0" />
            <h2 className="text-sm font-display font-bold text-foreground">Observação Final</h2>
          </div>
          <p className="text-sm font-body text-muted-foreground leading-relaxed mb-3">
            RLS não deve conter regras de negócio. Qualquer lógica como:
          </p>
          <div className="space-y-1.5 mb-3">
            {['"mostrar apenas dados do membro"', '"filtrar por usuário"', '"restringir por email"'].map(l => (
              <div key={l} className="flex items-center gap-2 text-sm font-body text-muted-foreground">
                <span className="text-destructive font-bold">×</span> {l}
              </div>
            ))}
          </div>
          <p className="text-sm font-body text-foreground font-medium">
            → deve ser implementada no <strong>frontend</strong> e não no RLS.
          </p>
        </div>

      </div>
    </div>
  );
}