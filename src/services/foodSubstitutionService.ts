import { supabase } from '@/integrations/supabase/client';
import type { Food } from '@/types/diet';

export interface SubstituteOption {
  foodId: string;
  name: string;
  baseAmount: number;
  calculatedAmount: number;
  caloriesApprox?: number;
}

/**
 * Get food substitutes for a specific food in a meal type
 * Shows alternatives from the same category used in the same meal type
 * with proportional gram calculation
 */
export async function getSubstitutes(
  currentFoodId: string,
  currentPortion: number,
  mealType: string,
  weeklyPlanId: string,
  foodsMap?: Map<string, Food>
): Promise<SubstituteOption[]> {
  try {
    // Get current food details
    const { data: currentFood, error: currentFoodError } = await supabase
      .from('foods')
      .select('category_id, standard_portion_g')
      .eq('id', currentFoodId)
      .single();

    if (currentFoodError) throw currentFoodError;
    if (!currentFood) return [];

    // Get all meals of this type in the weekly plan
    const { data: mealsOfType, error: mealsError } = await supabase
      .from('diet_meals')
      .select('id')
      .eq('weekly_plan_id', weeklyPlanId)
      .eq('meal_type', mealType);

    if (mealsError) throw mealsError;
    if (!mealsOfType || mealsOfType.length === 0) return [];

    const mealIds = mealsOfType.map(m => m.id);

    // Get all foods used in these meals
    const { data: foodsInMeals, error: foodsError } = await supabase
      .from('diet_meal_foods')
      .select('food_id')
      .in('meal_id', mealIds);

    if (foodsError) throw foodsError;

    const foodIds = foodsInMeals?.map(mf => mf.food_id) || [];
    if (foodIds.length === 0) return [];

    // Get alternatives in the same category
    const { data: alternatives, error: altError } = await supabase
      .from('foods')
      .select('*')
      .eq('category_id', currentFood.category_id)
      .neq('id', currentFoodId)
      .in('id', foodIds)
      .order('calories_approx', { ascending: true });

    if (altError) throw altError;
    if (!alternatives) return [];

    // Calculate proportional portions for each alternative
    const substitutes: SubstituteOption[] = alternatives.map((food) => {
      const baseAmount = food.standard_portion_g;
      // Proportional calculation: maintain the ratio
      const calculatedAmount = Math.round(
        (currentPortion / currentFood.standard_portion_g) * baseAmount
      );

      return {
        foodId: food.id,
        name: food.name,
        baseAmount,
        calculatedAmount,
        caloriesApprox: food.calories_approx
      };
    });

    return substitutes;
  } catch (error) {
    console.error('Error getting substitutes:', error);
    return [];
  }
}
