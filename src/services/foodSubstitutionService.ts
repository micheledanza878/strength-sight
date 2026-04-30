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
 * Get food substitutes based on food_equivalences table
 * Shows alternatives from the same substitution group(s) that are used in the same meal type
 * with proportional gram calculation. Supports foods in multiple groups.
 */
export async function getSubstitutes(
  currentFoodId: string,
  currentPortion: number,
  mealType: string,
  weeklyPlanId: string,
  foodsMap?: Map<string, Food>
): Promise<SubstituteOption[]> {
  try {
    // Get current food
    const { data: currentFood, error: currentFoodError } = await supabase
      .from('foods')
      .select('id, standard_portion_g')
      .eq('id', currentFoodId)
      .single();

    if (currentFoodError) throw currentFoodError;
    if (!currentFood) {
      console.warn('Food not found:', currentFoodId);
      return [];
    }

    // Get all groups this food belongs to via food_equivalences
    const { data: foodGroups, error: groupsError } = await supabase
      .from('food_equivalences')
      .select('group_id')
      .eq('food_id', currentFoodId);

    if (groupsError) throw groupsError;
    if (!foodGroups || foodGroups.length === 0) {
      console.warn('Food has no substitution groups:', currentFoodId);
      return [];
    }

    const groupIds = foodGroups.map(fg => fg.group_id);

    // Get all meals of this type in the weekly plan
    const { data: mealsOfType, error: mealsError } = await supabase
      .from('diet_meals')
      .select('id')
      .eq('weekly_plan_id', weeklyPlanId)
      .eq('meal_type', mealType);

    if (mealsError) throw mealsError;
    if (!mealsOfType || mealsOfType.length === 0) return [];

    const mealIds = mealsOfType.map(m => m.id);

    // Get all foods used in these meals of the same meal type
    const { data: foodsInMeals, error: foodsError } = await supabase
      .from('diet_meal_foods')
      .select('food_id')
      .in('meal_id', mealIds);

    if (foodsError) throw foodsError;

    const foodIds = foodsInMeals?.map(mf => mf.food_id) || [];
    if (foodIds.length === 0) return [];

    // Get alternatives in any of the substitution groups that are used in this meal type
    // Join foods with food_equivalences to get base_quantity_g for each food in the group
    const { data: alternatives, error: altError } = await supabase
      .from('food_equivalences')
      .select(`
        food_id,
        base_quantity_g,
        foods:food_id (
          id,
          name,
          calories_approx
        )
      `)
      .in('group_id', groupIds)
      .in('food_id', foodIds);

    if (altError) throw altError;
    if (!alternatives || alternatives.length === 0) return [];

    // Filter out current food and calculate portions
    const substitutes: SubstituteOption[] = alternatives
      .filter(alt => alt.food_id !== currentFoodId)
      .map((alt) => {
        const food = alt.foods as any;
        const baseAmount = alt.base_quantity_g;

        // Proportional calculation: (currentPortion / currentStandardPortion) * alternativeBaseAmount
        const calculatedAmount = Math.round(
          (currentPortion / currentFood.standard_portion_g) * baseAmount
        );

        return {
          foodId: alt.food_id,
          name: food?.name || 'Unknown',
          baseAmount,
          calculatedAmount,
          caloriesApprox: food?.calories_approx
        };
      })
      .sort((a, b) => (a.caloriesApprox || 0) - (b.caloriesApprox || 0));

    return substitutes;
  } catch (error) {
    console.error('Error getting substitutes:', error);
    return [];
  }
}
