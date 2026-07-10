import { useEffect, useState, useCallback } from 'react';
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
import {
  getFoodCategories,
  getFoodsByCategory,
  getOrCreateMeal,
  addFoodToMeal
} from '@/services/dietService';
import type { Food, FoodCategory } from '@/types/diet';

interface AddFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  mealType: string;
  weeklyPlanId?: string;
  dayOfWeek?: number;
  /** Number of foods already in the meal, used to compute order_index. */
  existingFoodCount: number;
  onFoodAdded: () => void;
}

export function AddFoodModal({
  isOpen,
  onClose,
  mealType,
  weeklyPlanId,
  dayOfWeek,
  existingFoodCount,
  onFoodAdded
}: AddFoodModalProps) {
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [foods, setFoods] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [portion, setPortion] = useState<number>(0);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingFoods, setLoadingFoods] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const cats = await getFoodCategories();
      setCategories(cats);
      if (cats.length > 0) {
        setActiveCategory(cats[0].id);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  const loadFoods = useCallback(async (categoryId: string) => {
    setLoadingFoods(true);
    try {
      const list = await getFoodsByCategory(categoryId);
      setFoods(list);
    } catch (error) {
      console.error('Error loading foods:', error);
      setFoods([]);
    } finally {
      setLoadingFoods(false);
    }
  }, []);

  // Reset and load categories when opening
  useEffect(() => {
    if (isOpen) {
      setSelectedFood(null);
      setPortion(0);
      loadCategories();
    }
  }, [isOpen, loadCategories]);

  // Load foods when active category changes
  useEffect(() => {
    if (isOpen && activeCategory) {
      loadFoods(activeCategory);
    }
  }, [isOpen, activeCategory, loadFoods]);

  function handleSelectFood(food: Food) {
    setSelectedFood(food);
    setPortion(food.standard_portion_g || 100);
  }

  async function handleAdd() {
    if (!selectedFood || !weeklyPlanId || dayOfWeek === undefined) return;

    setSaving(true);
    try {
      const meal = await getOrCreateMeal(weeklyPlanId, dayOfWeek, mealType);
      await addFoodToMeal(
        meal.id,
        selectedFood.id,
        portion || selectedFood.standard_portion_g || 100,
        existingFoodCount + 1
      );
      onFoodAdded();
      onClose();
    } catch (error) {
      console.error('Error adding food:', error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Aggiungi Alimento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loadingCategories ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Category tabs */}
              {categories.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setActiveCategory(cat.id);
                        setSelectedFood(null);
                      }}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        activeCategory === cat.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Food list */}
              <ScrollArea className="h-56">
                <div className="space-y-2 pr-4">
                  {loadingFoods ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : foods.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground">
                      Nessun alimento in questa categoria
                    </p>
                  ) : (
                    foods.map((food) => (
                      <button
                        key={food.id}
                        onClick={() => handleSelectFood(food)}
                        className={`w-full rounded-lg border-2 p-3 text-left transition-colors ${
                          selectedFood?.id === food.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <p className="font-medium">{food.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {food.standard_portion_g}g
                          {food.calories_approx ? ` · ${food.calories_approx} kcal` : ''}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Portion input */}
              {selectedFood && (
                <div className="rounded-lg bg-primary/10 p-3">
                  <label className="text-sm font-medium text-primary">
                    Grammatura per {selectedFood.name}
                  </label>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={portion}
                      onChange={(e) => setPortion(parseInt(e.target.value) || 0)}
                      className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                    <span className="text-sm text-muted-foreground">grammi</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annulla
          </Button>
          <Button onClick={handleAdd} disabled={!selectedFood || portion <= 0 || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {saving ? 'Aggiungendo...' : 'Aggiungi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
