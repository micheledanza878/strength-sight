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
  // Fetch meals
  const { data: meals, error: mealsError } = await supabase
    .from('diet_meals')
    .select('*')
    .eq('weekly_plan_id', weeklyPlanId)
    .eq('day_of_week', dayOfWeek);

  if (mealsError) throw mealsError;
  if (!meals || meals.length === 0) {
    return { dayOfWeek, meals: [] };
  }

  // Fetch meal foods for these meals
  const mealIds = meals.map(m => m.id);
  const { data: mealFoods, error: foodsError } = await supabase
    .from('diet_meal_foods')
    .select('*')
    .in('meal_id', mealIds);

  if (foodsError) throw foodsError;

  // Fetch all food details
  const foodIds = mealFoods?.map(mf => mf.food_id) || [];
  const { data: foods, error: foodDetailsError } = await supabase
    .from('foods')
    .select('*')
    .in('id', foodIds);

  if (foodDetailsError) throw foodDetailsError;

  // Fetch food categories
  const categoryIds = foods?.map(f => f.category_id) || [];
  const { data: categories, error: categoriesError } = await supabase
    .from('food_categories')
    .select('*')
    .in('id', categoryIds);

  if (categoriesError) throw categoriesError;

  // Build maps for easy lookup
  const foodMap = new Map(foods?.map(f => [f.id, f]) || []);
  const categoryMap = new Map(categories?.map(c => [c.id, c]) || []);

  // Construct day view
  const dayMealViews: DayMealView[] = meals.map((meal: any) => {
    const mealFoodsForMeal = (mealFoods || [])
      .filter(mf => mf.meal_id === meal.id)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    return {
      mealId: meal.id,
      mealType: meal.meal_type,
      foods: mealFoodsForMeal
        .map((mealFood: any) => {
          const food = foodMap.get(mealFood.food_id);
          const category = food ? categoryMap.get(food.category_id) : null;

          return {
            foodId: mealFood.food_id,
            mealFoodId: mealFood.id,
            name: food?.name || 'Unknown',
            categoryName: category?.name || 'Unknown',
            categoryColor: category?.color || '#999999',
            portion: mealFood.portion_size_g,
            calories: food?.calories_approx
          };
        })
    };
  });

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
