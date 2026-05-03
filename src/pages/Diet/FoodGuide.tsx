import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getFoodGuide, type FoodGuideGroup } from '@/services/foodGuideService';

const MEAL_TABS = [
  { key: 'colazione', label: 'Colazione' },
  { key: 'pranzo_cena', label: 'Pranzo / Cena' },
  { key: 'frutta', label: 'Frutta' },
] as const;

type MealTab = typeof MEAL_TABS[number]['key'];

const GROUP_MEAL_MAP: Record<string, MealTab> = {
  'b9000000-0000-0000-0000-000000000000': 'colazione',
  'ba000000-0000-0000-0000-000000000000': 'colazione',
  'bb000000-0000-0000-0000-000000000000': 'colazione',
  'bc000000-0000-0000-0000-000000000000': 'colazione',
  'b1000000-0000-0000-0000-000000000000': 'pranzo_cena',
  'b2000000-0000-0000-0000-000000000000': 'pranzo_cena',
  'b3000000-0000-0000-0000-000000000000': 'pranzo_cena',
  'b4000000-0000-0000-0000-000000000000': 'pranzo_cena',
  'b5000000-0000-0000-0000-000000000000': 'pranzo_cena',
  'b6000000-0000-0000-0000-000000000000': 'pranzo_cena',
  'b7000000-0000-0000-0000-000000000000': 'pranzo_cena',
  'bd000000-0000-0000-0000-000000000000': 'pranzo_cena',
  'b8000000-0000-0000-0000-000000000000': 'frutta',
};

const COLAZIONE_ORDER = [
  'b9000000-0000-0000-0000-000000000000', // Colazione Latticini
  'bb000000-0000-0000-0000-000000000000', // Colazione Carboidrati
  'bc000000-0000-0000-0000-000000000000', // Colazione Proteine
  'ba000000-0000-0000-0000-000000000000', // Colazione Snack Grassi
];

const PRANZO_CENA_ORDER = [
  'b1000000-0000-0000-0000-000000000000', // Carboidrati
  'b4000000-0000-0000-0000-000000000000', // Legumi
  'b2000000-0000-0000-0000-000000000000', // Carne Bianca / Pesce Magro
  'b3000000-0000-0000-0000-000000000000', // Carne Rossa / Pesce Grasso
  'b6000000-0000-0000-0000-000000000000', // Uova
  'b5000000-0000-0000-0000-000000000000', // Formaggi
  'b7000000-0000-0000-0000-000000000000', // Condimenti
  'bd000000-0000-0000-0000-000000000000', // Extra concessi
];

export default function FoodGuide() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<FoodGuideGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<MealTab>('colazione');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  useEffect(() => {
    getFoodGuide()
      .then(setGroups)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const tabGroups = groups
    .filter(g => GROUP_MEAL_MAP[g.groupId] === activeTab)
    .sort((a, b) => {
      const order = activeTab === 'pranzo_cena' ? PRANZO_CENA_ORDER
        : activeTab === 'colazione' ? COLAZIONE_ORDER
        : [];
      return order.indexOf(a.groupId) - order.indexOf(b.groupId);
    });

  const visibleGroups = activeFilter
    ? tabGroups.filter(g => g.groupId === activeFilter)
    : tabGroups;

  return (
    <div className="px-5 pt-14 pb-24 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 -ml-2"
          onClick={() => navigate('/diet')}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">Guida Alimenti</h1>
      </div>
      <p className="text-muted-foreground text-sm mb-6 ml-8">
        Equivalenze e grammature per ogni categoria
      </p>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {MEAL_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setActiveFilter(null); }}
            className={`flex-1 rounded-full py-2 text-xs font-semibold transition-colors ${
              activeTab === tab.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-filters */}
      {tabGroups.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-4">
          <button
            onClick={() => setActiveFilter(null)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeFilter === null
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Tutti
          </button>
          {tabGroups.map(g => (
            <button
              key={g.groupId}
              onClick={() => setActiveFilter(g.groupId)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeFilter === g.groupId
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {g.groupName}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {visibleGroups.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Nessun dato disponibile
            </p>
          ) : (
            visibleGroups.map(group => (
              <div
                key={group.groupId}
                className="rounded-2xl border border-border bg-card overflow-hidden"
              >
                {/* Group header */}
                <div className="px-4 py-3 border-b border-border bg-muted/40">
                  <p className="font-semibold text-sm">{group.groupName}</p>
                </div>

                {/* Foods list */}
                <div className="divide-y divide-border">
                  {group.foods.map(food => (
                    <div
                      key={food.foodId}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <span className="text-sm">{food.name}</span>
                      <span className="text-sm font-medium tabular-nums text-primary">
                        {food.baseQuantityG}g
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
