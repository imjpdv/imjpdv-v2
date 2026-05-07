import React from 'react';
import { Button } from '@/components/ui/button';

const TIPOS = [
  { v: '', l: 'Todos' },
  { v: 'aviso', l: 'Avisos' },
  { v: 'evento', l: 'Eventos' },
  { v: 'noticia', l: 'Notícias' },
  { v: 'devocional', l: 'Devocionais' },
];

export default function FiltroFeed({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {TIPOS.map(t => (
        <Button
          key={t.v}
          size="sm"
          variant={value === t.v ? 'default' : 'outline'}
          className="h-7 text-xs"
          onClick={() => onChange(t.v)}
        >
          {t.l}
        </Button>
      ))}
    </div>
  );
}