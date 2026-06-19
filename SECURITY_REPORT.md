# Security & Code Quality Report — Strength Sight

**Data:** 19 giugno 2026  
**Versione analizzata:** branch `main`  
**Stack:** React 18, Vite, TypeScript, Supabase, shadcn/ui

---

## Riepilogo esecutivo

L'app ha una base solida: autenticazione Supabase corretta, RLS attivo sulle tabelle principali e nessuna vulnerabilità catastrofica. Tuttavia sono stati trovati **1 problema critico** (XSS potenziale), **1 problema alto** (API key esposta), **2 medi** e vari problemi di qualità del codice da correggere prima del deploy in produzione.

---

## 🔴 CRITICO — XSS in RecipeDialog

**File:** `src/components/Diet/RecipeDialog.tsx` — riga 23

```tsx
// ❌ Codice attuale — PERICOLOSO
const bold = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
return <p key={i} dangerouslySetInnerHTML={{ __html: bold }} />;
```

**Problema:** Il testo ricevuto dall'API Gemini viene iniettato direttamente come HTML nel DOM. Se la risposta dell'AI contenesse tag `<script>` o attributi `onerror=`, verrebbe eseguito nel browser dell'utente (XSS da terza parte).

**Fix consigliato:** Sostituire con rendering sicuro senza HTML raw:

```tsx
// ✅ Soluzione sicura
function renderMarkdown(text: string) {
  return text.split('\n').map((line, i) => {
    const parts = line.split(/\*\*(.+?)\*\*/g);
    return (
      <p key={i} className="text-sm leading-relaxed">
        {parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
      </p>
    );
  });
}
```

---

## 🟠 ALTO — API Key Gemini esposta nel bundle pubblico

**File:** `src/services/geminiService.ts` — riga 1

```ts
// ❌ Questa variabile finisce nel bundle JS scaricabile da chiunque
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
```

**Problema:** Tutte le variabili `VITE_*` vengono compilate nel bundle JavaScript pubblico da Vite. Chiunque apra il DevTools del browser può trovare la chiave Gemini in chiaro. La chiave può essere usata a spese del proprietario.

**Fix consigliato:** Spostare la chiamata Gemini in una Supabase Edge Function. Il frontend chiama la Edge Function (autenticata via JWT Supabase), che a sua volta chiama Gemini tenendo la chiave lato server.

---

## 🟡 MEDIO — RLS assente su tabelle child del piano di allenamento

**File:** `supabase/migrations/20260423_migrate_to_supabase_auth.sql`

```sql
-- Disable RLS on child tables (protected by parent table RLS)
ALTER TABLE public.workout_plan_days DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plan_exercises DISABLE ROW LEVEL SECURITY;
```

**Problema:** `workout_plan_days` e `workout_plan_exercises` non hanno RLS attivo. Il commento "protected by parent" è fuorviante: in Supabase il RLS della tabella padre non protegge automaticamente le tabelle figlie. Un utente autenticato che conosce (o indovina) un `day_id` può leggere gli esercizi di un altro utente con una query diretta alle API REST di Supabase.

**Fix consigliato:**
```sql
ALTER TABLE public.workout_plan_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own plan days"
  ON public.workout_plan_days FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workout_plans
      WHERE workout_plans.id = workout_plan_days.workout_plan_id
        AND workout_plans.user_id = auth.uid()
    )
  );

ALTER TABLE public.workout_plan_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own plan exercises"
  ON public.workout_plan_exercises FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workout_plan_days
      JOIN workout_plans ON workout_plans.id = workout_plan_days.workout_plan_id
      WHERE workout_plan_days.id = workout_plan_exercises.workout_plan_day_id
        AND workout_plans.user_id = auth.uid()
    )
  );
```

---

## 🟡 MEDIO — Inconsistenza lettura `activePlanId` (bypass del Context)

**File:** `src/pages/Dashboard.tsx` — riga 179

```ts
// ❌ Legge localStorage direttamente, bypassando il Context React
const activePlanId = localStorage.getItem('activePlanId');
```

**Problema:** In tutto il resto dell'app si usa `useActivePlan()` context, ma qui viene letto `localStorage` direttamente. Se l'utente cambia piano attivo, questa branch di codice usa il valore vecchio/inconsistente. È in un ramo `else` (nessun log precedente), quindi difficile da notare.

**Fix:** Usare il valore già disponibile come parametro della funzione `loadData(uid)` o passare `activePlanId` dal context come argomento.

---

## 🔵 BUG — `exercise.name` non esiste (campo sbagliato)

**File:** `src/pages/WorkoutSession.tsx` — riga 601

```tsx
// ❌ Bug: `exercise.name` non esiste nell'interfaccia PlanExercise
const key = `${exercise.name}-${i}`;
```

L'interfaccia `PlanExercise` ha `exercise_name`, non `name`. Il key React sarà sempre `undefined-0`, `undefined-1` ecc., il che causa potenziali problemi di reconciliation e animazioni brutte (il `justDone` highlight non funziona correttamente).

**Fix:**
```tsx
const key = `${exercise.exercise_name}-${i}`;
```

---

## 🔵 BUG — `setSaving` non resettato in caso di errore in `finishWorkout`

**File:** `src/pages/WorkoutSession.tsx` — funzione `finishWorkout()`

```ts
async function finishWorkout() {
  setSaving(true);
  // ...
  try { ... }
  catch { toast(...) }
  // ❌ manca il finally { setSaving(false) }
  // Risultato: se l'insert fallisce, il bottone "Completa" rimane disabilitato
}
```

**Fix:**
```ts
async function finishWorkout() {
  setSaving(true);
  try { ... }
  catch { toast(...) }
  finally { setSaving(false) }
}
```

---

## 🔵 BUG — `savePartialWorkout` chiamata in evento `unload` con `async`

**File:** `src/pages/WorkoutSession.tsx` — riga 188-190

```ts
const handleUnload = () => {
  if (phase === "active" && !completion) {
    savePartialWorkout(); // ❌ async non garantita su unload
  }
};
```

**Problema:** Le richieste async non vengono garantite durante l'evento `unload`. Su mobile specialmente, la pagina può essere chiusa prima che la fetch completi.

**Fix consigliato:** Usare `navigator.sendBeacon()` per inviare i dati sull'unload, oppure salvataggio automatico periodico ogni N serie completate.

---

## ⚪ CODE QUALITY — Password minima troppo corta

**File:** `src/pages/Login.tsx` — riga 48

```ts
if (password.length < 6) { ... }
```

6 caratteri è il minimo assoluto di Supabase, ma è insufficiente per la sicurezza. Raccomandato minimo 8 caratteri. Supabase permette di configurare questo nella dashboard (Authentication > Policies > Password strength).

---

## ⚪ CODE QUALITY — `console.log` in produzione

Presenti `console.log` e `console.error` in quasi tutti i file di pagina. Espongono dettagli interni agli utenti attraverso DevTools.

**Fix:** Aggiungere in `vite.config.ts`:
```ts
build: {
  terserOptions: {
    compress: { drop_console: true }
  }
}
```

---

## ⚪ CODE QUALITY — Uso di `any` in TypeScript

Trovati usi di `any` in `WorkoutSelect.tsx`, `History.tsx`, `Dashboard.tsx`, servizi diet. Il caso più critico:

```ts
// WorkoutSelect.tsx
(data || []).map((p: any) => ({ ... }))
```

Supabase genera i tipi in `src/integrations/supabase/types.ts` — usarli invece di `any` migliora la type safety e intercetta errori a compile time.

---

## ⚪ CODE QUALITY — Race condition in `loadDayData`

**File:** `src/pages/WorkoutSession.tsx` — riga 107

```ts
if (day) {
  loadPrevSession(day.day_name); // ❌ manca await — chiamata fire-and-forget
```

`loadPrevSession` aggiorna lo stato ma viene chiamata senza `await`. Se il componente viene smontato prima che completi, ci sarà un aggiornamento su componente unmounted (memory leak / warning React).

**Fix:** `await loadPrevSession(day.day_name)` (la funzione `loadDayData` è già `async`).

---

## ✅ Cose fatte bene

- **AuthContext** correttamente implementato con `onAuthStateChange` e cleanup della subscription.
- **ProtectedRoute** gestisce correttamente lo stato di loading prima del redirect.
- **`getUserId()`** centralizzato in `src/lib/user.ts` — single point of truth.
- **RLS attivo** su tutte le tabelle principali (`workout_plans`, `workout_logs`, `set_logs`, `body_measurements`).
- **Variabili d'ambiente** per Supabase corrette (`VITE_SUPABASE_PUBLISHABLE_KEY` è la chiave anonima pubblica, non quella service_role — corretto).
- **Token Supabase** in `localStorage` — comportamento standard, accettabile per una PWA.
- **Validazione form** login con regex email e check lunghezza password.
- **`user_id`** passato nel `WITH CHECK` RLS per prevenire insert su dati altrui.

---

## Priorità dei fix

| # | Problema | Priorità | Effort |
|---|----------|----------|--------|
| 1 | XSS in RecipeDialog | 🔴 CRITICO | Basso (10 min) |
| 2 | API Key Gemini esposta | 🟠 ALTO | Medio (Edge Function) |
| 3 | RLS mancante su tabelle child | 🟡 MEDIO | Basso (migration SQL) |
| 4 | Inconsistenza activePlanId | 🟡 MEDIO | Basso |
| 5 | Bug `exercise.name` → `exercise_name` | 🔵 BUG | Minimo |
| 6 | `setSaving` non resettato | 🔵 BUG | Minimo |
| 7 | `savePartialWorkout` su unload | 🔵 BUG | Medio |
| 8 | Password minima 6 char | ⚪ INFO | Minimo |
| 9 | `console.log` in produzione | ⚪ INFO | Minimo |
| 10 | Tipi `any` TypeScript | ⚪ INFO | Medio |
| 11 | Race condition loadDayData | ⚪ INFO | Minimo |
