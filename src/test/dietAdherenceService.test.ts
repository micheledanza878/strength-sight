/**
 * dietAdherenceService.test.ts
 *
 * Testa la logica di business di dietAdherenceService:
 *   - saveDietLog: verifica che i totali nutrizionali siano calcolati
 *     correttamente prima dell'upsert (e che l'upsert venga chiamato).
 *   - getWeeklyAdherence: scenari 100%, 0%, parziale e piano assente.
 *
 * Il client Supabase è mockato con vi.mock — nessuna chiamata reale al DB.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock di Supabase
// ---------------------------------------------------------------------------

/**
 * Oggetto di mock per la catena fluente di Supabase (.from().upsert()...).
 * I singoli test sovrascrivono `mockResolvedValue` per simulare diversi scenari.
 */
const mockSingle = vi.fn();
const mockSelect = vi.fn(() => ({ single: mockSingle }));
const mockUpsert = vi.fn(() => ({ select: mockSelect }));

const mockMaybeSingle = vi.fn();
const mockSelectPlan = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockEqPlan = vi.fn(() => ({ maybeSingle: mockMaybeSingle })); // ultimo .eq

// Catena per diet_meals: .select().eq()
const mockMealsData = vi.fn();
const mockEqMeals = vi.fn(() => ({ data: null, error: null }));
const mockSelectMeals = vi.fn(() => ({ eq: mockEqMeals }));

// Catena per getLogsInRange: .select().eq().eq().gte().lte().order().order()
const mockLogsChain = {
  data: [] as unknown[],
  error: null as unknown,
};

/**
 * Factory che costruisce la catena fluente di query:
 * ogni metodo ritorna `this` finché non si arriva all'await implicito,
 * che viene intercettato da una Promise.
 */
const buildLogsChain = (data: unknown[], error: unknown = null) => {
  const chain: Record<string, unknown> = {};
  const terminal = { data, error };
  ["select", "eq", "gte", "lte", "order"].forEach((m) => {
    chain[m] = vi.fn(() => chain);
  });
  // L'ultimo .order() deve essere awaitable: lo rendiamo thenabile
  (chain as { then: (resolve: (v: unknown) => void) => void }).then = (
    resolve: (v: unknown) => void
  ) => Promise.resolve(terminal).then(resolve);
  return chain;
};

// Supabase mock principale: intercetta .from() e smista per tabella
const mockFrom = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mockFrom,
  },
}));

// ---------------------------------------------------------------------------
// Import dei moduli da testare (DOPO il mock)
// ---------------------------------------------------------------------------

import { saveDietLog, getWeeklyAdherence } from "@/services/dietAdherenceService";
import type { LoggedFoodItem, DietDailyLog, DietMeal } from "@/types/diet";

// ---------------------------------------------------------------------------
// Helper: costruisce un LoggedFoodItem con valori espliciti
// ---------------------------------------------------------------------------

function makeFood(overrides: Partial<LoggedFoodItem> = {}): LoggedFoodItem {
  return {
    food_id: "food-1",
    name: "Pollo",
    portion_g: 150,
    calories: 200,
    protein_g: 30,
    carbs_g: 0,
    fats_g: 5,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// saveDietLog
// ---------------------------------------------------------------------------

describe("saveDietLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calcola i totali nutrizionali e chiama upsert con i valori corretti", async () => {
    const savedRecord: Partial<DietDailyLog> = {
      id: "log-1",
      user_id: "user-1",
      log_date: "2026-06-19",
      meal_type: "pranzo",
      foods_eaten: [],
      total_kcal: 400,
      total_protein: 60,
      total_carbs: 10,
      total_fats: 8,
    };

    // Configura la catena di mock per questa chiamata
    mockSingle.mockResolvedValue({ data: savedRecord, error: null });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockUpsert.mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ upsert: mockUpsert });

    const foods: LoggedFoodItem[] = [
      makeFood({ calories: 200, protein_g: 30, carbs_g: 5,  fats_g: 4 }),
      makeFood({ calories: 200, protein_g: 30, carbs_g: 5,  fats_g: 4 }),
    ];

    await saveDietLog("user-1", {
      log_date: "2026-06-19",
      meal_type: "pranzo",
      foods_eaten: foods,
    });

    // Verifica che upsert sia stato chiamato una volta
    expect(mockUpsert).toHaveBeenCalledOnce();

    // Estrai il primo argomento passato a upsert (il payload)
    const upsertPayload = mockUpsert.mock.calls[0][0] as Record<string, unknown>;

    // I totali devono corrispondere alla somma degli alimenti
    expect(upsertPayload.total_kcal).toBe(400);
    expect(upsertPayload.total_protein).toBe(60);
    expect(upsertPayload.total_carbs).toBe(10);
    expect(upsertPayload.total_fats).toBe(8);
    expect(upsertPayload.user_id).toBe("user-1");
    expect(upsertPayload.log_date).toBe("2026-06-19");
  });

  it("azzera i totali se foods_eaten è vuoto (pasto loggato senza alimenti)", async () => {
    const savedRecord: Partial<DietDailyLog> = {
      id: "log-2",
      user_id: "user-1",
      log_date: "2026-06-19",
      meal_type: "colazione",
      foods_eaten: [],
      total_kcal: 0,
    };

    mockSingle.mockResolvedValue({ data: savedRecord, error: null });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockUpsert.mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ upsert: mockUpsert });

    await saveDietLog("user-1", {
      log_date: "2026-06-19",
      meal_type: "colazione",
      foods_eaten: [],
    });

    const upsertPayload = mockUpsert.mock.calls[0][0] as Record<string, unknown>;
    expect(upsertPayload.total_kcal).toBe(0);
    expect(upsertPayload.total_protein).toBe(0);
    expect(upsertPayload.total_carbs).toBe(0);
    expect(upsertPayload.total_fats).toBe(0);
  });

  it("lancia un errore se Supabase restituisce un errore", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "DB offline" } });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockUpsert.mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ upsert: mockUpsert });

    await expect(
      saveDietLog("user-1", {
        log_date: "2026-06-19",
        meal_type: "cena",
        foods_eaten: [makeFood()],
      })
    ).rejects.toThrow("DB offline");
  });
});

// ---------------------------------------------------------------------------
// getWeeklyAdherence
// ---------------------------------------------------------------------------

/**
 * Configura mockFrom per orchestrare più tabelle nella stessa chiamata:
 *   - diet_weekly_plans → restituisce un piano (o null)
 *   - diet_meals        → restituisce i pasti pianificati
 *   - diet_daily_logs   → restituisce i log effettivi (via getLogsInRange)
 *
 * `mockFrom` smista in base al nome della tabella.
 */
function setupAdherenceMocks({
  planId,
  plannedMeals,
  logs,
}: {
  planId: string | null;
  plannedMeals: Partial<DietMeal>[];
  logs: Partial<DietDailyLog>[];
}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "diet_weekly_plans") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: planId ? { id: planId } : null,
                error: null,
              }),
          }),
        }),
      };
    }

    if (table === "diet_meals") {
      return {
        select: () => ({
          eq: () =>
            Promise.resolve({ data: plannedMeals, error: null }),
        }),
      };
    }

    if (table === "diet_daily_logs") {
      // Catena: .select().eq().eq().gte().lte().order().order()
      // Usiamo una catena fluente dove l'ultimo .order() è awaitable.
      const terminal = { data: logs, error: null };
      const chain: Record<string, unknown> = {};
      const methods = ["select", "eq", "gte", "lte", "order"];
      methods.forEach((m) => {
        chain[m] = vi.fn(() => chain);
      });
      // Override ultimo .order con un thenabile per intercettare l'await
      (chain as { then: (...args: unknown[]) => Promise<unknown> }).then = (
        ...args: Parameters<Promise<unknown>["then"]>
      ) => Promise.resolve(terminal).then(...args);
      return chain;
    }

    return {};
  });
}

describe("getWeeklyAdherence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("restituisce weekly_adherence_pct=100 quando tutti i pasti pianificati sono loggati", async () => {
    // Piano: 3 pasti al Lunedì (dow=0) — usiamo 2026-06-15 che è Lunedì
    const referenceDate = "2026-06-15";

    setupAdherenceMocks({
      planId: "plan-1",
      plannedMeals: [
        { day_of_week: 0, meal_type: "colazione" },
        { day_of_week: 0, meal_type: "pranzo" },
        { day_of_week: 0, meal_type: "cena" },
      ],
      // 3 log per il Lunedì
      logs: [
        { log_date: referenceDate, meal_type: "colazione" },
        { log_date: referenceDate, meal_type: "pranzo" },
        { log_date: referenceDate, meal_type: "cena" },
      ],
    });

    const result = await getWeeklyAdherence("user-1", referenceDate);

    expect(result.total_planned).toBe(3);
    expect(result.total_logged).toBe(3);
    expect(result.weekly_adherence_pct).toBe(100);

    // Il giorno Lunedì deve avere aderenza 100%
    const monday = result.days[0];
    expect(monday.adherence_pct).toBe(100);
    expect(monday.day_of_week).toBe(0);
  });

  it("restituisce weekly_adherence_pct=0 se l'utente non ha loggato nulla", async () => {
    setupAdherenceMocks({
      planId: "plan-1",
      plannedMeals: [
        { day_of_week: 0, meal_type: "colazione" },
        { day_of_week: 0, meal_type: "pranzo" },
      ],
      logs: [], // nessun log
    });

    const result = await getWeeklyAdherence("user-1", "2026-06-15");

    expect(result.total_logged).toBe(0);
    expect(result.weekly_adherence_pct).toBe(0);
    expect(result.days[0].adherence_pct).toBe(0);
  });

  it("calcola aderenza parziale correttamente (1 su 2 pasti loggati = 50%)", async () => {
    setupAdherenceMocks({
      planId: "plan-1",
      plannedMeals: [
        { day_of_week: 0, meal_type: "colazione" },
        { day_of_week: 0, meal_type: "pranzo" },
      ],
      logs: [
        { log_date: "2026-06-15", meal_type: "colazione" }, // solo colazione
      ],
    });

    const result = await getWeeklyAdherence("user-1", "2026-06-15");

    expect(result.total_planned).toBe(2);
    expect(result.total_logged).toBe(1);
    expect(result.weekly_adherence_pct).toBe(50);
    expect(result.days[0].adherence_pct).toBe(50);
  });

  it("restituisce weekly_adherence_pct=null se non esiste nessun piano", async () => {
    setupAdherenceMocks({
      planId: null, // nessun piano
      plannedMeals: [],
      logs: [],
    });

    const result = await getWeeklyAdherence("user-1", "2026-06-15");

    expect(result.total_planned).toBe(0);
    expect(result.weekly_adherence_pct).toBeNull();
    // Tutti i giorni devono avere adherence_pct null (nessun pasto pianificato)
    result.days.forEach((day) => {
      expect(day.adherence_pct).toBeNull();
    });
  });

  it("i log extra rispetto ai pasti pianificati non superano il 100% (clamp)", async () => {
    // Piano: 1 pasto il Lunedì; l'utente ne logga 3 (spuntini extra)
    setupAdherenceMocks({
      planId: "plan-1",
      plannedMeals: [{ day_of_week: 0, meal_type: "colazione" }],
      logs: [
        { log_date: "2026-06-15", meal_type: "colazione" },
        { log_date: "2026-06-15", meal_type: "pranzo" },  // extra
        { log_date: "2026-06-15", meal_type: "cena" },    // extra
      ],
    });

    const result = await getWeeklyAdherence("user-1", "2026-06-15");

    // logged viene "clampato" a planned (Math.min)
    expect(result.total_planned).toBe(1);
    expect(result.total_logged).toBe(1);
    expect(result.weekly_adherence_pct).toBe(100);
  });

  it("restituisce sempre 7 giorni nell'array days", async () => {
    setupAdherenceMocks({ planId: null, plannedMeals: [], logs: [] });

    const result = await getWeeklyAdherence("user-1", "2026-06-15");

    expect(result.days).toHaveLength(7);
    // day_of_week va da 0 (Lunedì) a 6 (Domenica) in ordine
    result.days.forEach((day, idx) => {
      expect(day.day_of_week).toBe(idx);
    });
  });

  it("week_start è sempre il Lunedì della settimana di referenceDate", async () => {
    setupAdherenceMocks({ planId: null, plannedMeals: [], logs: [] });

    // 2026-06-17 è Mercoledì → il Lunedì è 2026-06-15
    const result = await getWeeklyAdherence("user-1", "2026-06-17");

    expect(result.week_start).toBe("2026-06-15");
  });
});
