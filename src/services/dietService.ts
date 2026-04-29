import { supabase } from '@/integrations/supabase/client';
import {
  DietWeeklyPlan,
  DietWeeklyPlanWithMeals,
  DietMeal,
  DietMealFood,
  DayView,
  DayMealView,
  Food,
  FoodCategory
} from '@/types/diet';

/**
 * Get or create weekly plan for user
 */
export async function getOrCreateWeeklyPlan(
  userId: string
): Promise<DietWeeklyPlan> {
  // First, try to get existing plan
  const { data: existingPlan } = await supabase
    .from('diet_weekly_plans')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (existingPlan) {
    return existingPlan;
  }

  // Create new plan if none exists
  const { data: newPlan, error } = await supabase
    .from('diet_weekly_plans')
    .insert({
      user_id: userId
    })
    .select()
    .single();

  if (error) throw error;
  return newPlan;
}

/**
 * Get full weekly plan with all meals and foods
 */
export async function getWeeklyPlanWithMeals(
  weeklyPlanId: string
): Promise<DietWeeklyPlanWithMeals> {
  const { data, error } = await supabase
    .from('diet_weekly_plans')
    .select(`
      *,
      diet_meals (
        *,
        diet_meal_foods (
          *,
          foods (
            *,
            food_categories (*)
          )
        )
      )
    `)
    .eq('id', weeklyPlanId)
    .single();

  if (error) throw error;
  return data as DietWeeklyPlanWithMeals;
}

/**
 * Get single day view
 */
export async function getDayView(
  weeklyPlanId: string,
  dayOfWeek: number
): Promise<DayView> {
  const { data: meals, error } = await supabase
    .from('diet_meals')
    .select(`
      *,
      diet_meal_foods (
        *,
        foods (
          *,
          food_categories (*)
        )
      )
    `)
    .eq('weekly_plan_id', weeklyPlanId)
    .eq('day_of_week', dayOfWeek)
    .order('meal_type', { ascending: true });

  if (error) throw error;

  const dayMealViews: DayMealView[] = meals.map((meal: any) => ({
    mealId: meal.id,
    mealType: meal.meal_type,
    foods: meal.diet_meal_foods
      .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
      .map((mealFood: any) => ({
        foodId: mealFood.food_id,
        mealFoodId: mealFood.id,
        name: mealFood.foods.name,
        categoryName: mealFood.foods.food_categories.name,
        categoryColor: mealFood.foods.food_categories.color,
        portion: mealFood.portion_size_g,
        calories: mealFood.foods.calories_approx
      }))
  }));

  return {
    dayOfWeek,
    meals: dayMealViews
  };
}

/**
 * Get food alternatives in same category
 */
export async function getFoodAlternatives(
  currentFoodId: string
): Promise<Food[]> {
  // First get current food to know its category
  const { data: currentFood, error: foodError } = await supabase
    .from('foods')
    .select('category_id')
    .eq('id', currentFoodId)
    .single();

  if (foodError) throw foodError;

  // Get all foods in same category, ordered by calories
  const { data: alternatives, error: altError } = await supabase
    .from('foods')
    .select('*')
    .eq('category_id', currentFood.category_id)
    .neq('id', currentFoodId)
    .order('calories_approx', { ascending: true });

  if (altError) throw altError;
  return alternatives || [];
}

/**
 * Swap food in meal
 */
export async function swapFoodInMeal(
  mealFoodId: string,
  newFoodId: string,
  newPortionSize: number
): Promise<DietMealFood> {
  const { data, error } = await supabase
    .from('diet_meal_foods')
    .update({
      food_id: newFoodId,
      portion_size_g: newPortionSize,
      updated_at: new Date().toISOString()
    })
    .eq('id', mealFoodId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Add food to meal
 */
export async function addFoodToMeal(
  mealId: string,
  foodId: string,
  portionSize: number,
  orderIndex: number
): Promise<DietMealFood> {
  const { data, error } = await supabase
    .from('diet_meal_foods')
    .insert({
      meal_id: mealId,
      food_id: foodId,
      portion_size_g: portionSize,
      order_index: orderIndex
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Remove food from meal
 */
export async function removeFoodFromMeal(
  mealFoodId: string
): Promise<void> {
  const { error } = await supabase
    .from('diet_meal_foods')
    .delete()
    .eq('id', mealFoodId);

  if (error) throw error;
}

/**
 * Get all food categories with foods
 */
export async function getFoodCategories(): Promise<FoodCategory[]> {
  const { data, error } = await supabase
    .from('food_categories')
    .select('*')
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get foods by category
 */
export async function getFoodsByCategory(
  categoryId: string
): Promise<Food[]> {
  const { data, error } = await supabase
    .from('foods')
    .select('*')
    .eq('category_id', categoryId)
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Create meal for specific day
 */
export async function createMeal(
  weeklyPlanId: string,
  dayOfWeek: number,
  mealType: string
): Promise<DietMeal> {
  const { data, error } = await supabase
    .from('diet_meals')
    .insert({
      weekly_plan_id: weeklyPlanId,
      day_of_week: dayOfWeek,
      meal_type: mealType
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
