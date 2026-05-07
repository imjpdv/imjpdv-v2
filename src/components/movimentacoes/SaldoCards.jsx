import React from 'react';
import { TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { useShowValues, fmtVal } from '@/lib/useShowValues';

function FinCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-card rounded-2xl p-6 shadow-sacred flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-body font-medium text-muted-foreground uppercase tracking-widest">{label}</p>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '18' }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-display font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

export default function SaldoCards({ totais }) {
  const { show } = useShowValues();
  const saldo = (totais?.entradas || 0) - (totais?.saidas || 0);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
      <FinCard label="Entradas"  value={fmtVal(totais?.entradas, show)} icon={TrendingUp}   color="#106d20" />
      <FinCard label="Saídas"    value={fmtVal(totais?.saidas, show)}   icon={TrendingDown} color="#ba1a1a" />
      <FinCard label="Saldo"     value={fmtVal(saldo, show)}             icon={Scale}        color={saldo >= 0 ? '#106d20' : '#ba1a1a'} />
    </div>
  );
}