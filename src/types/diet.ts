// Diet Types

export interface FoodCategory {
  id: string;
  name: string;
  color?: string;
  order_index?: number;
  created_at?: string;
}

export interface Food {
  id: string;
  category_id: string;
  name: string;
  standard_portion_g: number;
  calories_approx?: number;
  created_at?: string;
}

export interface DietWeeklyPlan {
  id: string;
  user_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface DietMeal {
  id: string;
  weekly_plan_id: string;
  day_of_week: number; // 0 = Monday, 6 = Sunday
  meal_type: 'colazione' | 'pranzo' | 'cena';
  created_at?: string;
  updated_at?: string;
}

export interface DietMealFood {
  id: string;
  meal_id: string;
  food_id: string;
  portion_size_g: number;
  order_index?: number;
  created_at?: string;
  updated_at?: string;
}

// Extended types with relations
export interface DietMealWithFoods extends DietMeal {
  diet_meal_foods: (DietMealFood & {
    foods: Food & {
      food_categories: FoodCategory;
    };
  })[];
}

export interface DietWeeklyPlanWithMeals extends DietWeeklyPlan {
  diet_meals: DietMealWithFoods[];
}

// Day view (what user sees)
export interface DayMealView {
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
}

export interface DayView {
  dayOfWeek: number;
  meals: DayMealView[];
}

// Constants
export const DAYS_OF_WEEK = [
  'Lunedì',
  'Martedì',
  'Mercoledì',
  'Giovedì',
  'Venerdì',
  'Sabato',
  'Domenica'
];

export const MEAL_TYPES = {
  colazione: 'Colazione',
  pranzo: 'Pranzo',
  cena: 'Cena'
};
