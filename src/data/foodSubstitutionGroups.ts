/**
 * Food Substitution Groups - Isolated groups by meal type
 * Implements the V4 architecture with exclusive groups for breakfast vs lunch/dinner
 */

export interface FoodEquivalence {
  foodId: string;
  baseQuantityG: number;
}

export interface SubstitutionGroup {
  id: string;
  name: string;
  mealTypes: ('colazione' | 'pranzo' | 'cena')[];
  equivalences: FoodEquivalence[];
}

/**
 * Breakfast-exclusive groups (☀️)
 */
export const BREAKFAST_GROUPS: SubstitutionGroup[] = [
  {
    id: 'breakfast_proteins',
    name: 'Proteine Colazione',
    mealTypes: ['colazione'],
    equivalences: [
      { foodId: 'food_yogurt_greco', baseQuantityG: 150 },
      { foodId: 'food_protein_powder', baseQuantityG: 25 },
      { foodId: 'food_yogurt_hi_pro', baseQuantityG: 160 },
      { foodId: 'food_latte_proteico', baseQuantityG: 200 }
    ]
  },
  {
    id: 'breakfast_carbs',
    name: 'Carboidrati Colazione',
    mealTypes: ['colazione'],
    equivalences: [
      { foodId: 'food_cereali', baseQuantityG: 30 },
      { foodId: 'food_fette_biscottate', baseQuantityG: 40 },
      { foodId: 'food_fiocchi_avena', baseQuantityG: 40 }
    ]
  },
  {
    id: 'breakfast_snacks_fats',
    name: 'Grassi/Snack Colazione',
    mealTypes: ['colazione'],
    equivalences: [
      { foodId: 'food_frutta_secca', baseQuantityG: 10 },
      { foodId: 'food_burro_arachidi', baseQuantityG: 10 },
      { foodId: 'food_cioccolato_fondente', baseQuantityG: 15 }
    ]
  }
];

/**
 * Lunch/Dinner-exclusive groups (🍽️)
 */
export const LUNCH_DINNER_GROUPS: SubstitutionGroup[] = [
  {
    id: 'main_carbs',
    name: 'Carboidrati Principali',
    mealTypes: ['pranzo', 'cena'],
    equivalences: [
      { foodId: 'food_pasta', baseQuantityG: 100 },
      { foodId: 'food_riso', baseQuantityG: 100 },
      { foodId: 'food_quinoa', baseQuantityG: 100 },
      { foodId: 'food_pane', baseQuantityG: 130 },
      { foodId: 'food_patate', baseQuantityG: 470 },
      { foodId: 'food_gallette', baseQuantityG: 90 }
    ]
  },
  {
    id: 'white_meat_lean_fish',
    name: 'Carne Bianca e Pesce Magro',
    mealTypes: ['pranzo', 'cena'],
    equivalences: [
      { foodId: 'food_pollo', baseQuantityG: 150 },
      { foodId: 'food_tacchino', baseQuantityG: 150 },
      { foodId: 'food_merluzzo', baseQuantityG: 200 },
      { foodId: 'food_sogliola', baseQuantityG: 200 },
      { foodId: 'food_orata', baseQuantityG: 200 },
      { foodId: 'food_frutti_mare', baseQuantityG: 300 }
    ]
  },
  {
    id: 'red_meat_fatty_fish',
    name: 'Carne Rossa e Pesce Grasso',
    mealTypes: ['pranzo', 'cena'],
    equivalences: [
      { foodId: 'food_manzo', baseQuantityG: 100 },
      { foodId: 'food_maiale_magro', baseQuantityG: 100 },
      { foodId: 'food_salmone', baseQuantityG: 100 },
      { foodId: 'food_sgombro', baseQuantityG: 100 }
    ]
  },
  {
    id: 'legumes',
    name: 'Legumi',
    mealTypes: ['pranzo', 'cena'],
    equivalences: [
      { foodId: 'food_legumi_secchi', baseQuantityG: 40 },
      { foodId: 'food_legumi_cotti', baseQuantityG: 120 },
      { foodId: 'food_legumi_surgelati', baseQuantityG: 120 }
    ]
  },
  {
    id: 'cheeses',
    name: 'Formaggi',
    mealTypes: ['pranzo', 'cena'],
    equivalences: [
      { foodId: 'food_formaggio_stagionato', baseQuantityG: 100 },
      { foodId: 'food_mozzarella', baseQuantityG: 150 },
      { foodId: 'food_feta', baseQuantityG: 130 },
      { foodId: 'food_crescenza', baseQuantityG: 130 },
      { foodId: 'food_ricotta', baseQuantityG: 250 }
    ]
  },
  {
    id: 'eggs_alternatives',
    name: 'Uova e Alternative',
    mealTypes: ['pranzo', 'cena'],
    equivalences: [
      { foodId: 'food_uova', baseQuantityG: 150 },
      { foodId: 'food_tofu', baseQuantityG: 125 },
      { foodId: 'food_pesce_grasso', baseQuantityG: 100 }
    ]
  },
  {
    id: 'condiments_fats',
    name: 'Condimenti e Grassi',
    mealTypes: ['pranzo', 'cena'],
    equivalences: [
      { foodId: 'food_olio', baseQuantityG: 10 },
      { foodId: 'food_burro', baseQuantityG: 10 },
      { foodId: 'food_maionese', baseQuantityG: 15 },
      { foodId: 'food_grana', baseQuantityG: 20 },
      { foodId: 'food_pesto', baseQuantityG: 20 },
      { foodId: 'food_avocado', baseQuantityG: 50 },
      { foodId: 'food_olive', baseQuantityG: 50 }
    ]
  }
];

/**
 * Universal group (🌍) - Available in all meals
 */
export const UNIVERSAL_GROUP: SubstitutionGroup = {
  id: 'universal_fruits',
  name: 'Frutta',
  mealTypes: ['colazione', 'pranzo', 'cena'],
  equivalences: [
    { foodId: 'food_albicocche', baseQuantityG: 190 },
    { foodId: 'food_anguria', baseQuantityG: 350 },
    { foodId: 'food_banana', baseQuantityG: 110 },
    { foodId: 'food_mela', baseQuantityG: 180 },
    { foodId: 'food_fragole', baseQuantityG: 270 },
    { foodId: 'food_arance', baseQuantityG: 150 },
    { foodId: 'food_kiwi', baseQuantityG: 100 }
  ]
};

/**
 * All groups combined for lookup
 */
export const ALL_SUBSTITUTION_GROUPS: SubstitutionGroup[] = [
  ...BREAKFAST_GROUPS,
  ...LUNCH_DINNER_GROUPS,
  UNIVERSAL_GROUP
];

/**
 * Create a map of foodId -> groupId for quick lookup
 */
export function createFoodToGroupMap(): Map<string, string> {
  const map = new Map<string, string>();
  ALL_SUBSTITUTION_GROUPS.forEach(group => {
    group.equivalences.forEach(eq => {
      map.set(eq.foodId, group.id);
    });
  });
  return map;
}

/**
 * Find the substitution group for a given food ID
 */
export function findGroupByFoodId(foodId: string): SubstitutionGroup | undefined {
  return ALL_SUBSTITUTION_GROUPS.find(group =>
    group.equivalences.some(eq => eq.foodId === foodId)
  );
}

/**
 * Get allowed groups for a specific meal type
 */
export function getGroupsForMealType(
  mealType: 'colazione' | 'pranzo' | 'cena'
): SubstitutionGroup[] {
  return ALL_SUBSTITUTION_GROUPS.filter(group =>
    group.mealTypes.includes(mealType)
  );
}
