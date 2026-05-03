import { supabase } from '@/integrations/supabase/client';
import type { Food } from '@/types/diet';

export interface SubstituteOption {
  foodId: string;
  name: string;
  baseAmount: number;
  calculatedAmount: number;
  caloriesApprox?: number;
  category?: string;
}

function inferCategory(name: string): string {
  const lower = name.toLowerCase();
  if (['gamberi', 'cozze', 'calamari', 'polpo', 'vongole', 'totani', 'seppie', 'frutti di mare'].some(k => lower.includes(k)))
    return 'Frutti di Mare';
  if (['merluzzo', 'sogliola', 'branzino', 'orata', 'tonno', 'salmone', 'sgombro', 'pesce', 'platessa', 'nasello', 'palombo', 'razza', 'cernia', 'trota', 'scorfano', 'aringhe', 'sardine'].some(k => lower.includes(k)))
    return 'Pesce';
  if (['pollo', 'tacchino', 'coniglio', 'vitello', 'manzo', 'maiale', 'hamburger', 'bresaola', 'carne'].some(k => lower.includes(k)))
    return 'Carne';
  return '';
}

/**
 * Get food substitutes based on food_equivalences table
 * Shows alternatives from the same substitution group(s) that are used in the same meal type
 * with proportional gram calculation. Supports foods in multiple groups.
 */
export async function getSubstitutes(
  currentFoodId: string,
  currentPortion: number,
  _mealType: string,
  _weeklyPlanId: string,
  _foodsMap?: Map<string, Food>
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

    // Get alternatives in any of the substitution groups
    const { data: alternatives, error: altError } = await supabase
      .from('food_equivalences')
      .select(`
        food_id,
        base_quantity_g,
        foods (
          id,
          name,
          calories_approx
        )
      `)
      .in('group_id', groupIds);

    if (altError) {
      console.error('DEBUG: Alternative query error:', altError);
      throw altError;
    }
    console.log('DEBUG: Alternatives found:', alternatives);
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

        const foodName = food?.name || 'Unknown';
        return {
          foodId: alt.food_id,
          name: foodName,
          baseAmount,
          calculatedAmount,
          caloriesApprox: food?.calories_approx,
          category: inferCategory(foodName)
        };
      })
      .sort((a, b) => (a.caloriesApprox || 0) - (b.caloriesApprox || 0));

    return substitutes;
  } catch (error) {
    console.error('Error getting substitutes:', error);
    return [];
  }
}
