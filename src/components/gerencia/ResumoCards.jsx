import React from 'react';
import { TrendingUp, TrendingDown, Scale, Hash } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useShowValues, fmtVal } from '@/lib/useShowValues';

function FinCard({ label, value, icon: Icon, color, loading }) {
  return (
    <div className="bg-card rounded-2xl p-6 shadow-sacred flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-body font-medium text-muted-foreground uppercase tracking-widest">{label}</p>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '18' }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      {loading
        ? <Skeleton className="h-8 w-32" />
        : <p className="text-2xl font-display font-bold" style={{ color }}>{value}</p>
      }
    </div>
  );
}

export default function ResumoCards({ totais, loading }) {
  const { show } = useShowValues();
  const saldoPos = totais.saldo >= 0;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
      <FinCard label="Entradas"  value={fmtVal(totais.entradas, show)} icon={TrendingUp}   color="#106d20" loading={loading} />
      <FinCard label="Saídas"    value={fmtVal(totais.saidas, show)}   icon={TrendingDown} color="#ba1a1a" loading={loading} />
      <FinCard label="Saldo"     value={fmtVal(totais.saldo, show)}    icon={Scale}        color={saldoPos ? '#106d20' : '#ba1a1a'} loading={loading} />
      <FinCard label="Registros" value={String(totais.total)}          icon={Hash}         color="#715824" loading={loading} />
    </div>
  );
}