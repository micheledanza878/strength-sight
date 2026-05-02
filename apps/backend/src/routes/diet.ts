import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabase } from '../supabase.js';
import { verifyAuth } from '../middleware/auth.js';
import type { DayView, DayMealView, SubstituteOption } from '@strength-sight/shared';

export default async function dietRoutes(fastify: FastifyInstance) {
  fastify.get('/weekly-plan', { preHandler: verifyAuth }, async (request, reply) => {
    const userId = (request as any).userId;

    const { data: existing } = await supabase
      .from('diet_weekly_plans')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existing) return reply.send(existing);

    const { data: newPlan, error } = await supabase
      .from('diet_weekly_plans')
      .insert({ user_id: userId })
      .select()
      .single();

    if (error) return reply.code(500).send({ error: error.message });
    return reply.send(newPlan);
  });

  fastify.get('/day', { preHandler: verifyAuth }, async (request, reply) => {
    const { planId, day } = request.query as { planId: string; day: string };
    const dayOfWeek = Number(day);

    const { data: meals, error: mealsError } = await supabase
      .from('diet_meals')
      .select('*')
      .eq('weekly_plan_id', planId)
      .eq('day_of_week', dayOfWeek);

    if (mealsError) return reply.code(500).send({ error: mealsError.message });
    if (!meals || meals.length === 0) return reply.send({ dayOfWeek, meals: [] });

    const mealIds = meals.map((m) => m.id);

    const [mealFoodsResult, foodsInMealsResult] = await Promise.all([
      supabase.from('diet_meal_foods').select('*').in('meal_id', mealIds),
      supabase.from('diet_meal_foods').select('food_id').in('meal_id', mealIds),
    ]);

    const mealFoods = mealFoodsResult.data || [];
    const foodIds = [...new Set((foodsInMealsResult.data || []).map((mf) => mf.food_id))];

    const [foodsResult, categoriesResult] = await Promise.all([
      foodIds.length > 0 ? supabase.from('foods').select('*').in('id', foodIds) : { data: [] },
      supabase.from('food_categories').select('*'),
    ]);

    const foods = foodsResult.data || [];
    const categories = categoriesResult.data || [];
    const foodMap = new Map(foods.map((f) => [f.id, f]));
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    const mealTypeOrder: Record<string, number> = { colazione: 0, pranzo: 1, cena: 2 };
    meals.sort((a, b) => (mealTypeOrder[a.meal_type] ?? 999) - (mealTypeOrder[b.meal_type] ?? 999));

    const dayMealViews: DayMealView[] = meals.map((meal) => {
      const mealFoodsForMeal = mealFoods
        .filter((mf) => mf.meal_id === meal.id)
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

      return {
        mealId: meal.id,
        mealType: meal.meal_type,
        foods: mealFoodsForMeal.map((mealFood) => {
          const food = foodMap.get(mealFood.food_id);
          const category = food ? categoryMap.get(food.category_id) : null;
          return {
            foodId: mealFood.food_id,
            mealFoodId: mealFood.id,
            name: food?.name || 'Unknown',
            categoryName: category?.name || 'Unknown',
            categoryColor: category?.color || '#999999',
            portion: mealFood.portion_size_g,
            standardPortionG: food?.standard_portion_g || 100,
            calories: food?.calories_approx,
          };
        }),
      };
    });

    const result: DayView = { dayOfWeek, meals: dayMealViews };
    return reply.send(result);
  });

  fastify.get('/substitutes', { preHandler: verifyAuth }, async (request, reply) => {
    const { foodId, portion, mealType, planId } = request.query as {
      foodId: string; portion: string; mealType: string; planId: string;
    };
    const currentPortion = Number(portion);

    const [currentFoodResult, foodGroupsResult] = await Promise.all([
      supabase.from('foods').select('id, standard_portion_g').eq('id', foodId).single(),
      supabase.from('food_equivalences').select('group_id').eq('food_id', foodId),
    ]);

    if (currentFoodResult.error || !currentFoodResult.data) return reply.send([]);
    if (foodGroupsResult.error || !foodGroupsResult.data?.length) return reply.send([]);

    const groupIds = foodGroupsResult.data.map((fg) => fg.group_id);
    const currentFood = currentFoodResult.data;

    const { data: mealsOfType } = await supabase
      .from('diet_meals')
      .select('id')
      .eq('weekly_plan_id', planId)
      .eq('meal_type', mealType);

    if (!mealsOfType?.length) return reply.send([]);

    const mealIds = mealsOfType.map((m) => m.id);
    const { data: foodsInMeals } = await supabase
      .from('diet_meal_foods')
      .select('food_id')
      .in('meal_id', mealIds);

    const foodIds = (foodsInMeals || []).map((mf) => mf.food_id);
    if (!foodIds.length) return reply.send([]);

    const { data: alternatives } = await supabase
      .from('food_equivalences')
      .select('food_id, base_quantity_g, foods:food_id(id, name, calories_approx)')
      .in('group_id', groupIds)
      .in('food_id', foodIds);

    if (!alternatives?.length) return reply.send([]);

    const substitutes: SubstituteOption[] = alternatives
      .filter((alt) => alt.food_id !== foodId)
      .map((alt) => {
        const food = alt.foods as any;
        const calculatedAmount = Math.round((currentPortion / currentFood.standard_portion_g) * alt.base_quantity_g);
        return {
          foodId: alt.food_id,
          name: food?.name || 'Unknown',
          baseAmount: alt.base_quantity_g,
          calculatedAmount,
          caloriesApprox: food?.calories_approx,
        };
      })
      .sort((a, b) => (a.caloriesApprox || 0) - (b.caloriesApprox || 0));

    return reply.send(substitutes);
  });

  fastify.patch('/meal-foods/:id', { preHandler: verifyAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ food_id: z.string().uuid(), portion_size_g: z.number() }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues });

    const { data, error } = await supabase
      .from('diet_meal_foods')
      .update({ food_id: body.data.food_id, portion_size_g: body.data.portion_size_g, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return reply.code(500).send({ error: error.message });
    return reply.send(data);
  });

  fastify.delete('/meal-foods/:id', { preHandler: verifyAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { error } = await supabase.from('diet_meal_foods').delete().eq('id', id);
    if (error) return reply.code(500).send({ error: error.message });
    return reply.send({ success: true });
  });

  fastify.post('/meals', { preHandler: verifyAuth }, async (request, reply) => {
    const body = z.object({
      weekly_plan_id: z.string().uuid(),
      day_of_week: z.number().int().min(0).max(6),
      meal_type: z.enum(['colazione', 'pranzo', 'cena']),
    }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues });

    const { data, error } = await supabase
      .from('diet_meals')
      .insert(body.data)
      .select()
      .single();

    if (error) return reply.code(500).send({ error: error.message });
    return reply.code(201).send(data);
  });

  fastify.post('/meal-foods', { preHandler: verifyAuth }, async (request, reply) => {
    const body = z.object({
      meal_id: z.string().uuid(),
      food_id: z.string().uuid(),
      portion_size_g: z.number(),
      order_index: z.number().int().nonnegative().optional(),
    }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues });

    const { data, error } = await supabase
      .from('diet_meal_foods')
      .insert(body.data)
      .select()
      .single();

    if (error) return reply.code(500).send({ error: error.message });
    return reply.code(201).send(data);
  });

  fastify.get('/food-alternatives', { preHandler: verifyAuth }, async (request, reply) => {
    const { foodId, mealType, planId } = request.query as { foodId: string; mealType: string; planId: string };

    const { data: currentFood } = await supabase.from('foods').select('category_id').eq('id', foodId).single();
    if (!currentFood) return reply.send([]);

    const { data: mealsOfType } = await supabase
      .from('diet_meals')
      .select('id')
      .eq('weekly_plan_id', planId)
      .eq('meal_type', mealType);

    if (!mealsOfType?.length) return reply.send([]);

    const mealIds = mealsOfType.map((m) => m.id);
    const { data: foodsInMeals } = await supabase.from('diet_meal_foods').select('food_id').in('meal_id', mealIds);
    const foodIds = (foodsInMeals || []).map((mf) => mf.food_id);
    if (!foodIds.length) return reply.send([]);

    const { data: alternatives } = await supabase
      .from('foods')
      .select('*')
      .eq('category_id', currentFood.category_id)
      .neq('id', foodId)
      .in('id', foodIds)
      .order('calories_approx', { ascending: true });

    return reply.send(alternatives || []);
  });
}
