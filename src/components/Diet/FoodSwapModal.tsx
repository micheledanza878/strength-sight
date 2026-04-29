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
                  alternatives.map((food) => (
                    <button
                      key={food.id}
                      onClick={() => setSelectedFood(food)}
                      className={`w-full rounded-lg border-2 p-3 text-left transition-colors ${
                        selectedFood?.id === food.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {food.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {food.standard_portion_g}g
                          </p>
                        </div>
                        {food.calories_approx && (
                          <div className="text-right">
                            <p className="text-sm font-semibold">
                              {food.calories_approx}
                            </p>
                            <p className="text-xs text-muted-foreground">
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
            <div className="rounded-lg bg-primary/10 p-3 text-sm text-primary">
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
