import { supabase } from '@/integrations/supabase/client';

export interface FoodGuideItem {
  equivalenceId: string;
  foodId: string;
  name: string;
  baseQuantityG: number;
}

export interface FoodGuideGroup {
  groupId: string;
  groupName: string;
  foods: FoodGuideItem[];
}

export interface FoodOption {
  id: string;
  name: string;
}

// Macro anchor food IDs (001-021) — used only by the substitution service, not displayed
const ANCHOR_IDS = new Set(
  Array.from({ length: 21 }, (_, i) => `f0000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`)
);

export async function getFoodGuide(): Promise<FoodGuideGroup[]> {
  const { data, error } = await supabase
    .from('food_equivalences')
    .select(`
      id,
      group_id,
      base_quantity_g,
      foods ( id, name ),
      substitution_groups ( id, name )
    `)
    .order('base_quantity_g', { ascending: true });

  if (error) throw error;
  if (!data) return [];

  const groupMap = new Map<string, FoodGuideGroup>();

  for (const row of data) {
    const group = row.substitution_groups;
    const food = row.foods;
    if (!group || !food) continue;
    if (ANCHOR_IDS.has(food.id)) continue;

    if (!groupMap.has(row.group_id)) {
      groupMap.set(row.group_id, {
        groupId: row.group_id,
        groupName: group.name,
        foods: [],
      });
    }

    groupMap.get(row.group_id)!.foods.push({
      equivalenceId: row.id,
      foodId: food.id,
      name: food.name,
      baseQuantityG: row.base_quantity_g,
    });
  }

  return Array.from(groupMap.values());
}

/**
 * All foods, for the "add to group" picker in the substitution manager.
 * Excludes macro anchors — they're internal pivots, never a real alternative.
 */
export async function listAllFoods(): Promise<FoodOption[]> {
  const { data, error } = await supabase
    .from('foods')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []).filter((f) => !ANCHOR_IDS.has(f.id));
}

/**
 * Add a food to a substitution group (or update its base grams if already
 * there). Runs via a SECURITY DEFINER RPC because food_equivalences is
 * write-only for service_role at the RLS level.
 */
export async function upsertFoodEquivalence(
  groupId: string,
  foodId: string,
  baseQuantityG: number
): Promise<void> {
  const { error } = await supabase.rpc('upsert_food_equivalence', {
    p_group_id: groupId,
    p_food_id: foodId,
    p_base_quantity_g: baseQuantityG,
  });

  if (error) throw error;
}

/**
 * Remove a food from a substitution group.
 */
export async function deleteFoodEquivalence(equivalenceId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_food_equivalence', {
    p_id: equivalenceId,
  });

  if (error) throw error;
}
