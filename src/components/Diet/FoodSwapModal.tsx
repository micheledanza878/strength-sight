import { useEffect, useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { Food } from '@/types/diet';
import { swapFoodInMeal, getDayView } from '@/services/dietService';
import { getSubstitutes, type SubstituteOption } from '@/services/foodSubstitutionService';

interface FoodSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFood: {
    id: string;
    name: string;
    portion: number;
    calories?: number;
    mealFoodId: string;
  };
  mealType: 'colazione' | 'pranzo' | 'cena';
  weeklyPlanId?: string;
  dayOfWeek?: number;
  onSwapComplete: () => void;
}

export function FoodSwapModal({
  isOpen,
  onClose,
  currentFood,
  mealType,
  weeklyPlanId,
  dayOfWeek,
  onSwapComplete
}: FoodSwapModalProps) {
  const [alternatives, setAlternatives] = useState<SubstituteOption[]>([]);
  const [selectedAlternative, setSelectedAlternative] = useState<SubstituteOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [foodsMap, setFoodsMap] = useState<Map<string, Food>>(new Map());

  useEffect(() => {
    if (isOpen) {
      loadAlternatives();
    }
  }, [isOpen, currentFood.id, mealType]);

  async function loadAlternatives() {
    setLoading(true);
    try {
      // Load all food data if we have plan info
      let foodMap = foodsMap;
      if (weeklyPlanId && dayOfWeek !== undefined) {
        try {
          const dayView = await getDayView(weeklyPlanId, dayOfWeek);
          // Build food map from day view
          const tempMap = new Map<string, Food>();
          dayView.meals.forEach(meal => {
            meal.foods.forEach(food => {
              if (!tempMap.has(food.foodId)) {
                // We don't have full Food objects here, but we can use what we have
                tempMap.set(food.foodId, {
                  id: food.foodId,
                  name: food.name,
                  category_id: '', // Will be populated if needed
                  standard_portion_g: food.portion,
                  calories_approx: food.calories
                });
              }
            });
          });
          foodMap = tempMap;
          setFoodsMap(foodMap);
        } catch (err) {
          console.warn('Could not load day view for food map:', err);
        }
      }

      // Calculate substitutes using proportional logic
      const alts = getSubstitutes(currentFood.id, currentFood.portion, mealType, foodMap);
      setAlternatives(alts);
      setSelectedAlternative(null);
    } catch (error) {
      console.error('Error loading alternatives:', error);
      setAlternatives([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSwap() {
    if (!selectedAlternative) return;

    setSwapping(true);
    try {
      await swapFoodInMeal(
        currentFood.mealFoodId,
        selectedAlternative.foodId,
        selectedAlternative.calculatedAmount
      );
      onSwapComplete();
      onClose();
    } catch (error) {
      console.error('Error swapping food:', error);
    } finally {
      setSwapping(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Scambia Alimento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current food */}
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">
              Stai sostituendo:
            </p>
            <p className="font-semibold">
              {currentFood.name} {currentFood.portion}g
            </p>
            {currentFood.calories && (
              <p className="text-xs text-muted-foreground">
                ({currentFood.calories} kcal)
              </p>
            )}
          </div>

          {/* Alternatives list */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-2 pr-4">
                {alternatives.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground">
                    Nessuna alternativa disponibile
                  </p>
                ) : (
                  alternatives.map((alt) => (
                    <button
                      key={alt.foodId}
                      onClick={() => setSelectedAlternative(alt)}
                      className={`w-full rounded-lg border-2 p-3 text-left transition-colors ${
                        selectedAlternative?.foodId === alt.foodId
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div>
                        <p className="font-medium">
                          {alt.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {alt.calculatedAmount}g
                          {alt.calculatedAmount !== alt.baseAmount && (
                            <span className="ml-2 text-xs">
                              (base: {alt.baseAmount}g)
                            </span>
                          )}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          )}

          {selectedAlternative && (
            <div className="rounded-lg bg-primary/10 p-3 text-sm text-primary">
              ✓ Selezionato: <strong>{selectedAlternative.name}</strong> ({selectedAlternative.calculatedAmount}g)
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={swapping}
          >
            Annulla
          </Button>
          <Button
            onClick={handleSwap}
            disabled={!selectedAlternative || swapping}
          >
            {swapping && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {swapping ? 'Scambiando...' : 'Conferma Scambio'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
