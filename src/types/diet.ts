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

// ============================================================
// Diet Adherence Tracking
// ============================================================

/**
 * Snapshot di un singolo alimento consumato, salvato dentro foods_eaten (JSONB).
 * Usiamo uno snapshot invece di FK perché il piano può cambiare nel tempo
 * e i log storici devono rimanere coerenti.
 */
export interface LoggedFoodItem {
  food_id: string;
  name: string;          // snapshot del nome al momento del log
  portion_g: number;    // grammi effettivamente consumati (può differire dal piano)
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fats_g?: number;
}

/**
 * Riga della tabella diet_daily_logs.
 * Rappresenta un singolo pasto consumato in una data specifica.
 */
export interface DietDailyLog {
  id: string;
  user_id: string;
  /** Formato ISO 8601 senza ora: 'YYYY-MM-DD' */
  log_date: string;
  meal_type: 'colazione' | 'pranzo' | 'cena';
  foods_eaten: LoggedFoodItem[];
  /** Totali calcolati dal servizio e persistiti per query veloci */
  total_kcal?: number | null;
  total_protein?: number | null;
  total_carbs?: number | null;
  total_fats?: number | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Payload per salvare/aggiornare un pasto consumato.
 * user_id viene aggiunto dal servizio (non richiesto al chiamante).
 */
export interface SaveDietLogPayload {
  log_date: string;
  meal_type: 'colazione' | 'pranzo' | 'cena';
  foods_eaten: LoggedFoodItem[];
  notes?: string;
}

/**
 * Riepilogo dell'aderenza per un singolo giorno.
 * planned = pasti presenti nel piano per quel giorno_della_settimana
 * logged  = pasti effettivamente loggati per quella data
 */
export interface DayAdherence {
  date: string;           // 'YYYY-MM-DD'
  day_of_week: number;    // 0 = Lunedì … 6 = Domenica
  planned_meals: number;
  logged_meals: number;
  /** Percentuale 0-100. null se planned_meals === 0 */
  adherence_pct: number | null;
}

/**
 * Riepilogo dell'aderenza per un'intera settimana.
 */
export interface WeekAdherence {
  /** Prima data della settimana (Lunedì), formato 'YYYY-MM-DD' */
  week_start: string;
  days: DayAdherence[];
  total_planned: number;
  total_logged: number;
  /** Percentuale globale della settimana. null se total_planned === 0 */
  weekly_adherence_pct: number | null;
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
