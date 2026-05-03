import { supabase } from '@/integrations/supabase/client';

export interface FoodGuideItem {
  foodId: string;
  name: string;
  baseQuantityG: number;
}

export interface FoodGuideGroup {
  groupId: string;
  groupName: string;
  foods: FoodGuideItem[];
}

export async function getFoodGuide(): Promise<FoodGuideGroup[]> {
  const { data, error } = await supabase
    .from('food_equivalences')
    .select(`
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
    const group = row.substitution_groups as any;
    const food = row.foods as any;
    if (!group || !food) continue;

    if (!groupMap.has(row.group_id)) {
      groupMap.set(row.group_id, {
        groupId: row.group_id,
        groupName: group.name,
        foods: [],
      });
    }

    groupMap.get(row.group_id)!.foods.push({
      foodId: food.id,
      name: food.name,
      baseQuantityG: row.base_quantity_g,
    });
  }

  return Array.from(groupMap.values());
}
