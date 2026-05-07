import React from 'react';
import { TrendingUp, TrendingDown, Landmark } from 'lucide-react';
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
        ? <Skeleton className="h-8 w-36" />
        : <p className="text-2xl font-display font-bold" style={{ color }}>{value}</p>
      }
    </div>
  );
}

export default function ResumoContas({ saldoCaixa, totaisPeriodo, loading }) {
  const { show } = useShowValues();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
      <FinCard
        label="Saldo em Caixa (Histórico)"
        value={fmtVal(saldoCaixa, show)}
        icon={Landmark}
        color={saldoCaixa >= 0 ? '#715824' : '#ba1a1a'}
        loading={loading}
      />
      <FinCard
        label="Entradas do Período"
        value={fmtVal(totaisPeriodo.entradas, show)}
        icon={TrendingUp}
        color="#106d20"
        loading={loading}
      />
      <FinCard
        label="Saídas do Período"
        value={fmtVal(totaisPeriodo.saidas, show)}
        icon={TrendingDown}
        color="#ba1a1a"
        loading={loading}
      />
    </div>
  );
}