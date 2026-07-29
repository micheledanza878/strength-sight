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
  start_date?: string | null;
  end_date?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DietMeal {
  id: string;
  weekly_plan_id: string;
  day_of_week: number; // 0 = Monday, 6 = Sunday
  meal_type: 'colazione' | 'spuntino_mattutino' | 'pranzo' | 'spuntino_pomeridiano' | 'cena';
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
  spuntino_mattutino: 'Spuntino mattutino',
  pranzo: 'Pranzo',
  spuntino_pomeridiano: 'Spuntino pomeridiano',
  cena: 'Cena'
};

// ─── Diet PDF import (AI-assisted) ─────────────────────────────────────────
// Questi tipi sono un contratto verbatim con la risposta di successo
// dell'edge function `parse-diet-pdf` (supabase/functions/parse-diet-pdf/index.ts).
// Non rinominare/annidare campi senza aggiornare anche la funzione.

export type DietImportConfidence = 'high' | 'medium' | 'low';

export interface ParsedDietFoodItem {
  raw_name: string;
  matched_food_id: string | null;
  confidence: DietImportConfidence;
  portion_g: number;
}

export interface ParsedDietMeal {
  meal_type: keyof typeof MEAL_TYPES;
  foods: ParsedDietFoodItem[];
}

export interface ParsedDietDay {
  day_of_week: number; // 0 = Lunedì .. 6 = Domenica
  meals: ParsedDietMeal[];
}

export interface ParsedDietPlan {
  detected_format_ok: boolean;
  warnings: string[];
  days: ParsedDietDay[];
}

// ─── Diet PDF import: payload della RPC import_diet_plan ───────────────────
// Contratto verbatim con supabase/migrations/20260728000000_import_diet_plan_rpc.sql.

export interface ImportDietPlanNewFood {
  temp_id: string;
  name: string;
  category_id: string;
  standard_portion_g: number;
}

export interface ImportDietPlanMealFood {
  food_id: string | null;
  new_food_temp_id: string | null;
  portion_size_g: number;
  order_index: number;
}

export interface ImportDietPlanMeal {
  day_of_week: number;
  meal_type: keyof typeof MEAL_TYPES;
  foods: ImportDietPlanMealFood[];
}
