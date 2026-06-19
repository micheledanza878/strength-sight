-- =============================================================================
-- Dashboard RPC: get_dashboard_data(p_user_id UUID)
--
-- Consolida le 6 query separate eseguite da Dashboard.tsx in una singola
-- chiamata Postgres, riducendo la latenza di rete e il numero di round-trip.
--
-- Struttura del JSON restituito:
--   {
--     "plans":                     [{ id, name, duration_weeks }],
--     "workout_logs":              [{ id, workout_day, started_at }],
--     "month_count":               <integer>,
--     "week_count":                <integer>,
--     "month_volume":              <numeric>,
--     "volume_per_session":        [{ started_at, workout_day, volume }],
--     "weekly_volume":             [{ week_label, volume }],
--     "top_prs":                   [{ exercise, weight, reps }],
--     "next_plan_day":             { id, day_number, day_name } | null,
--     "last_measurement_days_ago": <integer> | null
--   }
--
-- Sicurezza:
--   - SECURITY DEFINER con SET search_path = public previene search-path injection.
--   - Prima istruzione: verifica auth.uid() = p_user_id; se fallisce → JSON vuoto.
--   - Tutte le query filtrano esplicitamente per p_user_id (difesa in profondità).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_data(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Finestre temporali calcolate una volta sola
  v_now             TIMESTAMPTZ  := now();
  v_month_start     TIMESTAMPTZ  := date_trunc('month', v_now);
  v_month_end       TIMESTAMPTZ  := date_trunc('month', v_now) + INTERVAL '1 month' - INTERVAL '1 microsecond';
  v_week_start      TIMESTAMPTZ  := date_trunc('week', v_now);  -- ISO: lunedì
  v_56_days_ago     TIMESTAMPTZ  := v_now - INTERVAL '56 days';

  -- Accumulatori per le sezioni del JSON
  v_plans                JSON;
  v_workout_logs         JSON;
  v_month_count          INTEGER;
  v_week_count           INTEGER;
  v_month_volume         NUMERIC;
  v_volume_per_session   JSON;
  v_weekly_volume        JSON;
  v_top_prs              JSON;
  v_next_plan_day        JSON;
  v_last_meas_days_ago   INTEGER;

  -- Variabili di supporto per il calcolo del prossimo giorno del piano
  v_active_plan_id   UUID;
  v_total_days       INTEGER;
  v_last_day_name    TEXT;
  v_last_day_number  INTEGER;
  v_next_day_number  INTEGER;
BEGIN
  -- ── Guardia di sicurezza ───────────────────────────────────────────────────
  -- Restituisce JSON vuoto se la chiamata non è autenticata o l'utente non
  -- corrisponde. Non solleviamo un'eccezione per non rivelare l'esistenza
  -- dell'utente a chiamanti non autorizzati.
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN '{}'::JSON;
  END IF;

  -- ── 1. Schede di allenamento (workout_plans) ───────────────────────────────
  SELECT json_agg(
    json_build_object(
      'id',             p.id,
      'name',           p.name,
      'duration_weeks', p.duration_weeks
    )
    ORDER BY p.created_at DESC
  )
  INTO v_plans
  FROM public.workout_plans p
  WHERE p.user_id = p_user_id;

  -- ── 2. Tutti i workout_logs completati ────────────────────────────────────
  -- Il frontend usa questa lista per:
  --   - Ricostruire lo streak (scorre i giorni consecutivi)
  --   - Popolare il calendario (filtra per mese selezionato lato client)
  --   - Determinare l'ultimo allenamento (primo elemento)
  SELECT json_agg(
    json_build_object(
      'id',          l.id,
      'workout_day', l.workout_day,
      'started_at',  l.started_at
    )
    ORDER BY l.started_at DESC
  )
  INTO v_workout_logs
  FROM public.workout_logs l
  WHERE l.user_id     = p_user_id
    AND l.completed_at IS NOT NULL;

  -- ── 3. Contatori mese e settimana ─────────────────────────────────────────
  SELECT
    COUNT(*) FILTER (WHERE l.started_at >= v_month_start AND l.started_at <= v_month_end),
    COUNT(*) FILTER (WHERE l.started_at >= v_week_start)
  INTO v_month_count, v_week_count
  FROM public.workout_logs l
  WHERE l.user_id     = p_user_id
    AND l.completed_at IS NOT NULL;

  -- ── 4. Volume mensile (kg × reps nel mese corrente) ───────────────────────
  SELECT COALESCE(SUM(sl.weight * sl.reps), 0)
  INTO v_month_volume
  FROM public.set_logs sl
  WHERE sl.user_id    = p_user_id
    AND sl.created_at >= v_month_start
    AND sl.created_at <= v_month_end;

  -- ── 5. Volume per sessione — ultime 8 sessioni completate ─────────────────
  -- Restituito in ordine crescente di data: il frontend non chiama .reverse()
  -- ma semplicemente usa l'array così come arriva (già "dal meno al più recente").
  SELECT json_agg(sess ORDER BY sess.started_at ASC)
  INTO v_volume_per_session
  FROM (
    SELECT
      l.started_at,
      l.workout_day,
      COALESCE(SUM(sl.weight * sl.reps), 0) AS volume
    FROM (
      SELECT id, started_at, workout_day
      FROM public.workout_logs
      WHERE user_id     = p_user_id
        AND completed_at IS NOT NULL
      ORDER BY started_at DESC
      LIMIT 8
    ) l
    LEFT JOIN public.set_logs sl ON sl.workout_log_id = l.id
    GROUP BY l.id, l.started_at, l.workout_day
  ) sess;

  -- ── 6. Volume settimanale — ultime 8 settimane (56 giorni) ────────────────
  -- Raggruppa per settimana ISO. La label "W{n}" replica il formato usato
  -- dal frontend (getWeek di date-fns).
  SELECT json_agg(wk ORDER BY wk.year_week ASC)
  INTO v_weekly_volume
  FROM (
    SELECT
      to_char(date_trunc('week', l.started_at), 'IYYY-IW') AS year_week,
      'W' || to_char(l.started_at, 'IW')                   AS week_label,
      COALESCE(SUM(sl.weight * sl.reps), 0)                 AS volume
    FROM public.set_logs sl
    JOIN public.workout_logs l ON l.id = sl.workout_log_id
    WHERE sl.user_id      = p_user_id
      AND sl.created_at   >= v_56_days_ago
    GROUP BY year_week, week_label
    ORDER BY year_week
    LIMIT 8
  ) wk;

  -- ── 7. Top 3 PR per esercizio ─────────────────────────────────────────────
  -- Per ogni esercizio prende il set con peso massimo (a parità, reps massime),
  -- poi ordina tutti gli esercizi per peso decrescente e prende i migliori 3.
  SELECT json_agg(pr)
  INTO v_top_prs
  FROM (
    SELECT exercise, weight, reps
    FROM (
      -- DISTINCT ON restituisce una riga per exercise_name con (weight, reps) massimi
      SELECT DISTINCT ON (sl.exercise_name)
        sl.exercise_name AS exercise,
        sl.weight,
        sl.reps
      FROM public.set_logs sl
      JOIN public.workout_logs l
        ON l.id             = sl.workout_log_id
        AND l.completed_at IS NOT NULL
      WHERE sl.user_id = p_user_id
      ORDER BY sl.exercise_name, sl.weight DESC, sl.reps DESC
    ) best_per_exercise
    ORDER BY weight DESC, reps DESC
    LIMIT 3
  ) pr;

  -- ── 8. Prossimo giorno del piano (next_plan_day) ───────────────────────────
  -- Piano attivo: il workout_plans più recente dell'utente.
  -- Logica circolare: dopo l'ultimo giorno si torna al giorno 1.
  SELECT p.id
  INTO v_active_plan_id
  FROM public.workout_plans p
  WHERE p.user_id = p_user_id
  ORDER BY p.created_at DESC
  LIMIT 1;

  IF v_active_plan_id IS NOT NULL THEN
    SELECT COUNT(*)
    INTO v_total_days
    FROM public.workout_plan_days
    WHERE workout_plan_id = v_active_plan_id;

    IF v_total_days > 0 THEN
      -- Nome del giorno dell'ultimo workout completato
      SELECT l.workout_day
      INTO v_last_day_name
      FROM public.workout_logs l
      WHERE l.user_id     = p_user_id
        AND l.completed_at IS NOT NULL
      ORDER BY l.started_at DESC
      LIMIT 1;

      IF v_last_day_name IS NOT NULL THEN
        -- Numero del giorno corrispondente nel piano
        SELECT d.day_number
        INTO v_last_day_number
        FROM public.workout_plan_days d
        WHERE d.workout_plan_id = v_active_plan_id
          AND d.day_name        = v_last_day_name
        LIMIT 1;

        -- Giorno successivo (1-based, circolare)
        v_next_day_number := (COALESCE(v_last_day_number, 0) % v_total_days) + 1;
      ELSE
        -- Nessun log: inizia dal giorno 1
        v_next_day_number := 1;
      END IF;

      SELECT json_build_object(
        'id',         d.id,
        'day_number', d.day_number,
        'day_name',   d.day_name
      )
      INTO v_next_plan_day
      FROM public.workout_plan_days d
      WHERE d.workout_plan_id = v_active_plan_id
        AND d.day_number      = v_next_day_number
      LIMIT 1;
    END IF;
  END IF;

  -- ── 9. Giorni dall'ultima misurazione corporea ────────────────────────────
  SELECT (CURRENT_DATE - m.measured_at)::INTEGER
  INTO v_last_meas_days_ago
  FROM public.body_measurements m
  WHERE m.user_id = p_user_id
  ORDER BY m.measured_at DESC
  LIMIT 1;

  -- ── Assemblaggio risposta finale ───────────────────────────────────────────
  RETURN json_build_object(
    'plans',                     COALESCE(v_plans,              '[]'::JSON),
    'workout_logs',              COALESCE(v_workout_logs,       '[]'::JSON),
    'month_count',               COALESCE(v_month_count,        0),
    'week_count',                COALESCE(v_week_count,         0),
    'month_volume',              COALESCE(v_month_volume,       0),
    'volume_per_session',        COALESCE(v_volume_per_session, '[]'::JSON),
    'weekly_volume',             COALESCE(v_weekly_volume,      '[]'::JSON),
    'top_prs',                   COALESCE(v_top_prs,            '[]'::JSON),
    'next_plan_day',             v_next_plan_day,
    'last_measurement_days_ago', v_last_meas_days_ago
  );
END;
$$;

-- =============================================================================
-- Permessi
-- Solo gli utenti autenticati possono invocare la funzione.
-- SECURITY DEFINER fa girare la funzione con i permessi del proprietario,
-- ma la guardia auth.uid() = p_user_id impedisce accesso a dati altrui.
-- =============================================================================
REVOKE ALL ON FUNCTION public.get_dashboard_data(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_data(UUID) TO authenticated;

-- =============================================================================
-- Indici di supporto aggiuntivi
-- Gli indici sulle tabelle principali esistono già dalle migration precedenti.
-- Aggiungiamo quelli compositi che servono alle nuove query aggregate.
-- =============================================================================

-- Filtrare set_logs per utente + data (volume mensile e settimanale)
CREATE INDEX IF NOT EXISTS idx_set_logs_user_created
  ON public.set_logs(user_id, created_at DESC);

-- Filtrare set_logs per utente + esercizio + peso (query top PR)
CREATE INDEX IF NOT EXISTS idx_set_logs_user_exercise_weight
  ON public.set_logs(user_id, exercise_name, weight DESC, reps DESC);
