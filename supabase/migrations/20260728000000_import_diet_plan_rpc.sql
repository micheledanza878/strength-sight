-- =============================================================================
-- RPC: import_diet_plan(p_start_date DATE, p_new_foods JSONB, p_meals JSONB)
--
-- Sostituisce il flusso client multi-step di dietService.getOrCreateWeeklyPlan
-- (create weekly_plans -> create meals -> create meal_foods, in più
-- roundtrip separati) con un'unica RPC atomica, usata dal feature di import
-- dieta da PDF (estrazione AI -> conferma utente -> import).
--
-- Perché: un flusso client multi-step può fallire a metà (es. rete caduta
-- dopo aver creato il weekly_plan ma prima di inserire i pasti), lasciando
-- un piano "attivo ma vuoto" in stato incoerente. Il corpo di una funzione
-- plpgsql è già una singola transazione: se una qualunque istruzione solleva
-- un'eccezione, TUTTO il lavoro fatto finora nella funzione viene annullato
-- automaticamente (nessun COMMIT parziale, nessun piano orfano).
--
-- Parametri:
--   p_start_date  Data di inizio validità del nuovo piano settimanale.
--   p_new_foods   Array JSON di alimenti nuovi da creare in `foods` prima di
--                 poterli referenziare nei pasti:
--                   [{ temp_id: text, name: text, category_id: uuid,
--                      standard_portion_g: numeric }]
--                 `temp_id` è un identificatore lato client (non persistito)
--                 usato solo per collegare questi alimenti ai pasti nello
--                 stesso payload, tramite `new_food_temp_id`.
--   p_meals       Array JSON dei pasti del piano:
--                   [{ day_of_week: int (0-6), meal_type: text,
--                      foods: [{ food_id: uuid|null,
--                                new_food_temp_id: text|null,
--                                portion_size_g: numeric,
--                                order_index: int }] }]
--                 Per ogni alimento va valorizzato esattamente uno tra
--                 `food_id` (alimento già a catalogo) e `new_food_temp_id`
--                 (alimento nuovo, presente in p_new_foods).
--
-- Comportamento (in un'unica transazione):
--   1. Verifica auth.uid(); rifiuta se non autenticato.
--   2. Disattiva l'eventuale piano attivo dell'utente (is_active = false,
--      end_date = p_start_date - 1), replicando il modello di versioning
--      introdotto in 20260710000003_new_diet_plan_2026-07-08_and_snack_salato.sql.
--   3. Crea il nuovo diet_weekly_plans (is_active = true, end_date = null).
--   4. Upsert di ogni alimento nuovo in `foods` (idempotente rispetto a
--      UNIQUE(name, category_id): un retry non fallisce con un duplicato),
--      costruendo una mappa temp_id -> id reale.
--   5. Per ogni pasto: crea la riga diet_meals, poi per ciascun alimento del
--      pasto risolve il food_id reale (diretto o via mappa temp_id) e crea
--      la riga diet_meal_foods.
--   6. Ritorna { "plan_id": <uuid del nuovo piano> }.
--
-- Validazione input: la funzione è l'unico cancello tra i dati estratti da
-- un PDF via AI e il database, quindi valida esplicitamente e solleva
-- eccezioni leggibili (che il client può mostrare) invece di fidarsi del
-- payload o lasciare che un vincolo DB fallisca con un errore criptico.
--
-- Sicurezza:
--   - SECURITY DEFINER con SET search_path = public: necessario perché
--     `foods`/`food_categories` hanno RLS con scrittura riservata a
--     service_role (vedi 20260709000000_fix_rls_and_permissions.sql,
--     BLOCCO 5); la funzione, girando con i permessi del proprietario, può
--     comunque inserire nuovi alimenti quando servono al piano importato.
--   - Prima istruzione: risoluzione di auth.uid() con guardia esplicita.
--   - Tutte le scritture su diet_weekly_plans/diet_meals/diet_meal_foods
--     sono vincolate al v_user_id risolto da auth.uid(), mai a un user_id
--     passato dal chiamante (che non esiste come parametro apposta).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.import_diet_plan(
  p_start_date DATE,
  p_new_foods JSONB,
  p_meals JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id           UUID;
  v_plan_id           UUID;

  -- Mappa temp_id (testo) -> foods.id (testo, castato a uuid all'uso) creata
  -- durante lo step 4, consultata durante lo step 5. Un oggetto JSONB è un
  -- modo idiomatico in plpgsql per accumulare una mappa dentro un loop senza
  -- dover creare una tabella temporanea.
  v_food_map          JSONB := '{}'::jsonb;

  v_new_food          JSONB;
  v_meal              JSONB;
  v_food_entry        JSONB;

  v_meal_id           UUID;
  v_food_id           UUID;
  v_resolved_food_id  UUID;
  v_temp_id           TEXT;

  v_day_of_week       INT;
  v_meal_type         TEXT;
  v_portion           NUMERIC;
  v_order_index       INT;

  v_name              TEXT;
  v_category_id       UUID;
  v_standard_portion  NUMERIC;
BEGIN
  -- ── 1. Guardia di autenticazione ────────────────────────────────────────
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'import_diet_plan: utente non autenticato';
  END IF;

  IF p_start_date IS NULL THEN
    RAISE EXCEPTION 'import_diet_plan: p_start_date è obbligatorio';
  END IF;

  IF p_meals IS NULL OR jsonb_typeof(p_meals) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'import_diet_plan: p_meals deve essere un array JSON';
  END IF;

  IF p_new_foods IS NOT NULL AND jsonb_typeof(p_new_foods) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'import_diet_plan: p_new_foods deve essere un array JSON (o null)';
  END IF;

  -- ── 2. Disattiva l'eventuale piano attualmente attivo ───────────────────
  UPDATE public.diet_weekly_plans
  SET is_active  = false,
      end_date   = p_start_date - 1,
      updated_at = now()
  WHERE user_id   = v_user_id
    AND is_active = true;

  -- ── 3. Crea il nuovo piano settimanale ───────────────────────────────────
  INSERT INTO public.diet_weekly_plans (user_id, start_date, end_date, is_active)
  VALUES (v_user_id, p_start_date, NULL, true)
  RETURNING id INTO v_plan_id;

  -- ── 4. Upsert degli alimenti nuovi + mappa temp_id -> id reale ──────────
  IF p_new_foods IS NOT NULL THEN
    FOR v_new_food IN SELECT * FROM jsonb_array_elements(p_new_foods)
    LOOP
      v_temp_id          := v_new_food->>'temp_id';
      v_name             := v_new_food->>'name';
      v_category_id      := NULLIF(v_new_food->>'category_id', '')::uuid;
      v_standard_portion := NULLIF(v_new_food->>'standard_portion_g', '')::numeric;

      IF v_temp_id IS NULL OR length(trim(v_temp_id)) = 0 THEN
        RAISE EXCEPTION 'import_diet_plan: p_new_foods contiene un elemento senza temp_id';
      END IF;

      IF v_name IS NULL OR length(trim(v_name)) = 0 THEN
        RAISE EXCEPTION 'import_diet_plan: p_new_foods.name mancante per temp_id "%"', v_temp_id;
      END IF;

      IF v_category_id IS NULL THEN
        RAISE EXCEPTION 'import_diet_plan: p_new_foods.category_id mancante per temp_id "%"', v_temp_id;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM public.food_categories fc WHERE fc.id = v_category_id) THEN
        RAISE EXCEPTION 'import_diet_plan: category_id % non esiste (temp_id "%")', v_category_id, v_temp_id;
      END IF;

      IF v_standard_portion IS NULL OR v_standard_portion <= 0 THEN
        RAISE EXCEPTION 'import_diet_plan: standard_portion_g deve essere > 0 (temp_id "%")', v_temp_id;
      END IF;

      -- Upsert idempotente: se un alimento con lo stesso (name, category_id)
      -- esiste già, riusa quella riga invece di fallire con un duplicate key
      -- (importante per retry sicuri del client su questa stessa RPC).
      INSERT INTO public.foods (category_id, name, standard_portion_g)
      VALUES (v_category_id, v_name, v_standard_portion)
      ON CONFLICT (name, category_id) DO UPDATE SET name = EXCLUDED.name
      RETURNING id INTO v_food_id;

      v_food_map := v_food_map || jsonb_build_object(v_temp_id, v_food_id::text);
    END LOOP;
  END IF;

  -- ── 5. Pasti + alimenti per pasto ────────────────────────────────────────
  FOR v_meal IN SELECT * FROM jsonb_array_elements(p_meals)
  LOOP
    v_day_of_week := NULLIF(v_meal->>'day_of_week', '')::int;
    v_meal_type   := v_meal->>'meal_type';

    IF v_day_of_week IS NULL OR v_day_of_week < 0 OR v_day_of_week > 6 THEN
      RAISE EXCEPTION 'import_diet_plan: day_of_week deve essere un intero tra 0 e 6, ricevuto "%"', v_meal->>'day_of_week';
    END IF;

    -- Stessi valori ammessi dal CHECK constraint diet_meals_meal_type_check
    -- (20260710000002_normalize_diet_meals_meal_type.sql). Duplicato qui
    -- intenzionalmente per dare un errore leggibile prima che la constraint
    -- del DB fallisca con un messaggio meno chiaro per il chiamante.
    IF v_meal_type IS NULL OR v_meal_type NOT IN (
      'colazione', 'spuntino_mattutino', 'pranzo', 'spuntino_pomeridiano', 'cena'
    ) THEN
      RAISE EXCEPTION 'import_diet_plan: meal_type non valido: "%"', v_meal_type;
    END IF;

    INSERT INTO public.diet_meals (weekly_plan_id, day_of_week, meal_type)
    VALUES (v_plan_id, v_day_of_week, v_meal_type)
    RETURNING id INTO v_meal_id;

    IF v_meal->'foods' IS NOT NULL AND jsonb_typeof(v_meal->'foods') = 'array' THEN
      FOR v_food_entry IN SELECT * FROM jsonb_array_elements(v_meal->'foods')
      LOOP
        v_portion     := NULLIF(v_food_entry->>'portion_size_g', '')::numeric;
        v_order_index := COALESCE(NULLIF(v_food_entry->>'order_index', '')::int, 0);

        IF v_portion IS NULL OR v_portion <= 0 THEN
          RAISE EXCEPTION 'import_diet_plan: portion_size_g deve essere > 0 (giorno %, pasto "%")', v_day_of_week, v_meal_type;
        END IF;

        v_resolved_food_id := NULL;

        IF v_food_entry->>'food_id' IS NOT NULL THEN
          v_resolved_food_id := (v_food_entry->>'food_id')::uuid;

          IF NOT EXISTS (SELECT 1 FROM public.foods f WHERE f.id = v_resolved_food_id) THEN
            RAISE EXCEPTION 'import_diet_plan: food_id % non esiste (giorno %, pasto "%")', v_resolved_food_id, v_day_of_week, v_meal_type;
          END IF;

        ELSIF v_food_entry->>'new_food_temp_id' IS NOT NULL THEN
          v_temp_id := v_food_entry->>'new_food_temp_id';

          IF NOT (v_food_map ? v_temp_id) THEN
            RAISE EXCEPTION 'import_diet_plan: new_food_temp_id "%" non trovato tra p_new_foods (giorno %, pasto "%")', v_temp_id, v_day_of_week, v_meal_type;
          END IF;

          v_resolved_food_id := (v_food_map->>v_temp_id)::uuid;

        ELSE
          RAISE EXCEPTION 'import_diet_plan: ogni alimento deve avere food_id o new_food_temp_id (giorno %, pasto "%")', v_day_of_week, v_meal_type;
        END IF;

        INSERT INTO public.diet_meal_foods (meal_id, food_id, portion_size_g, order_index)
        VALUES (v_meal_id, v_resolved_food_id, v_portion, v_order_index);
      END LOOP;
    END IF;
  END LOOP;

  -- ── 6. Risposta ───────────────────────────────────────────────────────────
  RETURN json_build_object('plan_id', v_plan_id);
END;
$$;

-- =============================================================================
-- Permessi
-- Solo gli utenti autenticati possono invocare la funzione. SECURITY DEFINER
-- fa girare la funzione con i permessi del proprietario (necessario per
-- scrivere in `foods`, riservato a service_role via RLS), ma la guardia
-- auth.uid() e il fatto che ogni scrittura sia vincolata a v_user_id
-- impediscono di creare/alterare piani di altri utenti.
-- =============================================================================
REVOKE ALL ON FUNCTION public.import_diet_plan(DATE, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.import_diet_plan(DATE, JSONB, JSONB) TO authenticated;
