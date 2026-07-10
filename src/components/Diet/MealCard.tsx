import { useState } from 'react';
import { ArrowRightLeft, Sparkles, Plus } from 'lucide-react';
import { MEAL_TYPES } from '@/types/diet';
import { FoodSwapModal } from './FoodSwapModal';
import { AddFoodModal } from './AddFoodModal';
import { RecipeDialog } from './RecipeDialog';

interface MealCardProps {
  mealId: string;
  mealType: string;
  foods: {
    foodId: string;
    mealFoodId: string;
    name: string;
    categoryName: string;
    categoryColor: string;
    portion: number;
    standardPortionG: number;
    calories?: number;
  }[];
  onFoodSwapped: () => void;
  weeklyPlanId?: string;
  dayOfWeek?: number;
}

const MEAL_ICONS: Record<string, string> = {
  colazione: '☀️',
  spuntino_mattutino: '🍎',
  pranzo: '🍽',
  spuntino_pomeridiano: '🥨',
  cena: '🌙',
};

export function MealCard({
  mealId,
  mealType,
  foods,
  onFoodSwapped,
  weeklyPlanId,
  dayOfWeek
}: MealCardProps) {
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<MealCardProps['foods'][0] | null>(null);
  const [recipeOpen, setRecipeOpen] = useState(false);

  const totalCalories = foods.reduce((sum, f) => sum + (f.calories || 0), 0);
  const mealTypeLabel = MEAL_TYPES[mealType as keyof typeof MEAL_TYPES] || mealType;
  const mealIcon = MEAL_ICONS[mealType] || '🍴';

  function handleOpenSwapModal(food: MealCardProps['foods'][0]) {
    setSelectedFood(food);
    setSwapModalOpen(true);
  }

  return (
    <>
      <div className="bg-card rounded-2xl overflow-hidden border border-border">

        {/* ── Meal Header ── */}
        <div className="px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl leading-none">{mealIcon}</span>
            <div>
              <h3 className="font-bold text-sm tracking-tight">{mealTypeLabel}</h3>
              {totalCalories > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {totalCalories} kcal
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Food List ── */}
        <div className="px-3 pb-3 space-y-1.5">
          {foods.length === 0 ? (
            <p className="text-sm text-muted-foreground px-1 pb-2">
              Nessun alimento assegnato
            </p>
          ) : (
            foods.map((food) => (
              <div
                key={food.mealFoodId}
                className="flex items-center justify-between bg-secondary/50 rounded-xl px-3 py-3"
              >
                {/* Color dot + info */}
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: food.categoryColor }}
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-sm leading-tight truncate">{food.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {food.portion}g
                      {food.calories ? ` · ${food.calories} kcal` : ''}
                    </p>
                  </div>
                </div>

                {/* Swap CTA */}
                <button
                  onClick={() => handleOpenSwapModal(food)}
                  className="ml-3 flex items-center gap-1 h-8 px-2.5 rounded-xl bg-card border border-border text-xs font-semibold text-muted-foreground active:scale-90 transition-transform flex-shrink-0"
                >
                  <ArrowRightLeft className="h-3 w-3" />
                  Cambia
                </button>
              </div>
            ))
          )}
        </div>

        {/* ── Add food CTA ── */}
        <button
          onClick={() => setAddModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border-t border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors active:bg-secondary/50"
        >
          <Plus className="h-3.5 w-3.5 text-primary" />
          Aggiungi alimento
        </button>

        {/* ── Recipe CTA (bottom of card, only if foods present) ── */}
        {foods.length > 0 && (
          <button
            onClick={() => setRecipeOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 border-t border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors active:bg-secondary/50"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Genera idea piatto
          </button>
        )}
      </div>

      <AddFoodModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        mealType={mealType}
        weeklyPlanId={weeklyPlanId}
        dayOfWeek={dayOfWeek}
        existingFoodCount={foods.length}
        onFoodAdded={onFoodSwapped}
      />

      <RecipeDialog
        isOpen={recipeOpen}
        onClose={() => setRecipeOpen(false)}
        mealType={mealType}
        foods={foods.map(f => ({ name: f.name, portion: f.portion, categoryName: f.categoryName }))}
      />

      {selectedFood && (
        <FoodSwapModal
          isOpen={swapModalOpen}
          onClose={() => setSwapModalOpen(false)}
          currentFood={{
            id: selectedFood.foodId,
            name: selectedFood.name,
            portion: selectedFood.portion,
            calories: selectedFood.calories,
            mealFoodId: selectedFood.mealFoodId,
            standardPortionG: selectedFood.standardPortionG
          }}
          mealType={mealType as 'colazione' | 'spuntino_mattutino' | 'pranzo' | 'spuntino_pomeridiano' | 'cena'}
          weeklyPlanId={weeklyPlanId}
          dayOfWeek={dayOfWeek}
          onSwapComplete={onFoodSwapped}
        />
      )}
    </>
  );
}
