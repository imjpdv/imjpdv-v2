import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

export default function FiltrosMovimentacao({ search, onSearch, filters, onFilters, categorias }) {
  const hasFilters = filters.tipo || filters.categoria_id || filters.data_inicio || filters.data_fim || search;

  const clear = () => {
    onSearch('');
    onFilters({ tipo: '', categoria_id: '', data_inicio: '', data_fim: '' });
  };

  return (
    <div className="space-y-3 rounded-2xl bg-card shadow-sacred p-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por descrição, membro, valor..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={filters.tipo || 'todos'} onValueChange={(v) => onFilters({ ...filters, tipo: v === 'todos' ? '' : v })}>
          <SelectTrigger className="h-8 w-36 text-sm"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="entrada">Entrada</SelectItem>
            <SelectItem value="saida">Saída</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.categoria_id || 'todas'} onValueChange={(v) => onFilters({ ...filters, categoria_id: v === 'todas' ? '' : v })}>
          <SelectTrigger className="h-8 w-44 text-sm"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={filters.data_inicio}
          onChange={(e) => onFilters({ ...filters, data_inicio: e.target.value })}
          className="h-8 w-36 text-sm"
          placeholder="Data início"
        />
        <span className="text-muted-foreground text-xs">até</span>
        <Input
          type="date"
          value={filters.data_fim}
          onChange={(e) => onFilters({ ...filters, data_fim: e.target.value })}
          className="h-8 w-36 text-sm"
        />

        {hasFilters && (
          <Button size="sm" variant="ghost" onClick={clear} className="h-8 text-xs text-muted-foreground">
            <X className="w-3 h-3 mr-1" /> Limpar
          </Button>
        )}
      </div>
    </div>
  );
}