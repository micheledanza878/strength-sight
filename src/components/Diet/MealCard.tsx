import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft } from 'lucide-react';
import { MEAL_TYPES } from '@/types/diet';
import { FoodSwapModal } from './FoodSwapModal';

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

export function MealCard({
  mealId,
  mealType,
  foods,
  onFoodSwapped,
  weeklyPlanId,
  dayOfWeek
}: MealCardProps) {
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<MealCardProps['foods'][0] | null>(null);

  const totalCalories = foods.reduce((sum, f) => sum + (f.calories || 0), 0);
  const mealTypeLabel = MEAL_TYPES[mealType as keyof typeof MEAL_TYPES] || mealType;

  function handleOpenSwapModal(food: MealCardProps['foods'][0]) {
    setSelectedFood(food);
    setSwapModalOpen(true);
  }

  return (
    <>
      <div className="bg-card rounded-2xl overflow-hidden border border-border">
        <div className="bg-muted/50 px-4 py-3 border-b border-border">
          <h3 className="font-semibold">
            {mealTypeLabel}
          </h3>
          {totalCalories > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalCalories} kcal totali
            </p>
          )}
        </div>

        <div className="space-y-2 p-4">
          {foods.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessun alimento assegnato
            </p>
          ) : (
            foods.map((food) => (
              <div
                key={food.mealFoodId}
                className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: food.categoryColor }}
                    />
                    <p className="font-medium">
                      {food.name}
                    </p>
                  </div>
                  <div className="mt-1 flex items-center gap-3">
                    <p className="text-xs text-muted-foreground">
                      {food.portion}g
                    </p>
                    <span className="text-xs text-muted-foreground/60">
                      •
                    </span>
                    <p className="text-xs font-medium text-muted-foreground">
                      {food.categoryName}
                    </p>
                    {food.calories && (
                      <>
                        <span className="text-xs text-muted-foreground/60">
                          •
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {food.calories} kcal
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenSwapModal(food)}
                  className="ml-2 h-8 w-8 p-0"
                  title="Scambia alimento"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

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
          mealType={mealType as 'colazione' | 'pranzo' | 'cena'}
          weeklyPlanId={weeklyPlanId}
          dayOfWeek={dayOfWeek}
          onSwapComplete={onFoodSwapped}
        />
      )}
    </>
  );
}
