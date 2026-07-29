import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2, Pencil, Plus, Trash2, X, Check } from 'lucide-react';
import {
  getFoodGuide,
  listAllFoods,
  upsertFoodEquivalence,
  deleteFoodEquivalence,
  type FoodGuideGroup,
  type FoodOption,
} from '@/services/foodGuideService';
import PageContainer from '@/components/PageContainer';

const MEAL_TABS = [
  { key: 'colazione', label: 'Colazione' },
  { key: 'pranzo_cena', label: 'Pranzo / Cena' },
  { key: 'frutta', label: 'Frutta' },
  { key: 'snack', label: 'Snack' },
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
  'be000000-0000-0000-0000-000000000000': 'snack',
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
  const [allFoods, setAllFoods] = useState<FoodOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<MealTab>('colazione');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Editing a food's grams inline
  const [editingEquivalenceId, setEditingEquivalenceId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Adding a new food to a group
  const [addingToGroupId, setAddingToGroupId] = useState<string | null>(null);
  const [addFoodId, setAddFoodId] = useState('');
  const [addGrams, setAddGrams] = useState('');
  const [saving, setSaving] = useState(false);

  function refresh() {
    return getFoodGuide().then(setGroups).catch(console.error);
  }

  useEffect(() => {
    Promise.all([getFoodGuide(), listAllFoods()])
      .then(([g, f]) => {
        setGroups(g);
        setAllFoods(f);
      })
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

  async function handleSaveGrams(groupId: string, foodId: string) {
    const value = Number(editValue);
    if (!Number.isFinite(value) || value <= 0) return;
    setSaving(true);
    try {
      await upsertFoodEquivalence(groupId, foodId, value);
      await refresh();
      setEditingEquivalenceId(null);
    } catch (error) {
      console.error('Error updating grammatura:', error);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(equivalenceId: string) {
    if (!window.confirm('Rimuovere questo alimento dal gruppo?')) return;
    try {
      await deleteFoodEquivalence(equivalenceId);
      await refresh();
    } catch (error) {
      console.error('Error removing equivalence:', error);
    }
  }

  async function handleAddFood(groupId: string) {
    const grams = Number(addGrams);
    if (!addFoodId || !Number.isFinite(grams) || grams <= 0) return;
    setSaving(true);
    try {
      await upsertFoodEquivalence(groupId, addFoodId, grams);
      await refresh();
      setAddingToGroupId(null);
      setAddFoodId('');
      setAddGrams('');
    } catch (error) {
      console.error('Error adding food to group:', error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageContainer variant="default" className="px-4 pt-14 pb-32 min-h-screen">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate('/diet')}
          className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground active:scale-90 transition-transform flex-shrink-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Guida Alimenti</h1>
          <p className="text-muted-foreground text-xs mt-0.5">Grammature e equivalenze per categoria</p>
        </div>
        <button
          onClick={() => {
            setEditMode((v) => !v);
            setAddingToGroupId(null);
            setEditingEquivalenceId(null);
          }}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${
            editMode ? 'gradient-primary text-white' : 'bg-secondary text-muted-foreground'
          }`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Meal Tabs (segmented) ── */}
      <div className="flex gap-1 mb-4 bg-secondary p-1 rounded-xl">
        {MEAL_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setActiveFilter(null); }}
            className={`flex-1 py-2 rounded-[10px] text-xs font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Category chips ── */}
      {tabGroups.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setActiveFilter(null)}
            className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeFilter === null
                ? 'gradient-primary text-white'
                : 'bg-secondary text-muted-foreground'
            }`}
          >
            Tutti
          </button>
          {tabGroups.map(g => (
            <button
              key={g.groupId}
              onClick={() => setActiveFilter(g.groupId)}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeFilter === g.groupId
                  ? 'gradient-primary text-white'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              {g.groupName}
            </button>
          ))}
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 lg:gap-6 items-start">
          {visibleGroups.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">
              Nessun dato disponibile
            </p>
          ) : (
            visibleGroups.map(group => {
              const groupFoodIds = new Set(group.foods.map(f => f.foodId));
              const availableFoods = allFoods.filter(f => !groupFoodIds.has(f.id));
              const isAdding = addingToGroupId === group.groupId;

              return (
                <div
                  key={group.groupId}
                  className="rounded-2xl border border-border bg-card overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-border">
                    <p className="font-bold text-sm tracking-tight">{group.groupName}</p>
                  </div>
                  <div className="divide-y divide-border">
                    {group.foods.map(food => {
                      const isEditingThis = editingEquivalenceId === food.equivalenceId;
                      return (
                        <div
                          key={food.equivalenceId}
                          className="flex items-center justify-between gap-3 px-4 py-3"
                        >
                          <span className="text-sm min-w-0 truncate">{food.name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            {isEditingThis ? (
                              <>
                                <input
                                  type="number"
                                  autoFocus
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveGrams(group.groupId, food.foodId);
                                    if (e.key === 'Escape') setEditingEquivalenceId(null);
                                  }}
                                  className="w-16 h-7 rounded-lg bg-secondary text-right text-sm px-2 tabular-nums"
                                />
                                <button
                                  disabled={saving}
                                  onClick={() => handleSaveGrams(group.groupId, food.foodId)}
                                  className="w-6 h-6 rounded-lg bg-primary/15 text-primary flex items-center justify-center"
                                >
                                  <Check className="h-3 w-3" />
                                </button>
                              </>
                            ) : (
                              <button
                                disabled={!editMode}
                                onClick={() => {
                                  if (!editMode) return;
                                  setEditingEquivalenceId(food.equivalenceId);
                                  setEditValue(String(food.baseQuantityG));
                                }}
                                className="text-sm font-bold tabular-nums text-primary"
                              >
                                {food.baseQuantityG}g
                              </button>
                            )}
                            {editMode && !isEditingThis && (
                              <button
                                onClick={() => handleRemove(food.equivalenceId)}
                                className="w-6 h-6 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {editMode && (
                    <div className="px-4 py-3 border-t border-border">
                      {isAdding ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={addFoodId}
                            onChange={(e) => setAddFoodId(e.target.value)}
                            className="flex-1 min-w-0 h-8 rounded-lg bg-secondary text-xs px-2"
                          >
                            <option value="">Alimento…</option>
                            {availableFoods.map(f => (
                              <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            placeholder="g"
                            value={addGrams}
                            onChange={(e) => setAddGrams(e.target.value)}
                            className="w-14 h-8 rounded-lg bg-secondary text-right text-xs px-2 tabular-nums"
                          />
                          <button
                            disabled={saving}
                            onClick={() => handleAddFood(group.groupId)}
                            className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => { setAddingToGroupId(null); setAddFoodId(''); setAddGrams(''); }}
                            className="w-8 h-8 rounded-lg bg-secondary text-muted-foreground flex items-center justify-center shrink-0"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingToGroupId(group.groupId)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Aggiungi alimento
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </PageContainer>
  );
}
