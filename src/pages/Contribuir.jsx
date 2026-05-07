import React, { useState, useEffect } from 'react';
import { Landmark, ScanLine, CreditCard, Link as LinkIcon } from 'lucide-react';
import InformacoesBancariasTab from '@/components/contribuir/InformacoesBancariasTab';
import PixTab from '@/components/contribuir/PixTab';
import CartaoCreditoTab from '@/components/contribuir/CartaoCreditoTab';
import LinkPagamentoTab from '@/components/contribuir/LinkPagamentoTab';
import FooterIgreja from '@/components/FooterIgreja';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/lib/useCurrentUser';

const ALL_TABS = [
  { id: 'bancario', label: 'Info. Bancárias',   icon: Landmark,   visKey: 'contribuir_bancario' },
  { id: 'pix',      label: 'Pix',               icon: ScanLine,   visKey: 'contribuir_pix'      },
  { id: 'cartao',   label: 'Cartões', labelSub: '(Crédito/Débito)', icon: CreditCard, visKey: 'contribuir_cartao'   },
  { id: 'link',     label: 'Link de Pagamento', icon: LinkIcon,   visKey: 'contribuir_link'     },
];

export default function Contribuir() {
  const { user } = useCurrentUser();
  const [pagVisivel, setPagVisivel] = useState({});

  useEffect(() => {
    if (!user?.igreja_id) return;
    base44.entities.ChurchSettings.filter({ igreja_id: user.igreja_id }, '-created_date', 1)
      .then(cs => { if (cs[0]?.paginas_visiveis) setPagVisivel(cs[0].paginas_visiveis); });
  }, [user?.igreja_id]);

  const tabs = ALL_TABS.filter(t => pagVisivel[t.visKey] !== false);
  const [activeTab, setActiveTab] = useState('bancario');
  const visibleTab = tabs.find(t => t.id === activeTab) ? activeTab : tabs[0]?.id;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Contribuir</h1>
          <p className="text-sm font-body text-muted-foreground mt-0.5">
            Escolha a forma de contribuição que preferir
          </p>
        </div>

        {/* Tab bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = visibleTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl text-xs font-display font-semibold transition-all ${
                  active
                    ? 'bg-primary text-primary-foreground shadow-sacred'
                    : 'bg-card text-muted-foreground hover:bg-accent hover:text-primary border border-border/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}{tab.labelSub && <><br /><em className="font-normal not-italic text-[10px]">{tab.labelSub}</em></>}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {visibleTab === 'bancario' && <InformacoesBancariasTab />}
        {visibleTab === 'pix'      && <PixTab />}
        {visibleTab === 'cartao'   && <CartaoCreditoTab />}
        {visibleTab === 'link'     && <LinkPagamentoTab />}

      </div>
      <FooterIgreja />
    </div>
  );
}