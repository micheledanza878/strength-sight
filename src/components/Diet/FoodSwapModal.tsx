import { useEffect, useState } from 'react';
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
import { getFoodAlternatives, swapFoodInMeal } from '@/services/dietService';

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
  onSwapComplete: () => void;
}

export function FoodSwapModal({
  isOpen,
  onClose,
  currentFood,
  onSwapComplete
}: FoodSwapModalProps) {
  const [alternatives, setAlternatives] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAlternatives();
    }
  }, [isOpen, currentFood.id]);

  async function loadAlternatives() {
    setLoading(true);
    try {
      const alts = await getFoodAlternatives(currentFood.id);
      setAlternatives(alts);
      setSelectedFood(null);
    } catch (error) {
      console.error('Error loading alternatives:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSwap() {
    if (!selectedFood) return;

    setSwapping(true);
    try {
      await swapFoodInMeal(
        currentFood.mealFoodId,
        selectedFood.id,
        selectedFood.standard_portion_g
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
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Stai sostituendo:
            </p>
            <p className="font-semibold text-slate-900 dark:text-white">
              {currentFood.name} {currentFood.portion}g
            </p>
            {currentFood.calories && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ({currentFood.calories} kcal)
              </p>
            )}
          </div>

          {/* Alternatives list */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-2 pr-4">
                {alternatives.length === 0 ? (
                  <p className="text-center text-sm text-slate-500">
                    Nessuna alternativa disponibile
                  </p>
                ) : (
                  alternatives.map((food) => (
                    <button
                      key={food.id}
                      onClick={() => setSelectedFood(food)}
                      className={`w-full rounded-lg border-2 p-3 text-left transition-colors ${
                        selectedFood?.id === food.id
                          ? 'border-primary bg-primary/5'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {food.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {food.standard_portion_g}g
                          </p>
                        </div>
                        {food.calories_approx && (
                          <div className="text-right">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                              {food.calories_approx}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              kcal
                            </p>
                          </div>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          )}

          {selectedFood && (
            <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900 dark:bg-blue-900/20 dark:text-blue-300">
              ✓ Selezionato: <strong>{selectedFood.name}</strong>
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
            disabled={!selectedFood || swapping}
          >
            {swapping && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {swapping ? 'Scambiando...' : 'Conferma Scambio'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
