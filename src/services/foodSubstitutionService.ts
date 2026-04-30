/**
 * Food Substitution Service - Client-side calculation logic
 * Implements proportional quantity calculation to maintain macronutrients
 */

import { Food } from '@/types/diet';
import {
  findGroupByFoodId,
  SubstitutionGroup,
  getGroupsForMealType
} from '@/data/foodSubstitutionGroups';

export interface SubstituteOption {
  foodId: string;
  name: string;
  calculatedAmount: number;
  baseAmount: number;
}

/**
 * Get food substitutes with proportionally calculated quantities
 * Maintains macronutrient balance by scaling based on current consumption vs base quantity
 *
 * @param currentFoodId - ID of the food to be replaced
 * @param currentQuantityInGrams - Current portion size in grams
 * @param mealType - Type of meal (colazione, pranzo, cena) to ensure group isolation
 * @param foodsMap - Map of food data for name/calorie lookups
 * @returns Array of substitute options with calculated quantities
 */
export function getSubstitutes(
  currentFoodId: string,
  currentQuantityInGrams: number,
  mealType: 'colazione' | 'pranzo' | 'cena',
  foodsMap: Map<string, Food>
): SubstituteOption[] {
  // 1. Find the group containing the current food
  const currentGroup = findGroupByFoodId(currentFoodId);
  if (!currentGroup) {
    console.warn(`No substitution group found for food: ${currentFoodId}`);
    return [];
  }

  // 2. Verify meal type is allowed for this group
  if (!currentGroup.mealTypes.includes(mealType)) {
    console.warn(
      `Food ${currentFoodId} cannot be substituted in ${mealType} meals`
    );
    return [];
  }

  // 3. Find the equivalence entry for current food
  const currentEquivalence = currentGroup.equivalences.find(
    eq => eq.foodId === currentFoodId
  );
  if (!currentEquivalence) {
    console.warn(`Food not found in its group: ${currentFoodId}`);
    return [];
  }

  // 4. Filter alternatives from the same group, excluding current food
  const siblings = currentGroup.equivalences.filter(
    eq => eq.foodId !== currentFoodId
  );

  // 5. Calculate proportional quantities maintaining macronutrient balance
  // Formula: (currentQuantity / currentBaseQuantity) * siblingBaseQuantity
  const ratio = currentQuantityInGrams / currentEquivalence.baseQuantityG;

  return siblings
    .map(sibling => {
      const foodData = foodsMap.get(sibling.foodId);
      if (!foodData) {
        console.warn(`Food data not found for: ${sibling.foodId}`);
        return null;
      }

      const calculatedAmount = Math.round(ratio * sibling.baseQuantityG);

      return {
        foodId: sibling.foodId,
        name: foodData.name,
        calculatedAmount,
        baseAmount: sibling.baseQuantityG
      };
    })
    .filter((opt): opt is SubstituteOption => opt !== null);
}

/**
 * Validate if a food substitution is allowed
 * Checks that both foods belong to the same group and meal type allows substitution
 *
 * @param fromFoodId - Source food ID
 * @param toFoodId - Target food ID
 * @param mealType - Current meal type
 * @returns true if substitution is allowed
 */
export function isSubstitutionAllowed(
  fromFoodId: string,
  toFoodId: string,
  mealType: 'colazione' | 'pranzo' | 'cena'
): boolean {
  const fromGroup = findGroupByFoodId(fromFoodId);
  const toGroup = findGroupByFoodId(toFoodId);

  // Both foods must be in groups
  if (!fromGroup || !toGroup) return false;

  // Must be in the same group
  if (fromGroup.id !== toGroup.id) return false;

  // Meal type must be allowed for this group
  if (!fromGroup.mealTypes.includes(mealType)) return false;

  return true;
}

/**
 * Check if a food has available substitutes
 *
 * @param foodId - Food ID to check
 * @param mealType - Current meal type
 * @returns true if at least one substitute is available
 */
export function hasSubstitutes(
  foodId: string,
  mealType: 'colazione' | 'pranzo' | 'cena'
): boolean {
  const group = findGroupByFoodId(foodId);
  if (!group || !group.mealTypes.includes(mealType)) return false;

  // Has substitutes if group has more than one equivalence
  return group.equivalences.length > 1;
}

/**
 * Get the substitution group for a food
 */
export function getSubstitutionGroup(foodId: string): SubstitutionGroup | undefined {
  return findGroupByFoodId(foodId);
}
