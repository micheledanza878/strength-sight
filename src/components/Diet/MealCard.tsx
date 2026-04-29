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
    calories?: number;
  }[];
  onFoodSwapped: () => void;
}

export function MealCard({
  mealId,
  mealType,
  foods,
  onFoodSwapped
}: MealCardProps) {
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<any>(null);

  const totalCalories = foods.reduce((sum, f) => sum + (f.calories || 0), 0);
  const mealTypeLabel = MEAL_TYPES[mealType as keyof typeof MEAL_TYPES] || mealType;

  function handleOpenSwapModal(food: any) {
    setSelectedFood(food);
    setSwapModalOpen(true);
  }

  return (
    <>
      <Card className="overflow-hidden border-slate-200 dark:border-slate-700">
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 dark:from-slate-800 dark:to-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            {mealTypeLabel}
          </h3>
          {totalCalories > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {totalCalories} kcal totali
            </p>
          )}
        </div>

        <div className="space-y-2 p-4">
          {foods.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Nessun alimento assegnato
            </p>
          ) : (
            foods.map((food) => (
              <div
                key={food.mealFoodId}
                className="flex items-center justify-between rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: food.categoryColor }}
                    />
                    <p className="font-medium text-slate-900 dark:text-white">
                      {food.name}
                    </p>
                  </div>
                  <div className="mt-1 flex items-center gap-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {food.portion}g
                    </p>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      •
                    </span>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      {food.categoryName}
                    </p>
                    {food.calories && (
                      <>
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          •
                        </span>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
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
      </Card>

      {selectedFood && (
        <FoodSwapModal
          isOpen={swapModalOpen}
          onClose={() => setSwapModalOpen(false)}
          currentFood={{
            id: selectedFood.foodId,
            name: selectedFood.name,
            portion: selectedFood.portion,
            calories: selectedFood.calories,
            mealFoodId: selectedFood.mealFoodId
          }}
          onSwapComplete={onFoodSwapped}
        />
      )}
    </>
  );
}
