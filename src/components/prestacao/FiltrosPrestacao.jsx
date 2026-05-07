import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X, CalendarRange } from 'lucide-react';

const MESES = [
  { v: '01', l: 'Janeiro' }, { v: '02', l: 'Fevereiro' }, { v: '03', l: 'Março' },
  { v: '04', l: 'Abril' }, { v: '05', l: 'Maio' }, { v: '06', l: 'Junho' },
  { v: '07', l: 'Julho' }, { v: '08', l: 'Agosto' }, { v: '09', l: 'Setembro' },
  { v: '10', l: 'Outubro' }, { v: '11', l: 'Novembro' }, { v: '12', l: 'Dezembro' },
];

const currentYear = new Date().getFullYear();
const ANOS = Array.from({ length: 6 }, (_, i) => String(currentYear - i));

export default function FiltrosPrestacao({ filters, onFilters, emptyFilters }) {
  const set = (k, v) => onFilters(f => ({ ...f, [k]: v }));
  const hasActive = Object.values(filters).some(v => v !== '');

  return (
    <div className="rounded-2xl bg-card shadow-sacred p-4">
      <div className="flex flex-wrap gap-2 items-center">
        <CalendarRange className="w-4 h-4 text-muted-foreground shrink-0" />

        <Select value={filters.ano || '__all'} onValueChange={v => set('ano', v === '__all' ? '' : v)}>
          <SelectTrigger className="h-8 w-28 text-sm bg-input border-0 focus:ring-1 focus:ring-primary"><SelectValue placeholder="Ano" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Todos os anos</SelectItem>
            {ANOS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.mes || '__all'} onValueChange={v => set('mes', v === '__all' ? '' : v)}>
          <SelectTrigger className="h-8 w-36 text-sm bg-input border-0 focus:ring-1 focus:ring-primary"><SelectValue placeholder="Mês" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Todos os meses</SelectItem>
            {MESES.map(m => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground">ou período:</span>

        <Input
          type="date"
          value={filters.data_inicio}
          onChange={e => set('data_inicio', e.target.value)}
          className="h-8 w-36 text-sm bg-input border-0 focus-visible:ring-1 focus-visible:ring-primary"
        />
        <span className="text-xs text-muted-foreground">até</span>
        <Input
          type="date"
          value={filters.data_fim}
          onChange={e => set('data_fim', e.target.value)}
          className="h-8 w-36 text-sm bg-input border-0 focus-visible:ring-1 focus-visible:ring-primary"
        />

        {hasActive && (
          <Button size="sm" variant="ghost" onClick={() => onFilters(emptyFilters)} className="h-8 text-xs text-muted-foreground">
            <X className="w-3 h-3 mr-1" /> Limpar
          </Button>
        )}
      </div>
    </div>
  );
}