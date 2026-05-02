import { apiRequest } from '@/api/client';
import type {
  DietWeeklyPlan,
  DietMeal,
  DietMealFood,
  DayView,
  Food,
  FoodCategory,
} from '@strength-sight/shared';

export async function getOrCreateWeeklyPlan(_userId: string): Promise<DietWeeklyPlan> {
  return apiRequest<DietWeeklyPlan>('/api/diet/weekly-plan');
}

export async function getDayView(weeklyPlanId: string, dayOfWeek: number): Promise<DayView> {
  return apiRequest<DayView>(`/api/diet/day?planId=${weeklyPlanId}&day=${dayOfWeek}`);
}

export async function getFoodAlternatives(
  currentFoodId: string,
  mealType: string,
  weeklyPlanId: string
): Promise<Food[]> {
  return apiRequest<Food[]>(
    `/api/diet/food-alternatives?foodId=${encodeURIComponent(currentFoodId)}&mealType=${encodeURIComponent(mealType)}&planId=${encodeURIComponent(weeklyPlanId)}`
  );
}

export async function swapFoodInMeal(
  mealFoodId: string,
  newFoodId: string,
  newPortionSize: number
): Promise<DietMealFood> {
  return apiRequest<DietMealFood>(`/api/diet/meal-foods/${mealFoodId}`, {
    method: 'PATCH',
    body: JSON.stringify({ food_id: newFoodId, portion_size_g: newPortionSize }),
  });
}

export async function addFoodToMeal(
  mealId: string,
  foodId: string,
  portionSize: number,
  orderIndex: number
): Promise<DietMealFood> {
  return apiRequest<DietMealFood>('/api/diet/meal-foods', {
    method: 'POST',
    body: JSON.stringify({ meal_id: mealId, food_id: foodId, portion_size_g: portionSize, order_index: orderIndex }),
  });
}

export async function removeFoodFromMeal(mealFoodId: string): Promise<void> {
  await apiRequest(`/api/diet/meal-foods/${mealFoodId}`, { method: 'DELETE' });
}

export async function getFoodCategories(): Promise<FoodCategory[]> {
  return apiRequest<FoodCategory[]>('/api/food-categories');
}

export async function getFoodsByCategory(categoryId: string): Promise<Food[]> {
  return apiRequest<Food[]>(`/api/foods?categoryId=${encodeURIComponent(categoryId)}`);
}

export async function createMeal(
  weeklyPlanId: string,
  dayOfWeek: number,
  mealType: string
): Promise<DietMeal> {
  return apiRequest<DietMeal>('/api/diet/meals', {
    method: 'POST',
    body: JSON.stringify({ weekly_plan_id: weeklyPlanId, day_of_week: dayOfWeek, meal_type: mealType }),
  });
}
