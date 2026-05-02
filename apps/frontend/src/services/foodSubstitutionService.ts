import { apiRequest } from '@/api/client';
import type { SubstituteOption } from '@strength-sight/shared';

export type { SubstituteOption };

export async function getSubstitutes(
  currentFoodId: string,
  currentPortion: number,
  mealType: string,
  weeklyPlanId: string
): Promise<SubstituteOption[]> {
  try {
    const params = new URLSearchParams({
      foodId: currentFoodId,
      portion: String(currentPortion),
      mealType,
      planId: weeklyPlanId,
    });
    return await apiRequest<SubstituteOption[]>(`/api/diet/substitutes?${params}`);
  } catch (error) {
    console.error('Error getting substitutes:', error);
    return [];
  }
}
