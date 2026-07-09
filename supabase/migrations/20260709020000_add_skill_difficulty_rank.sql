-- =============================================================================
-- Ordinamento per difficoltà del catalogo skill + split l-sit-v-sit-manna
--
-- Contesto:
--   Il catalogo skill (public.skills) non ha mai avuto un campo di difficoltà:
--   l'ordine mostrato in UI era solo l'ordine di dichiarazione nel file mock
--   src/data/skills.ts. L'utente ha fornito un ordine di difficoltà per
--   categoria, validato manualmente skill per skill.
--
--   Nella categoria "core", l'utente ha richiesto che "l-sit-v-sit-manna"
--   (oggi UNA sola skill con 5 step interni) diventi 3 skill separate
--   (l-sit, v-sit, manna), per poter posizionare "dragon-flag" con un rank
--   intermedio reale fra l-sit e v-sit. Lo slug "l-sit-v-sit-manna" NON è fra
--   i 4 protetti nel commento di src/data/skills.ts (front-lever, handstand,
--   straddle-planche, muscle-up) — nessun dato in user_skill_progress fa
--   riferimento a questo slug (0 righe in tabella), quindi lo split è sicuro.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1) Nuova colonna difficulty_rank
--
-- Scala per categoria (non globale): valori con gap di 10 per lasciare spazio
-- a inserimenti futuri senza rinumerare. Più basso = più facile/propedeutico
-- all'interno della stessa categoria.
-- -----------------------------------------------------------------------------

ALTER TABLE public.skills ADD COLUMN difficulty_rank INTEGER;


-- -----------------------------------------------------------------------------
-- 2) Split "l-sit-v-sit-manna" in l-sit / v-sit / manna
--
-- Cascata automatica: skill_steps.skill_slug e skill_relations.skill_slug/
-- related_skill_slug hanno ON DELETE CASCADE su skills.slug (vedi
-- 20260706120000_add_skill_catalog.sql), quindi eliminare la skill elimina
-- anche i suoi 5 step senza bisogno di DELETE separate.
-- -----------------------------------------------------------------------------

DELETE FROM public.skills WHERE slug = 'l-sit-v-sit-manna';

INSERT INTO public.skills (slug, name, category, type, warning, prerequisite, is_priority, recommended_sets, recommended_rest_seconds, difficulty_rank) VALUES
  ('l-sit', 'L-sit', 'core', 'static', 'Prep: mobilità in compressione (pike), forza flessori dell''anca, polsi.', NULL, false, 3, 60, 10),
  ('v-sit', 'V-sit', 'core', 'static', NULL, NULL, false, 3, 60, 30),
  ('manna', 'Manna', 'core', 'static', '⚠️ Élite: richiede anni di lavoro su L-sit e V-sit solidi prima di approcciarla.', NULL, false, 3, 60, 40);

-- Step di l-sit: riprende i primi 3 step originali di l-sit-v-sit-manna,
-- rinumerati 1-3, l'ultimo marcato come skill completa.
INSERT INTO public.skill_steps (skill_slug, step_order, name, target_type, target_min, target_max, criteria_sessions, notes) VALUES
  ('l-sit', 1, 'Foot-supported / tuck L-sit → one-leg', 'seconds', 12, 15, 3, NULL),
  ('l-sit', 2, 'Full L-sit', 'seconds', 20, 30, 3, 'Criterio per passare alla variante avanzata.'),
  ('l-sit', 3, 'High L-sit / advanced', 'seconds', 12, 15, 3, 'Skill completa: spinta scapolare, bacino più alto.');

-- v-sit e manna restano skill a step singolo, come nel contenuto originale
-- (nessuna sotto-progressione era specificata nel documento sorgente).
INSERT INTO public.skill_steps (skill_slug, step_order, name, target_type, target_min, target_max, criteria_sessions, notes) VALUES
  ('v-sit', 1, 'V-sit', 'seconds', 5, 10, 3, 'Skill completa: gambe più in alto dei fianchi.'),
  ('manna', 1, 'Manna', 'seconds', 5, NULL, 3, 'Skill completa. Élite, compressione estrema (target stimato).');

-- Relazioni di propedeuticità esplicite fra i nuovi step della progressione
-- (già presenti come note testuali negli step originali, ora anche come
-- righe in skill_relations, coerentemente con le altre skill del catalogo).
INSERT INTO public.skill_relations (skill_slug, related_skill_slug, relation_type, note) VALUES
  ('v-sit', 'l-sit', 'prerequisite', 'Serve una Full L-sit (20-30s) solida prima di passare alla V-sit.'),
  ('manna', 'v-sit', 'prerequisite', 'Serve una V-sit solida prima di passare alla Manna.');

-- Backfill next_step_id per i nuovi step (stessa logica generica usata nel
-- seed originale: collega ogni step al successivo nella stessa skill).
UPDATE public.skill_steps AS s
SET next_step_id = nxt.id
FROM public.skill_steps AS nxt
WHERE nxt.skill_slug = s.skill_slug
  AND nxt.step_order = s.step_order + 1;


-- -----------------------------------------------------------------------------
-- 3) Popolamento difficulty_rank per tutte le skill esistenti (invariate)
-- -----------------------------------------------------------------------------

-- statiche-spinta
UPDATE public.skills SET difficulty_rank = 10 WHERE slug = 'elbow-lever';
UPDATE public.skills SET difficulty_rank = 20 WHERE slug = 'handstand';
UPDATE public.skills SET difficulty_rank = 30 WHERE slug = 'straddle-planche';
UPDATE public.skills SET difficulty_rank = 40 WHERE slug = 'one-arm-handstand';

-- statiche-trazione
UPDATE public.skills SET difficulty_rank = 10 WHERE slug = 'front-lever';
UPDATE public.skills SET difficulty_rank = 20 WHERE slug = 'back-lever';
UPDATE public.skills SET difficulty_rank = 30 WHERE slug = 'human-flag';
UPDATE public.skills SET difficulty_rank = 40 WHERE slug = 'iron-cross';

-- core: dragon-flag si inserisce fra l-sit (10) e v-sit (30), già inserite sopra
UPDATE public.skills SET difficulty_rank = 20 WHERE slug = 'dragon-flag';

-- dinamiche-trazione
UPDATE public.skills SET difficulty_rank = 10 WHERE slug = 'muscle-up';
UPDATE public.skills SET difficulty_rank = 20 WHERE slug = 'front-lever-pullup';
UPDATE public.skills SET difficulty_rank = 30 WHERE slug = 'archer-oap';
UPDATE public.skills SET difficulty_rank = 40 WHERE slug = 'hefesto';

-- dinamiche-spinta
UPDATE public.skills SET difficulty_rank = 10 WHERE slug = 'hspu';
UPDATE public.skills SET difficulty_rank = 20 WHERE slug = 'one-arm-pushup';
UPDATE public.skills SET difficulty_rank = 30 WHERE slug = 'tiger-bend';
UPDATE public.skills SET difficulty_rank = 40 WHERE slug = 'press-to-handstand';
UPDATE public.skills SET difficulty_rank = 50 WHERE slug = 'impossible-dip';
UPDATE public.skills SET difficulty_rank = 60 WHERE slug = '90-degree-pushup';

-- gambe
UPDATE public.skills SET difficulty_rank = 10 WHERE slug = 'pistol-squat';
UPDATE public.skills SET difficulty_rank = 20 WHERE slug = 'shrimp-squat';
UPDATE public.skills SET difficulty_rank = 30 WHERE slug = 'dragon-squat';

-- Da qui in avanti ogni nuova skill deve specificare difficulty_rank in fase
-- di inserimento: nessun DEFAULT/NOT NULL applicato per non rompere flussi
-- futuri che non lo impostano subito, ma va tenuto a mente in review.

-- =============================================================================
-- FINE MIGRATION
-- =============================================================================
