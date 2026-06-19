# Backend Report — Strength Sight

**Data:** 19 giugno 2026  
**Project ID Supabase:** `nxjbknbjxzytlshbtkxs`

---

## Mappa del database (stato attuale)

Il DB ha **13 tabelle attive** usate dal frontend. Ecco la mappa completa:

### 🏋️ Allenamento
| Tabella | RLS | Relazione |
|---|---|---|
| `workout_plans` | ✅ user_id | root |
| `workout_plan_days` | ⚠️ `allow_all` (authenticated) | → workout_plans |
| `workout_plan_exercises` | ⚠️ `allow_all` (authenticated) | → workout_plan_days |
| `workout_logs` | ✅ user_id | → auth.users |
| `set_logs` | ✅ user_id | → workout_logs |

### 📏 Corpo
| Tabella | RLS | Relazione |
|---|---|---|
| `body_measurements` | ✅ user_id | → auth.users |
| `body_parts` | ⚠️ `allow_all` (authenticated) | lookup table |

### 🥗 Dieta
| Tabella | RLS | Relazione |
|---|---|---|
| `diet_weekly_plans` | ✅ user_id | root |
| `diet_meals` | ✅ via weekly_plan | → diet_weekly_plans |
| `diet_meal_foods` | ✅ via meal→plan | → diet_meals |
| `foods` | ❌ RLS OFF | lookup table |
| `food_categories` | ❌ RLS OFF | lookup table |
| `substitution_groups` | ❌ RLS OFF | lookup table |
| `food_equivalences` | ❌ RLS OFF | → substitution_groups + foods |

---

## ⚠️ Problemi strutturali

### 1. Types.ts drasticamente incompleto

Il file `src/integrations/supabase/types.ts` ha solo **3 tabelle** tipizzate (`body_measurements`, `set_logs`, `workout_logs`), ma il frontend usa **13 tabelle**. Le restanti 10 vengono accedute senza type safety — ogni query ritorna `any` implicito.

**Conseguenze:** errori a runtime difficili da debuggare, nessun autocompletamento per i campi dieta/piano allenamento.

**Fix:** Rigenerare il types.ts con la CLI di Supabase:
```bash
npx supabase gen types typescript --project-id nxjbknbjxzytlshbtkxs > src/integrations/supabase/types.ts
```

---

### 2. Edge Functions obsolete (auth custom non più usata)

Esistono due Edge Functions (`auth-login`, `auth-register`) che implementano un sistema di autenticazione custom con una tabella `users` e password hashate in SHA-256. Questo sistema è stato **completamente abbandonato** con la migrazione a Supabase Auth (20260423), ma le funzioni sono rimaste nel repo.

**Rischio:** confusione futura, potenzialmente deployate per errore.

**Fix:** Eliminare le cartelle `supabase/functions/auth-login/` e `supabase/functions/auth-register/`.

---

### 3. RLS "allow_all" su workout_plan_days e workout_plan_exercises

La migration `20260428_fix_rls_child_tables.sql` ha abilitato RLS su queste tabelle ma con una policy `USING (true)` — cioè ogni utente autenticato può leggere e modificare i giorni e gli esercizi di chiunque altro.

```sql
-- ❌ Policy attuale — troppo permissiva
CREATE POLICY "allow_all" ON public.workout_plan_days 
  FOR ALL TO authenticated USING (true);
```

**Fix già incluso nel report sicurezza** — applicare le policy con JOIN su `workout_plans.user_id = auth.uid()`.

---

### 4. workout_plan_exercises ha colonna exercise_id inutilizzata

La tabella ha una colonna `exercise_id UUID REFERENCES exercises(id)` ma la tabella `exercises` è stata **droppata** in `20260427_drop_unused_tables.sql`. La FK ora punta al nulla e la colonna non viene mai usata dal frontend (che usa sempre `exercise_name` TEXT).

**Fix:** Migration per droppare la colonna orphan:
```sql
ALTER TABLE workout_plan_exercises DROP COLUMN IF EXISTS exercise_id;
```

---

### 5. body_measurements ha colonne legacy non usate

La tabella ha ancora colonne vecchie aggiunte nelle prime migration (`arms`, `waist`, `legs`, `body_fat`) che non vengono mai scritte né lette dal frontend moderno (che usa le colonne dettagliate `braccio_front_cm`, `vita_cm`, ecc.). Creano rumore nel DB e nel types.ts.

---

### 6. getDayView fa 4 query sequenziali invece di 1

`src/services/dietService.ts` — la funzione `getDayView` esegue 4 query separate e sequenziali per assemblare la vista giornaliera (meals → meal_foods → foods → categories). Supabase supporta le join nidificate in una sola query:

```ts
// ✅ 1 sola query con join
supabase.from('diet_meals')
  .select(`*, diet_meal_foods(*, foods(*, food_categories(*)))`)
  .eq('weekly_plan_id', weeklyPlanId)
  .eq('day_of_week', dayOfWeek)
```

---

### 7. console.log di debug in getDayView in produzione

```ts
// ❌ Riga 113 — debug log mai rimosso
console.log('DEBUG getDayView:', { mealFoodsCount, ... });
```

---

## 🤖 Automazioni possibili con Supabase

Di seguito le automazioni che hanno senso per questa app, dalla più semplice alla più complessa.

---

### A. Trigger: auto-populate `set_logs.user_id` dal workout_log

**Problema attuale:** il `user_id` in `set_logs` viene passato dal client — se c'è un bug, i dati vengono scritti senza owner o con owner sbagliato.

**Soluzione:** Database trigger che copia automaticamente `user_id` dal `workout_log` padre:

```sql
CREATE OR REPLACE FUNCTION auto_set_user_id_on_set_logs()
RETURNS TRIGGER AS $$
BEGIN
  SELECT user_id INTO NEW.user_id 
  FROM workout_logs 
  WHERE id = NEW.workout_log_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_logs_auto_user_id
  BEFORE INSERT ON set_logs
  FOR EACH ROW EXECUTE FUNCTION auto_set_user_id_on_set_logs();
```

Poi il frontend non deve più passare `user_id` nell'insert di `set_logs`.

---

### B. Trigger: calcola e salva volume totale per sessione

**Situazione:** il volume (kg×reps) viene ricalcolato lato client ogni volta. Con molti log diventa pesante.

**Soluzione:** Trigger su `set_logs` che aggiorna una colonna `total_volume` su `workout_logs`:

```sql
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS total_volume NUMERIC DEFAULT 0;

CREATE OR REPLACE FUNCTION update_workout_volume()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE workout_logs
  SET total_volume = (
    SELECT COALESCE(SUM(weight * reps), 0)
    FROM set_logs
    WHERE workout_log_id = NEW.workout_log_id
  )
  WHERE id = NEW.workout_log_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER calc_volume_on_set_log
  AFTER INSERT OR UPDATE OR DELETE ON set_logs
  FOR EACH ROW EXECUTE FUNCTION update_workout_volume();
```

La Dashboard leggerebbe direttamente `total_volume` senza aggregare.

---

### C. Edge Function: proxy Gemini (fix API key esposta)

**Situazione:** la chiave Gemini è nel bundle pubblico (già segnalato nel security report).

**Soluzione:** Edge Function `generate-recipe` che fa da proxy autenticato:

```ts
// supabase/functions/generate-recipe/index.ts
serve(async (req) => {
  const token = req.headers.get('Authorization');
  const { data: { user } } = await supabase.auth.getUser(token?.replace('Bearer ', ''));
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { mealType, foods } = await req.json();
  const geminiKey = Deno.env.get('GEMINI_API_KEY'); // server-side, mai esposta
  // ... chiama Gemini e ritorna il risultato
});
```

Il frontend chiama `supabase.functions.invoke('generate-recipe', { body: { mealType, foods } })` invece di Gemini direttamente.

---

### D. Trigger: auto-cleanup workout_logs incompleti dopo 24h

**Problema:** se l'utente chiude l'app durante un allenamento, rimane un `workout_log` con `completed_at = NULL`. L'app già gestisce il "riprendi allenamento" ma i log vecchi si accumulano.

**Soluzione:** pg_cron job (disponibile su Supabase) che marca come abbandonati i log aperti da più di 24 ore:

```sql
-- Abilita pg_cron (una volta sola dalla Supabase dashboard)
SELECT cron.schedule(
  'cleanup-incomplete-workouts',
  '0 3 * * *',  -- ogni notte alle 3:00
  $$
    UPDATE workout_logs 
    SET completed_at = started_at + INTERVAL '1 hour',
        notes = 'Auto-closed: session abandoned'
    WHERE completed_at IS NULL 
      AND started_at < now() - INTERVAL '24 hours'
  $$
);
```

---

### E. Trigger: aggiorna `updated_at` sulle tabelle dieta

Le tabelle `diet_weekly_plans` e `diet_meals` hanno la colonna `updated_at` ma **nessun trigger** che la aggiorna automaticamente (a differenza di `workout_logs` e `workout_plans` che ce l'hanno). I `UPDATE` non aggiornano il timestamp.

```sql
CREATE TRIGGER update_diet_weekly_plans_updated_at
  BEFORE UPDATE ON diet_weekly_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_diet_meals_updated_at
  BEFORE UPDATE ON diet_meals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

---

## Priorità interventi

| # | Intervento | Tipo | Impatto | Effort |
|---|---|---|---|---|
| 1 | Rigenera types.ts | CLI command | 🔴 Alto | Minimo |
| 2 | Edge Function Gemini proxy | Edge Function | 🔴 Alto (sicurezza) | Medio |
| 3 | Trigger auto user_id su set_logs | SQL trigger | 🟠 Medio | Basso |
| 4 | Trigger total_volume su workout_logs | SQL trigger | 🟡 Ottimizzazione | Basso |
| 5 | Fix RLS allow_all → policy reale | SQL migration | 🟠 Medio (sicurezza) | Basso |
| 6 | Trigger updated_at sulle tabelle dieta | SQL trigger | 🟡 Basso | Minimo |
| 7 | getDayView → 1 query con join | Refactor TS | 🟡 Performance | Basso |
| 8 | Drop colonne legacy body_measurements | SQL migration | ⚪ Cleanup | Minimo |
| 9 | Drop exercise_id orphan | SQL migration | ⚪ Cleanup | Minimo |
| 10 | pg_cron cleanup workout incompleti | SQL cron | ⚪ Nice to have | Basso |
| 11 | Elimina Edge Functions obsolete | Delete files | ⚪ Cleanup | Minimo |
