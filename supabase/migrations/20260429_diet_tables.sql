-- Diet Management System Tables (Minimalista)

-- 1. Food Categories
CREATE TABLE food_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(7),
  order_index INT,
  created_at TIMESTAMP DEFAULT now()
);

-- 2. Foods (Alimenti database)
CREATE TABLE foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES food_categories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  standard_portion_g DECIMAL(6,1) NOT NULL,
  calories_approx INT,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(name, category_id)
);

CREATE INDEX idx_foods_category ON foods(category_id);

-- 3. Weekly Plan (una sola per utente, rimane sempre la stessa)
CREATE TABLE diet_weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_diet_weekly_plans_user ON diet_weekly_plans(user_id);

-- 4. Meals (7 giorni × 3 pasti = 21 rows per piano)
CREATE TABLE diet_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_plan_id UUID NOT NULL REFERENCES diet_weekly_plans(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  meal_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(weekly_plan_id, day_of_week, meal_type)
);

CREATE INDEX idx_diet_meals_weekly_plan ON diet_meals(weekly_plan_id);

-- 5. Meal Foods (Ingredienti nel pasto)
CREATE TABLE diet_meal_foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES diet_meals(id) ON DELETE CASCADE,
  food_id UUID NOT NULL REFERENCES foods(id),
  portion_size_g DECIMAL(6,1) NOT NULL,
  order_index INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_diet_meal_foods_meal ON diet_meal_foods(meal_id);
CREATE INDEX idx_diet_meal_foods_food ON diet_meal_foods(food_id);

-- Enable RLS
ALTER TABLE food_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE foods DISABLE ROW LEVEL SECURITY;

ALTER TABLE diet_weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE diet_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE diet_meal_foods ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own weekly plans" ON diet_weekly_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly plans" ON diet_weekly_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly plans" ON diet_weekly_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own meals" ON diet_meals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM diet_weekly_plans
      WHERE diet_weekly_plans.id = diet_meals.weekly_plan_id
      AND diet_weekly_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own meals" ON diet_meals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM diet_weekly_plans
      WHERE diet_weekly_plans.id = diet_meals.weekly_plan_id
      AND diet_weekly_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own meals" ON diet_meals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM diet_weekly_plans
      WHERE diet_weekly_plans.id = diet_meals.weekly_plan_id
      AND diet_weekly_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own meal foods" ON diet_meal_foods
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM diet_meals
      JOIN diet_weekly_plans ON diet_weekly_plans.id = diet_meals.weekly_plan_id
      WHERE diet_meals.id = diet_meal_foods.meal_id
      AND diet_weekly_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own meal foods" ON diet_meal_foods
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM diet_meals
      JOIN diet_weekly_plans ON diet_weekly_plans.id = diet_meals.weekly_plan_id
      WHERE diet_meals.id = diet_meal_foods.meal_id
      AND diet_weekly_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own meal foods" ON diet_meal_foods
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM diet_meals
      JOIN diet_weekly_plans ON diet_weekly_plans.id = diet_meals.weekly_plan_id
      WHERE diet_meals.id = diet_meal_foods.meal_id
      AND diet_weekly_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own meal foods" ON diet_meal_foods
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM diet_meals
      JOIN diet_weekly_plans ON diet_weekly_plans.id = diet_meals.weekly_plan_id
      WHERE diet_meals.id = diet_meal_foods.meal_id
      AND diet_weekly_plans.user_id = auth.uid()
    )
  );

-- Insert default categories (based on Michele Danza's plan)
INSERT INTO food_categories (name, color, order_index) VALUES
  ('Carboidrati', '#F97316', 1),
  ('Carni Bianche', '#EF4444', 2),
  ('Pesce Magro', '#3B82F6', 3),
  ('Pesce Grasso', '#06B6D4', 4),
  ('Verdure', '#10B981', 5),
  ('Latticini', '#F59E0B', 6),
  ('Uova', '#A16207', 7),
  ('Grassi Sani', '#EC4899', 8),
  ('Frutta', '#8B5CF6', 9)
ON CONFLICT (name) DO NOTHING;
