import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X, SlidersHorizontal } from 'lucide-react';

const MESES = [
  { v: '01', l: 'Janeiro' }, { v: '02', l: 'Fevereiro' }, { v: '03', l: 'Março' },
  { v: '04', l: 'Abril' }, { v: '05', l: 'Maio' }, { v: '06', l: 'Junho' },
  { v: '07', l: 'Julho' }, { v: '08', l: 'Agosto' }, { v: '09', l: 'Setembro' },
  { v: '10', l: 'Outubro' }, { v: '11', l: 'Novembro' }, { v: '12', l: 'Dezembro' },
];

const currentYear = new Date().getFullYear();
const ANOS = Array.from({ length: 6 }, (_, i) => String(currentYear - i));

export default function FiltrosGerencia({ search, onSearch, filters, onFilters, categorias, formas, membros, emptyFilters }) {
  const set = (k, v) => onFilters(f => ({ ...f, [k]: v }));
  const sel = (k, v, placeholder) => v === placeholder ? set(k, '') : set(k, v);

  const hasActive = search || Object.values(filters).some(v => v !== '');

  const clear = () => { onSearch(''); onFilters(emptyFilters); };

  return (
    <div className="space-y-3 p-4 rounded-2xl bg-card shadow-sacred">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <SlidersHorizontal className="w-4 h-4" />
        Filtros
        {hasActive && (
          <Button size="sm" variant="ghost" onClick={clear} className="ml-auto h-7 text-xs text-muted-foreground">
            <X className="w-3 h-3 mr-1" /> Limpar filtros
          </Button>
        )}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar registros..."
          value={search}
          onChange={e => onSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filtros linha 1 */}
      <div className="flex flex-wrap gap-2">
        {/* Tipo */}
        <Select value={filters.tipo || '__all'} onValueChange={v => set('tipo', v === '__all' ? '' : v)}>
          <SelectTrigger className="h-8 w-32 text-sm"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Todos os tipos</SelectItem>
            <SelectItem value="entrada">Entrada</SelectItem>
            <SelectItem value="saida">Saída</SelectItem>
          </SelectContent>
        </Select>

        {/* Ano */}
        <Select value={filters.ano || '__all'} onValueChange={v => set('ano', v === '__all' ? '' : v)}>
          <SelectTrigger className="h-8 w-28 text-sm"><SelectValue placeholder="Ano" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Todos os anos</SelectItem>
            {ANOS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Mês */}
        <Select value={filters.mes || '__all'} onValueChange={v => set('mes', v === '__all' ? '' : v)}>
          <SelectTrigger className="h-8 w-36 text-sm"><SelectValue placeholder="Mês" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Todos os meses</SelectItem>
            {MESES.map(m => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Categoria */}
        <Select value={filters.categoria_id || '__all'} onValueChange={v => set('categoria_id', v === '__all' ? '' : v)}>
          <SelectTrigger className="h-8 w-44 text-sm"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Todas as categorias</SelectItem>
            {categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Forma de pagamento */}
        <Select value={filters.forma_pagamento_id || '__all'} onValueChange={v => set('forma_pagamento_id', v === '__all' ? '' : v)}>
          <SelectTrigger className="h-8 w-44 text-sm"><SelectValue placeholder="Forma de pagamento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Todas as formas</SelectItem>
            {formas.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Membro */}
        <Select value={filters.membro_id || '__all'} onValueChange={v => set('membro_id', v === '__all' ? '' : v)}>
          <SelectTrigger className="h-8 w-44 text-sm"><SelectValue placeholder="Membro" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Todos os membros</SelectItem>
            {membros.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Filtros linha 2 — datas */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-muted-foreground">Período:</span>
        <Input
          type="date"
          value={filters.data_inicio}
          onChange={e => set('data_inicio', e.target.value)}
          className="h-8 w-36 text-sm"
        />
        <span className="text-xs text-muted-foreground">até</span>
        <Input
          type="date"
          value={filters.data_fim}
          onChange={e => set('data_fim', e.target.value)}
          className="h-8 w-36 text-sm"
        />
      </div>
    </div>
  );
}