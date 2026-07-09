-- =============================================================================
-- Fix RLS e permessi — remediation audit sicurezza 2026-07-09
--
-- Contesto:
--   Un audit di sola lettura sul progetto Supabase remoto (fmgchotpfkxhduaakhca)
--   ha rilevato che `list_migrations` risulta VUOTO: nessuna migration locale
--   risulta mai applicata al database remoto. Lo schema remoto esiste (creato
--   presumibilmente via SQL Editor / dashboard) ma è rimasto disallineato dai
--   file di migration nel repo, che negli anni contengono già fix corretti mai
--   arrivati in produzione.
--
--   Questa migration NON reinventa fix già scritti altrove: consolida solo i
--   pezzi mancanti o mai risolti, riusando dove possibile nomi e logica delle
--   migration esistenti.
--
-- Riferimenti alle migration esistenti nel repo (per tracciabilità):
--   - 20260428_fix_rls_child_tables.sql   → introduce le policy "allow_all"
--     originarie su workout_plan_days, workout_plan_exercises, body_parts.
--   - 20260619000000_fix_rls_child_tables.sql → sostituisce GIA' correttamente
--     le policy "allow_all" di workout_plan_days e workout_plan_exercises con
--     policy granulari per operazione basate su ownership. Non toccata qui.
--   - 20260429_diet_tables.sql → crea diet_weekly_plans/diet_meals/
--     diet_meal_foods con RLS e policy di ownership (manca però DELETE su
--     diet_weekly_plans e diet_meals) e disabilita ESPLICITAMENTE RLS su
--     food_categories/foods (scelta voluta all'epoca, qui la rivediamo).
--   - 20260430_create_substitution_groups.sql → crea substitution_groups
--     senza mai menzionare RLS (mai stata protetta).
--   - food_equivalences → creata senza RLS in nessuna migration nota.
--
-- Questa migration copre:
--   1) workout_plan_days / workout_plan_exercises → NESSUNA azione SQL qui,
--      solo nota di riferimento (vedi BLOCCO 0).
--   2) diet_weekly_plans / diet_meals / diet_meal_foods → riuso di nomi e
--      logica da 20260429_diet_tables.sql, con aggiunta delle policy DELETE
--      mancanti e wrapping (select auth.uid()) per performance.
--   3) body_parts, food_categories, foods, substitution_groups,
--      food_equivalences → nuovo modello "SELECT pubblica, scrittura solo
--      service_role" (non esisteva un fix precedente da riusare).
--   4) Wrapping (select auth.uid()) sulle 5 tabelle già segnalate
--      dall'advisor performance (workout_logs, set_logs, body_measurements,
--      workout_plans, user_skill_progress).
--   5) Revoca EXECUTE su rls_auto_enable() da anon/authenticated.
--
-- NOTA: nessuna modifica agli Auth settings (leaked password protection) né
-- agli indici mancanti/inutilizzati: gestiti in migration separate.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- BLOCCO 0 — workout_plan_days / workout_plan_exercises
--
-- Nessuna istruzione SQL in questo blocco.
-- Il fix corretto esiste già, invariato, in:
--   supabase/migrations/20260619000000_fix_rls_child_tables.sql
-- Quel file droppa le policy "allow_all" e crea policy granulari SELECT/
-- INSERT/UPDATE/DELETE basate su ownership (risalendo workout_plan_day_id →
-- workout_plan_id → workout_plans.user_id). È già idempotente (usa
-- DROP POLICY IF EXISTS) e, avendo timestamp 20260619000000 < 20260709000000,
-- verrà applicato PRIMA di questa migration nello stesso batch di deploy.
-- Duplicarne qui il contenuto causerebbe un errore "policy already exists"
-- alla seconda esecuzione delle CREATE POLICY, quindi non lo ripetiamo.
-- -----------------------------------------------------------------------------


-- -----------------------------------------------------------------------------
-- BLOCCO 1 — diet_weekly_plans: aggiunta DELETE mancante + wrapping auth.uid()
--
-- Cosa fa: droppa e ricrea le 3 policy esistenti (SELECT/INSERT/UPDATE)
-- create in 20260429_diet_tables.sql, stessi nomi e stessa logica di
-- ownership (user_id = utente corrente), sostituendo solo auth.uid() con
-- (select auth.uid()) per evitare la rivalutazione per riga. Aggiunge la
-- policy DELETE che nell'originale non esisteva.
-- Perché: la tabella contiene user_id esposto senza alcuna policy DELETE —
-- un utente autenticato non potrebbe mai cancellare un proprio piano
-- settimanale via API; inoltre le policy originali non erano ottimizzate
-- per le performance su larga scala.
-- -----------------------------------------------------------------------------

ALTER TABLE public.diet_weekly_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own weekly plans" ON public.diet_weekly_plans;
CREATE POLICY "Users can view own weekly plans" ON public.diet_weekly_plans
  FOR SELECT USING ( (select auth.uid()) = user_id );

DROP POLICY IF EXISTS "Users can insert own weekly plans" ON public.diet_weekly_plans;
CREATE POLICY "Users can insert own weekly plans" ON public.diet_weekly_plans
  FOR INSERT WITH CHECK ( (select auth.uid()) = user_id );

DROP POLICY IF EXISTS "Users can update own weekly plans" ON public.diet_weekly_plans;
CREATE POLICY "Users can update own weekly plans" ON public.diet_weekly_plans
  FOR UPDATE USING ( (select auth.uid()) = user_id );

-- Policy DELETE mancante nell'originale 20260429_diet_tables.sql
DROP POLICY IF EXISTS "Users can delete own weekly plans" ON public.diet_weekly_plans;
CREATE POLICY "Users can delete own weekly plans" ON public.diet_weekly_plans
  FOR DELETE USING ( (select auth.uid()) = user_id );


-- -----------------------------------------------------------------------------
-- BLOCCO 2 — diet_meals: aggiunta DELETE mancante + wrapping auth.uid()
--
-- Cosa fa: come sopra, ma la ownership passa per la FK weekly_plan_id verso
-- diet_weekly_plans (diet_meals non ha user_id proprio). Riusa i nomi
-- "Users can view own meals" / "Users can manage own meals" (quest'ultima
-- gestisce solo INSERT, nome storico mantenuto per non rompere riferimenti)
-- / "Users can update own meals" già presenti in 20260429_diet_tables.sql.
-- Perché: stessa lacuna DELETE del blocco 1, stessa esigenza di wrapping.
-- -----------------------------------------------------------------------------

ALTER TABLE public.diet_meals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own meals" ON public.diet_meals;
CREATE POLICY "Users can view own meals" ON public.diet_meals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.diet_weekly_plans
      WHERE diet_weekly_plans.id = diet_meals.weekly_plan_id
      AND diet_weekly_plans.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage own meals" ON public.diet_meals;
CREATE POLICY "Users can manage own meals" ON public.diet_meals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.diet_weekly_plans
      WHERE diet_weekly_plans.id = diet_meals.weekly_plan_id
      AND diet_weekly_plans.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own meals" ON public.diet_meals;
CREATE POLICY "Users can update own meals" ON public.diet_meals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.diet_weekly_plans
      WHERE diet_weekly_plans.id = diet_meals.weekly_plan_id
      AND diet_weekly_plans.user_id = (select auth.uid())
    )
  );

-- Policy DELETE mancante nell'originale 20260429_diet_tables.sql
DROP POLICY IF EXISTS "Users can delete own meals" ON public.diet_meals;
CREATE POLICY "Users can delete own meals" ON public.diet_meals
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.diet_weekly_plans
      WHERE diet_weekly_plans.id = diet_meals.weekly_plan_id
      AND diet_weekly_plans.user_id = (select auth.uid())
    )
  );


-- -----------------------------------------------------------------------------
-- BLOCCO 3 — diet_meal_foods: wrapping auth.uid() (DELETE già presente)
--
-- Cosa fa: droppa e ricrea le 4 policy esistenti (SELECT/INSERT/UPDATE/
-- DELETE) già create in 20260429_diet_tables.sql con la stessa identica
-- logica (ownership a due salti: meal_id → diet_meals → weekly_plan_id →
-- diet_weekly_plans.user_id), sostituendo solo auth.uid() con
-- (select auth.uid()). A differenza di diet_weekly_plans e diet_meals, qui
-- la policy DELETE ("Users can delete own meal foods") esisteva già
-- nell'originale: non è una policy nuova, solo ottimizzata.
-- -----------------------------------------------------------------------------

ALTER TABLE public.diet_meal_foods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own meal foods" ON public.diet_meal_foods;
CREATE POLICY "Users can view own meal foods" ON public.diet_meal_foods
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.diet_meals
      JOIN public.diet_weekly_plans ON diet_weekly_plans.id = diet_meals.weekly_plan_id
      WHERE diet_meals.id = diet_meal_foods.meal_id
      AND diet_weekly_plans.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage own meal foods" ON public.diet_meal_foods;
CREATE POLICY "Users can manage own meal foods" ON public.diet_meal_foods
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.diet_meals
      JOIN public.diet_weekly_plans ON diet_weekly_plans.id = diet_meals.weekly_plan_id
      WHERE diet_meals.id = diet_meal_foods.meal_id
      AND diet_weekly_plans.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own meal foods" ON public.diet_meal_foods;
CREATE POLICY "Users can update own meal foods" ON public.diet_meal_foods
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.diet_meals
      JOIN public.diet_weekly_plans ON diet_weekly_plans.id = diet_meals.weekly_plan_id
      WHERE diet_meals.id = diet_meal_foods.meal_id
      AND diet_weekly_plans.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own meal foods" ON public.diet_meal_foods;
CREATE POLICY "Users can delete own meal foods" ON public.diet_meal_foods
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.diet_meals
      JOIN public.diet_weekly_plans ON diet_weekly_plans.id = diet_meals.weekly_plan_id
      WHERE diet_meals.id = diet_meal_foods.meal_id
      AND diet_weekly_plans.user_id = (select auth.uid())
    )
  );

-- NOTA: queste policy con doppio join beneficerebbero di un indice su
-- diet_weekly_plans.user_id (già segnalato come FK non indicizzata
-- nell'advisor di performance). Non incluso qui: gestito separatamente.


-- -----------------------------------------------------------------------------
-- BLOCCO 4 — body_parts: sostituzione policy "allow_all"
--
-- Cosa fa: droppa la policy "allow_all" introdotta in
-- 20260428_fix_rls_child_tables.sql (mai corretta da allora) e la sostituisce
-- con SELECT pubblica (anon + authenticated) + scrittura riservata a
-- service_role.
-- Perché: body_parts è un catalogo condiviso di 14 righe (nomi parti del
-- corpo), non dato per-utente: la policy "allow_all" permette a QUALSIASI
-- utente autenticato di modificare/cancellare il catalogo per tutti.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "allow_all" ON public.body_parts;

CREATE POLICY "body_parts_select_public"
  ON public.body_parts
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "body_parts_write_service_role"
  ON public.body_parts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- -----------------------------------------------------------------------------
-- BLOCCO 5 — food_categories / foods: abilitazione RLS (nuovo modello)
--
-- Cosa fa: 20260429_diet_tables.sql le aveva esplicitamente disabilitate
-- ("scelta voluta", cataloghi non sensibili). Qui le riabilitiamo ma con
-- SELECT pubblica (stesso comportamento di lettura di prima, quindi nessuna
-- regressione per i client) + scrittura riservata a service_role (novità:
-- prima chiunque con la anon key poteva scrivere).
-- Perché: l'audit ha rilevato che, RLS disabilitata, questi cataloghi sono
-- scrivibili da chiunque abbia la anon key — non solo leggibili.
-- -----------------------------------------------------------------------------

ALTER TABLE public.food_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "food_categories_select_public"
  ON public.food_categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "food_categories_write_service_role"
  ON public.food_categories
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "foods_select_public"
  ON public.foods
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "foods_write_service_role"
  ON public.foods
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- -----------------------------------------------------------------------------
-- BLOCCO 6 — substitution_groups / food_equivalences: abilitazione RLS
-- (mai avuta prima in nessuna migration)
--
-- Cosa fa: stesso modello del blocco 5 (SELECT pubblica, scrittura
-- service_role). A differenza di food_categories/foods, qui non si tratta di
-- ripristinare un comportamento precedente ma di introdurre protezione per
-- la prima volta: queste tabelle non hanno mai avuto RLS in nessuna
-- migration del repo (create rispettivamente in
-- 20260430_create_substitution_groups.sql e in una migration senza menzione
-- di RLS per food_equivalences).
-- Perché: sono cataloghi di supporto (gruppi di sostituzione alimentare),
-- stessa natura non sensibile dei cataloghi food, quindi stesso trattamento.
-- -----------------------------------------------------------------------------

ALTER TABLE public.substitution_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "substitution_groups_select_public"
  ON public.substitution_groups
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "substitution_groups_write_service_role"
  ON public.substitution_groups
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


ALTER TABLE public.food_equivalences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "food_equivalences_select_public"
  ON public.food_equivalences
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "food_equivalences_write_service_role"
  ON public.food_equivalences
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- -----------------------------------------------------------------------------
-- BLOCCO 7 — Ottimizzazione performance: wrapping (select auth.uid())
-- sulle 5 tabelle segnalate dall'advisor "Auth RLS Initialization Plan"
-- (workout_logs, set_logs, body_measurements, workout_plans,
-- user_skill_progress).
--
-- Cosa fa: droppa e ricrea le policy esistenti con la STESSA identica logica
-- di autorizzazione (FOR ALL, USING/WITH CHECK: utente = user_id), senza
-- restringere il ruolo target (restano su "public" come oggi — per anon,
-- auth.uid() è NULL, quindi l'accesso resta comunque negato, nessuna
-- regressione), sostituendo solo auth.uid() con (select auth.uid()) per
-- farlo valutare una sola volta per query invece che una volta per riga.
-- Perché: a volumi crescenti (set_logs ha già oltre 1200 righe e cresce ad
-- ogni allenamento registrato) la rivalutazione per riga di auth.uid() è un
-- costo inutile che scala male.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users manage own workout_logs" ON public.workout_logs;
CREATE POLICY "Users manage own workout_logs"
  ON public.workout_logs
  FOR ALL
  USING ( (select auth.uid()) = user_id )
  WITH CHECK ( (select auth.uid()) = user_id );

DROP POLICY IF EXISTS "Users manage own set_logs" ON public.set_logs;
CREATE POLICY "Users manage own set_logs"
  ON public.set_logs
  FOR ALL
  USING ( (select auth.uid()) = user_id )
  WITH CHECK ( (select auth.uid()) = user_id );

DROP POLICY IF EXISTS "Users manage own body_measurements" ON public.body_measurements;
CREATE POLICY "Users manage own body_measurements"
  ON public.body_measurements
  FOR ALL
  USING ( (select auth.uid()) = user_id )
  WITH CHECK ( (select auth.uid()) = user_id );

DROP POLICY IF EXISTS "Users manage own workout_plans" ON public.workout_plans;
CREATE POLICY "Users manage own workout_plans"
  ON public.workout_plans
  FOR ALL
  USING ( (select auth.uid()) = user_id )
  WITH CHECK ( (select auth.uid()) = user_id );

DROP POLICY IF EXISTS "Users manage own user_skill_progress" ON public.user_skill_progress;
CREATE POLICY "Users manage own user_skill_progress"
  ON public.user_skill_progress
  FOR ALL
  USING ( (select auth.uid()) = user_id )
  WITH CHECK ( (select auth.uid()) = user_id );


-- -----------------------------------------------------------------------------
-- BLOCCO 8 — Revoca EXECUTE su rls_auto_enable() da anon/authenticated
--
-- Cosa fa: revoca il privilegio EXECUTE dal ruolo PUBLIC (che include anon e
-- authenticated) sulla funzione rls_auto_enable(), lasciando i grant a
-- postgres/service_role.
-- Perché: rls_auto_enable() è un event trigger function (RETURNS
-- event_trigger) creata per abilitare automaticamente RLS sulle nuove
-- tabelle create in schema public. Non è pensata per essere chiamata da
-- client via RPC: Postgres rifiuta la chiamata diretta a funzioni
-- event_trigger fuori dal contesto di un event trigger, quindi la revoca
-- non ha alcun impatto funzionale. Verificato che non risultano riferimenti
-- a "rls_auto_enable" nel codice client del repository.
-- -----------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;
-- Grant a postgres e service_role lasciati invariati (non necessari al
-- funzionamento dell'event trigger, ma non pericolosi da mantenere).

-- =============================================================================
-- FINE MIGRATION
-- =============================================================================
