# Analisi Database & Piano di Ristrutturazione
## Strength Sight - Database Architecture

---

## 📊 SCHEMA ATTUALE (Ricostruito)

```sql
-- Table 1: workout_logs
CREATE TABLE workout_logs (
  id UUID PRIMARY KEY,
  workout_day VARCHAR (es. "Day1", "Day2"),
  started_at TIMESTAMP,
  completed_at TIMESTAMP | NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
  -- ❌ PROBLEMA: Manca user_id! Come sai di chi è l'allenamento?
  -- ❌ PROBLEMA: Manca relazione con body_measurements
);

-- Table 2: set_logs
CREATE TABLE set_logs (
  id UUID PRIMARY KEY,
  workout_log_id UUID → FOREIGN KEY workout_logs(id),
  exercise_name VARCHAR,
  set_number INTEGER,
  reps INTEGER,
  weight DECIMAL | NULL,
  created_at TIMESTAMP
  -- ❌ PROBLEMA: Manca user_id!
  -- ❌ PROBLEMA: Niente RPE (Rate of Perceived Exertion)
  -- ❌ PROBLEMA: Niente flag per "questo era un PR?"
};

-- Table 3: body_measurements
CREATE TABLE body_measurements (
  id UUID PRIMARY KEY,
  weight DECIMAL | NULL,
  body_fat DECIMAL | NULL,
  arms DECIMAL | NULL,
  waist DECIMAL | NULL,
  legs DECIMAL | NULL,
  measured_at TIMESTAMP,
  created_at TIMESTAMP
  -- ❌ PROBLEMA: Manca user_id!
  -- ❌ PROBLEMA: Niente note (es. "dopo allenamento", "a digiuno")
  -- ❌ PROBLEMA: Niente correlazione con sessioni di allenamento
};
```

---

## 🔴 PROBLEMI IDENTIFICATI

### **Critici (Blocca features nuove)**

| # | Problema | Impatto | Esempio |
|---|----------|--------|---------|
| 1 | ❌ **Manca user_id in tutte le tabelle** | Multi-user non funziona correttamente | Se ho 2 utenti, non so cui appartiene quale allenamento |
| 2 | ❌ **Nessuna relazione tra workout_logs e body_measurements** | Impossibile fare correlazioni | Non puoi dire "in questo mese 16 allenamenti + -1kg" |
| 3 | ❌ **Nessun tracking di PR** | Hard capire quando è stato stabilito un record | Devi calcolare ogni volta da zero |
| 4 | ❌ **Nessun tracking di difficoltà/RPE** | Impossibile personalizzare progressione | Non sai se la sessione è stata facile o dura |

### **Importanti (Limita analytics)**

| # | Problema | Impatto | Soluzione |
|---|----------|--------|----------|
| 5 | No note/contesto misurazioni | Non capisci il perché dei dati | Aggiungere `notes` in body_measurements |
| 6 | Niente user preferences | Timer fisso, unità non customizzabili | Creare `user_preferences` table |
| 7 | No goals/targets | Non sai verso cosa stai progredendo | Creare `user_goals` table |
| 8 | Niente volume calcolato | Devi calcolare in app ogni volta | Aggiungere `calculated_volume` in set_logs |

### **Nice-to-Have**

| # | Feature | Utilità |
|---|---------|---------|
| 9 | Workout difficulty tags | Smart progression suggestions |
| 10 | Recovery metrics | Correlate performance con sleep/stress |
| 11 | Exercise variations | Tracciare "Squat vs Leg Press vs..." |
| 12 | Workout templates | Salvare schede personalizzate |

---

## ✅ SCHEMA PROPOSTO (OTTIMIZZATO)

### **Tier 1: Necessario (per multi-user + analytics)**

```sql
-- ===== USERS & PREFERENCES =====

-- 1. User Profiles (extends Supabase auth)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY → auth.users(id),
  username VARCHAR UNIQUE,
  display_name VARCHAR,
  avatar_url VARCHAR,
  timezone VARCHAR DEFAULT 'UTC',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 2. User Preferences
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL → FOREIGN KEY user_profiles(id),
  rest_timer_default INT DEFAULT 90 (secondi),
  weight_unit VARCHAR DEFAULT 'kg',
  height_unit VARCHAR DEFAULT 'cm',
  body_fat_method VARCHAR DEFAULT 'manual', -- manual, scale, prediction
  preferred_language VARCHAR DEFAULT 'it',
  dark_mode BOOLEAN DEFAULT true,
  notifications_enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id)
);

-- 3. User Goals & Targets
CREATE TABLE user_goals (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL → FOREIGN KEY user_profiles(id),
  goal_type VARCHAR -- 'weight_loss', 'muscle_gain', 'strength', 'endurance',
  target_value DECIMAL,
  target_metric VARCHAR, -- 'weight', 'body_fat', 'volume', 'strength'
  target_date DATE,
  current_value DECIMAL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP
);

-- ===== WORKOUT DATA =====

-- 4. Workout Logs (MODIFIED)
CREATE TABLE workout_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL → FOREIGN KEY user_profiles(id),
  workout_day VARCHAR, -- "Day1", "Day2", etc.
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  duration_minutes INT COMPUTED (EXTRACT(EPOCH FROM completed_at - started_at) / 60),
  rpe INT, -- Rate of Perceived Exertion: 1-10
  notes TEXT,
  difficulty_tag VARCHAR, -- 'easy', 'medium', 'hard', 'failed'
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  INDEX user_id_idx (user_id),
  INDEX completed_at_idx (completed_at)
);

-- 5. Set Logs (MODIFIED)
CREATE TABLE set_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL → FOREIGN KEY user_profiles(id),
  workout_log_id UUID NOT NULL → FOREIGN KEY workout_logs(id),
  exercise_name VARCHAR NOT NULL,
  set_number INT NOT NULL,
  reps INT NOT NULL,
  weight DECIMAL,
  calculated_volume DECIMAL COMPUTED (weight * reps),
  rpe INT, -- Per set
  is_pr BOOLEAN DEFAULT false, -- True se è PR
  pr_type VARCHAR, -- 'weight', 'reps', 'volume', 'none'
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  INDEX workout_log_id_idx (workout_log_id),
  INDEX user_id_idx (user_id),
  INDEX exercise_name_idx (exercise_name)
);

-- ===== BODY DATA =====

-- 6. Body Measurements (MODIFIED)
CREATE TABLE body_measurements (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL → FOREIGN KEY user_profiles(id),
  measured_at TIMESTAMP NOT NULL,
  
  -- Core metrics
  weight DECIMAL,
  body_fat DECIMAL, -- Percentage
  arms DECIMAL,
  chest DECIMAL,
  waist DECIMAL,
  hips DECIMAL,
  legs DECIMAL,
  
  -- Metadata
  measurement_method VARCHAR, -- 'manual', 'scale', 'estimation'
  measurement_location VARCHAR, -- 'home', 'gym', 'clinic'
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  INDEX user_id_idx (user_id),
  INDEX measured_at_idx (measured_at)
);

-- ===== ANALYTICS (Materialized Views) =====

-- 7. Workout Session Summary (VIEW)
-- Per ogni sessione: durata, sets, volume totale, PRs
CREATE VIEW workout_session_summary AS
SELECT
  wl.id,
  wl.user_id,
  wl.workout_day,
  wl.started_at,
  wl.completed_at,
  COUNT(DISTINCT sl.id)::INT as total_sets,
  COUNT(DISTINCT sl.exercise_name)::INT as total_exercises,
  ROUND(SUM(sl.calculated_volume)::NUMERIC, 2) as total_volume,
  COUNT(CASE WHEN sl.is_pr THEN 1 END) as new_prs,
  ROUND(AVG(sl.rpe)::NUMERIC, 1) as avg_rpe,
  EXTRACT(EPOCH FROM wl.completed_at - wl.started_at) / 60 as duration_minutes
FROM workout_logs wl
LEFT JOIN set_logs sl ON wl.id = sl.workout_log_id
GROUP BY wl.id;

-- 8. Personal Records (VIEW)
-- Latest PR per esercizio per user
CREATE VIEW personal_records AS
SELECT
  user_id,
  exercise_name,
  MAX(weight) as max_weight,
  (ARRAY_AGG(reps ORDER BY reps DESC))[1] as max_reps_at_max_weight,
  MAX(calculated_volume) as max_volume,
  MAX(created_at) as pr_date,
  MAX(CASE WHEN reps * weight = MAX(calculated_volume) THEN weight END) as pr_weight
FROM set_logs
WHERE weight > 0
GROUP BY user_id, exercise_name;

-- 9. Monthly Summary (VIEW)
-- Per user, per mese: workouts, volume, body changes
CREATE VIEW monthly_summary AS
SELECT
  user_id,
  DATE_TRUNC('month', started_at)::DATE as month,
  COUNT(DISTINCT workout_log_id) as workouts_completed,
  ROUND(SUM(calculated_volume)::NUMERIC, 2) as total_volume,
  ROUND(AVG(duration_minutes)::NUMERIC, 1) as avg_duration,
  COUNT(DISTINCT exercise_name) as unique_exercises
FROM set_logs
GROUP BY user_id, DATE_TRUNC('month', started_at);
```

### **Tier 2: Analytics Avanzati (Nice-to-Have)**

```sql
-- 10. Exercise Difficulty Tracking
CREATE TABLE exercise_difficulty (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  exercise_name VARCHAR NOT NULL,
  difficulty_score DECIMAL, -- 1-10 (calcolato da RPE medio + volume)
  last_done TIMESTAMP,
  created_at TIMESTAMP,
  PRIMARY KEY (user_id, exercise_name)
);

-- 11. Workout Templates (User-defined)
CREATE TABLE workout_templates (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name VARCHAR,
  description TEXT,
  exercises JSONB, -- Array di {name, sets, reps, weight}
  created_at TIMESTAMP,
  is_favorite BOOLEAN DEFAULT false
);

-- 12. Recovery Metrics (Optional)
CREATE TABLE recovery_metrics (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  recorded_date TIMESTAMP,
  sleep_hours DECIMAL,
  stress_level INT, -- 1-10
  soreness_level INT, -- 1-10
  energy_level INT, -- 1-10
  created_at TIMESTAMP
);
```

---

## 🔄 MIGRATION STRATEGY

### **Step 1: Backup dei Dati Attuali**
```sql
-- Esporta tutte le tabelle attuali come backup
SELECT * FROM workout_logs;
SELECT * FROM set_logs;
SELECT * FROM body_measurements;
```

### **Step 2: Aggiungere Colonne Necessarie (Non-breaking)**

```sql
-- Non distruggi i dati, aggiungi solo colonne
ALTER TABLE workout_logs 
  ADD COLUMN user_id UUID,
  ADD COLUMN rpe INT,
  ADD COLUMN notes TEXT,
  ADD COLUMN difficulty_tag VARCHAR;

ALTER TABLE set_logs
  ADD COLUMN user_id UUID,
  ADD COLUMN calculated_volume DECIMAL,
  ADD COLUMN is_pr BOOLEAN DEFAULT false,
  ADD COLUMN pr_type VARCHAR,
  ADD COLUMN notes TEXT;

ALTER TABLE body_measurements
  ADD COLUMN user_id UUID,
  ADD COLUMN measurement_method VARCHAR,
  ADD COLUMN notes TEXT;

-- 2. Popola user_id da auth.users (assumendo single user attualmente)
UPDATE workout_logs SET user_id = auth.uid() WHERE user_id IS NULL;
UPDATE set_logs SET user_id = auth.uid() WHERE user_id IS NULL;
UPDATE body_measurements SET user_id = auth.uid() WHERE user_id IS NULL;

-- 3. Aggiungi NOT NULL constraint
ALTER TABLE workout_logs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE set_logs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE body_measurements ALTER COLUMN user_id SET NOT NULL;

-- 4. Aggiungi indici
CREATE INDEX idx_workout_logs_user_id ON workout_logs(user_id);
CREATE INDEX idx_set_logs_user_id ON set_logs(user_id);
CREATE INDEX idx_body_measurements_user_id ON body_measurements(user_id);
```

### **Step 3: Creare Nuove Tabelle**

Creare le tabelle: `user_profiles`, `user_preferences`, `user_goals`

### **Step 4: Creare Views per Analytics**

Creare le VIEW: `workout_session_summary`, `personal_records`, `monthly_summary`

### **Step 5: Calcolare PR Flag (Backfill)**

```sql
-- Per ogni set, controlla se è PR vs storici
UPDATE set_logs sl
SET is_pr = true,
    pr_type = CASE
      WHEN sl.weight = (SELECT MAX(weight) FROM set_logs WHERE exercise_name = sl.exercise_name AND user_id = sl.user_id) THEN 'weight'
      WHEN sl.reps = (SELECT MAX(reps) FROM set_logs WHERE exercise_name = sl.exercise_name AND weight = sl.weight AND user_id = sl.user_id) THEN 'reps'
      ELSE NULL
    END
WHERE EXISTS (
  SELECT 1 FROM set_logs sl2 
  WHERE sl2.exercise_name = sl.exercise_name 
  AND sl2.created_at < sl.created_at
  AND (sl2.weight < sl.weight OR (sl2.weight = sl.weight AND sl2.reps < sl.reps))
);
```

---

## 📋 TIER DI IMPLEMENTAZIONE

### **Phase 1: Critical (Settimana 1-2)**
- ✅ Aggiungere `user_id` a tutte le tabelle
- ✅ Creare `user_profiles` e `user_preferences`
- ✅ Aggiungere colonne PR tracking
- ✅ Creare VIEW `personal_records`
- ✅ Aggiornare il codice frontend per user_id

### **Phase 2: Important (Settimana 3-4)**
- ✅ Creare `user_goals` table
- ✅ Aggiungere `rpe`, `difficulty_tag`, `notes`
- ✅ Creare VIEW `monthly_summary`
- ✅ Aggiungere indici per performance

### **Phase 3: Nice-to-Have (After MVP)**
- ✅ `workout_templates`
- ✅ `recovery_metrics`
- ✅ `exercise_difficulty` tracking

---

## 🎯 QUERY PATTERNS CHE SERVIRANNO

```typescript
// 1. Get last workout vs current (per suggestions)
SELECT * FROM set_logs 
WHERE user_id = $1 AND exercise_name = $2
ORDER BY created_at DESC
LIMIT 1;

// 2. Get all PRs for user
SELECT * FROM personal_records WHERE user_id = $1;

// 3. Get monthly summary
SELECT * FROM monthly_summary 
WHERE user_id = $1 AND month = CURRENT_DATE;

// 4. Get workout comparison
SELECT * FROM workout_session_summary
WHERE user_id = $1 AND workout_day = $2
ORDER BY started_at DESC
LIMIT 2;

// 5. Get body changes
SELECT 
  DATE_TRUNC('week', measured_at) as week,
  weight, body_fat, waist
FROM body_measurements
WHERE user_id = $1 AND measured_at >= NOW() - INTERVAL '30 days'
ORDER BY measured_at;
```

---

## 📊 IMPATTO SULLE FEATURES

Con questo schema, puoi facilmente implementare:

| Feature | Possibile? | Come |
|---------|-----------|------|
| Dashboard comparison card | ✅ YES | JOIN `workout_session_summary` con ultima + media |
| PR badges in session | ✅ YES | Check `set_logs.is_pr` |
| Body change tracking | ✅ YES | Query `monthly_summary` |
| Analytics page | ✅ YES | Aggregate dalle VIEW |
| Gamification badges | ✅ YES | Computed da query |
| Smart progression | ✅ YES | Analizzare trend di volume/RPE |

---

## 🚨 CRITICAL NEXT STEP

**Devi accedere a Supabase per:**
1. Vedere lo schema ATTUALE (per verificare se user_id esiste già)
2. Confermare relazioni effettive
3. Vedere eventuali custom functions/triggers
4. Fare il backup prima di modificare

**Domande prima di procedere:**
- Hai accesso console Supabase?
- Quanti utenti sono attualmente nel DB?
- Sei sicuro che lo schema è esattamente come descritto nei types.ts?
- Vuoi che mi aiuti a scrivere lo SQL per la migration?

