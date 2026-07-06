-- Catalogo di riferimento delle skill calisthenics (contenuto statico da
-- progressioni_skill.md), ora anche come dati DB e non solo come costante
-- TypeScript (src/data/skills.ts, che resta la fonte usata dall'app).
--
-- Struttura relazionale:
-- - skills: una riga per skill (Front Lever, Handstand, ...).
-- - skill_steps: gli step di ogni skill, con next_step_id che collega
--   esplicitamente ogni step al successivo (il "prossimo allenamento da
--   fare" dopo aver chiuso lo step corrente). L'ultimo step di ogni skill
--   ha next_step_id NULL (skill completa, nessun passo successivo).
-- - skill_relations: collegamenti fra skill diverse (prerequisito o
--   propedeutica), come indicato esplicitamente nel documento
--   (es. "Front Lever Pull-up" richiede il Front Lever statico).
--
-- Dati di sola lettura condivisi fra utenti (come body_parts/exercise_ai_info):
-- RLS abilitata con policy di sola SELECT per utenti autenticati, nessuna
-- policy di scrittura (il contenuto si aggiorna solo via nuove migration).

CREATE TABLE public.skills (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('static', 'dynamic', 'eccentric')),
  warning TEXT,
  prerequisite TEXT,
  is_priority BOOLEAN NOT NULL DEFAULT false,
  recommended_sets INTEGER NOT NULL,
  recommended_rest_seconds INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.skill_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_slug TEXT NOT NULL REFERENCES public.skills(slug) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('seconds', 'reps')),
  target_min INTEGER NOT NULL,
  target_max INTEGER,
  criteria_sessions INTEGER NOT NULL,
  notes TEXT,
  -- Riferimento esplicito allo step successivo: backfillato sotto dopo il
  -- seed, così ogni step "sa" qual è il prossimo allenamento da fare.
  next_step_id UUID REFERENCES public.skill_steps(id),
  UNIQUE (skill_slug, step_order)
);

CREATE TABLE public.skill_relations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_slug TEXT NOT NULL REFERENCES public.skills(slug) ON DELETE CASCADE,
  related_skill_slug TEXT NOT NULL REFERENCES public.skills(slug) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('prerequisite', 'propedeutico')),
  note TEXT,
  UNIQUE (skill_slug, related_skill_slug)
);

CREATE INDEX idx_skill_steps_skill ON public.skill_steps(skill_slug, step_order);
CREATE INDEX idx_skill_relations_skill ON public.skill_relations(skill_slug);

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "skills_select_authenticated" ON public.skills FOR SELECT TO authenticated USING (true);
CREATE POLICY "skill_steps_select_authenticated" ON public.skill_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "skill_relations_select_authenticated" ON public.skill_relations FOR SELECT TO authenticated USING (true);

-- ============================================================
-- SEED — generato da src/data/skills.ts per garantire fedeltà 1:1
-- con progressioni_skill.md (23 skill, 108 step, 10 collegamenti).
-- ============================================================

INSERT INTO public.skills (slug, name, category, type, warning, prerequisite, is_priority, recommended_sets, recommended_rest_seconds) VALUES
  ('handstand', 'Handstand / Verticale', 'statiche-spinta', 'static', 'Prep obbligatoria: condizionamento polsi + mobilità spalle.', NULL, true, 3, 90),
  ('one-arm-handstand', 'One Arm Handstand (OAH)', 'statiche-spinta', 'static', 'Élite. Prereq: freestanding handstand di 60s+ con controllo perfetto.', NULL, false, 3, 120),
  ('elbow-lever', 'Elbow Lever', 'statiche-spinta', 'static', 'Prep: condizionamento polsi.', NULL, false, 3, 60),
  ('straddle-planche', 'Planche', 'statiche-spinta', 'static', 'Prep obbligatoria ogni volta: condizionamento polsi + verticale solida.', NULL, true, 3, 120),
  ('front-lever', 'Front Lever', 'statiche-trazione', 'static', 'Prep: active/scapular hang, skin the cat controllato.', NULL, true, 3, 90),
  ('back-lever', 'Back Lever', 'statiche-trazione', 'static', '⚠️ Stressa spalle e bicipiti in estensione. Riscalda bene, entra gradualmente nel German hang.', NULL, false, 3, 90),
  ('human-flag', 'Human Flag / Bandiera', 'statiche-trazione', 'static', 'Serve un palo verticale o due sbarre. Prep: obliqui, dorsali, presa.', NULL, false, 3, 90),
  ('iron-cross', 'Iron Cross', 'statiche-trazione', 'static', '⚠️ ÉLITE ad alto rischio: enorme stress su gomiti e tendini bicipiti/pettorali. Serve condizionamento tendineo di anni e idealmente un coach. Non forzare.', NULL, false, 3, 150),
  ('l-sit-v-sit-manna', 'L-sit → V-sit → Manna', 'core', 'static', 'Prep: mobilità in compressione (pike), forza flessori dell''anca, polsi.', NULL, false, 3, 60),
  ('dragon-flag', 'Dragon Flag', 'core', 'static', 'Ottimo propedeutico per il Front Lever: allena catena posteriore e core in estensione.', NULL, false, 3, 90),
  ('muscle-up', 'Muscle-up', 'dinamiche-trazione', 'dynamic', NULL, '10-12 trazioni strict al petto (sterno) + 12-15 dip profonde alle parallele.', true, 4, 120),
  ('archer-oap', 'Archer Pull-up → One-arm Pull-up', 'dinamiche-trazione', 'dynamic', NULL, '1 trazione zavorrata con +50% del peso corporeo.', false, 4, 120),
  ('front-lever-pullup', 'Front Lever Pull-up / FL Touch', 'dinamiche-trazione', 'dynamic', 'Trazione orizzontale dinamica. Prereq: Front Lever statico solido (10s+).', NULL, false, 4, 120),
  ('hefesto', 'Hefesto', 'dinamiche-trazione', 'eccentric', '⚠️ Élite. Estremamente stressante per bicipiti e spalla in estensione. Prereq: German hang + Back lever solidi.', '10 German Hang completi (entrata/uscita controllata) + 5 Pelican Push-ups profondi.', false, 4, 150),
  ('hspu', 'Handstand Push-up (HSPU)', 'dinamiche-spinta', 'dynamic', 'Prereq: verticale al muro solida + pike push-up forti.', NULL, false, 4, 120),
  ('one-arm-pushup', 'One-arm Push-up', 'dinamiche-spinta', 'dynamic', NULL, NULL, false, 4, 90),
  ('press-to-handstand', 'Press to Handstand', 'dinamiche-spinta', 'dynamic', 'Bilanciamento + forza spalle + flessibilità attiva (compressione). Prereq: Handstand solida freestanding.', '30 secondi di verticale libera stabile + mobilità di Pike/Straddle a terra.', false, 4, 120),
  ('tiger-bend', 'Tiger Bend', 'dinamiche-spinta', 'eccentric', 'Transizione dinamica tra Handstand e Forearm Stand. Prereq: stabilità su entrambe le tenute.', NULL, false, 4, 120),
  ('90-degree-pushup', '90-Degree Push-up', 'dinamiche-spinta', 'eccentric', 'Élite. Handstand to Planche Push-up. Prereq: HSPU + Planche Lean solidi.', NULL, false, 4, 150),
  ('impossible-dip', 'Impossible Dip', 'dinamiche-spinta', 'eccentric', '⚠️ Élite. Forza estrema nei tricipiti e stabilità dei gomiti. Prereq: Dip zavorrate forti (+50% BW).', NULL, false, 4, 150),
  ('pistol-squat', 'Pistol Squat', 'gambe', 'dynamic', NULL, NULL, false, 4, 90),
  ('shrimp-squat', 'Shrimp Squat (Airborne Squat)', 'gambe', 'dynamic', NULL, NULL, false, 4, 90),
  ('dragon-squat', 'Dragon Squat', 'gambe', 'dynamic', 'Prereq: Pistol e Shrimp squat solidi. Richiede estrema mobilità di anca e caviglia.', NULL, false, 4, 90);

INSERT INTO public.skill_steps (skill_slug, step_order, name, target_type, target_min, target_max, criteria_sessions, notes) VALUES
  ('handstand', 1, 'Hollow hold + pike hold', 'seconds', 30, NULL, 2, 'Core e allineamento, base di partenza.'),
  ('handstand', 2, 'Handstand pancia al muro', 'seconds', 30, 45, 3, 'Sali "a salire", hold progressivo.'),
  ('handstand', 3, 'Bail out / Pirouette', 'reps', 5, NULL, 2, 'Uscita di sicurezza ruotando su un braccio: elimina la paura di cadere all''indietro.'),
  ('handstand', 4, 'Handstand schiena al muro', 'seconds', 20, 30, 3, 'Cerca l''allineamento: petto al muro per correggere l''arco.'),
  ('handstand', 5, 'Wall shoulder taps', 'reps', 8, 10, 3, 'Tocchi alternati sulle spalle in verticale al muro: stabilità e resistenza scapolare.'),
  ('handstand', 6, 'Kick-up e ricerca equilibrio', 'seconds', 10, 15, 3, 'Pressione delle dita a terra per bilanciare.'),
  ('handstand', 7, 'Freestanding handstand', 'seconds', 30, NULL, 3, 'Skill completa: hold libero 30s+.'),
  ('one-arm-handstand', 1, 'Side-to-side weight shifts', 'reps', 8, 10, 3, 'Spostamenti di carico da una mano all''altra in verticale.'),
  ('one-arm-handstand', 2, 'Finger-assisted OAH', 'seconds', 8, 10, 3, 'Rimuovi progressivamente le dita della mano di supporto: 5 → 3 → 1 → sfioramento.'),
  ('one-arm-handstand', 3, 'Straddle OAH', 'seconds', 5, 8, 3, 'Gambe divaricate per abbassare il baricentro e facilitare il bilanciamento.'),
  ('one-arm-handstand', 4, 'Full OAH', 'seconds', 5, NULL, 3, 'Skill completa: hold di 5s+ su un braccio solo, gambe unite.'),
  ('elbow-lever', 1, 'Piazzamento mani e gomiti', 'seconds', 12, 15, 3, 'Dita in fuori, gomiti piantati nell''addome/anca.'),
  ('elbow-lever', 2, 'Tuck / one-leg elbow lever', 'seconds', 12, 15, 3, NULL),
  ('elbow-lever', 3, 'Full elbow lever', 'seconds', 15, 20, 3, 'Skill completa: gambe tese. Soprattutto equilibrio + tolleranza polsi.'),
  ('straddle-planche', 1, 'Planche lean', 'seconds', 15, 20, 3, 'Spalle avanti oltre le mani finché i piedi si alleggeriscono. Il mattone (prova anche a piedi rialzati).'),
  ('straddle-planche', 2, 'Tuck planche', 'seconds', 12, 15, 3, 'Ginocchia raccolte, braccia tese, spalle protratte, bacino sopra le spalle.'),
  ('straddle-planche', 3, 'Advanced tuck planche', 'seconds', 12, 15, 3, 'Anca aperta, schiena piatta e parallela. Step lungo.'),
  ('straddle-planche', 4, 'One-leg planche', 'seconds', 12, 15, 3, 'Una gamba tesa in linea col corpo, l''altra raccolta. Alternare le gambe.'),
  ('straddle-planche', 5, 'Half lay planche', 'seconds', 10, 12, 3, 'Fianchi estesi, ginocchia piegate a 90° all''indietro (leva ridotta).'),
  ('straddle-planche', 6, 'Straddle planche', 'seconds', 5, 10, 3, 'Skill completa: gambe tese e aperte, corpo parallelo. Oltre (élite, anni): full → maltese → victorian.'),
  ('front-lever', 1, 'Tuck FL raise → tuck FL hold', 'seconds', 12, 15, 3, 'Schiena orizzontale, ginocchia raccolte.'),
  ('front-lever', 2, 'Advanced tuck front lever', 'seconds', 12, 15, 3, 'Anca aperta, schiena piatta.'),
  ('front-lever', 3, 'Front lever negative', 'reps', 3, 5, 3, 'Sali in inverted hang, scendi controllando al massimo (6-8s) fino a corpo teso.'),
  ('front-lever', 4, 'One-leg front lever', 'seconds', 12, 15, 3, 'Una gamba tesa in linea, l''altra raccolta. Alternare.'),
  ('front-lever', 5, 'Half lay front lever', 'seconds', 10, 12, 3, 'Corpo dritto da spalle a ginocchia, gambe piegate a 90° all''indietro.'),
  ('front-lever', 6, 'Straddle front lever', 'seconds', 12, 15, 3, NULL),
  ('front-lever', 7, 'Full front lever', 'seconds', 10, NULL, 3, 'Skill completa: hold ~10s, corpo dritto. In parallelo: front lever raise + row.'),
  ('back-lever', 1, 'German hang', 'seconds', 15, 20, 3, 'Skin the cat fino in basso, tenuta per la tolleranza della spalla.'),
  ('back-lever', 2, 'Tuck back lever', 'seconds', 12, 15, 3, 'Da inverted hang scendi a orizzontale, ginocchia raccolte.'),
  ('back-lever', 3, 'Advanced tuck back lever', 'seconds', 12, 15, 3, NULL),
  ('back-lever', 4, 'Straddle back lever', 'seconds', 12, 15, 3, NULL),
  ('back-lever', 5, 'Full back lever', 'seconds', 5, 10, 3, 'Skill completa.'),
  ('human-flag', 1, 'Confidenza con la presa', 'seconds', 10, 15, 2, 'Mano alta tira, mano bassa spinge.'),
  ('human-flag', 2, 'Flag leans / Kick-offs', 'reps', 5, NULL, 3, 'Piccoli slanci staccando i piedi da terra per 1-2s, imparando a spingere col braccio inferiore.'),
  ('human-flag', 3, 'Vertical flag / chamber', 'seconds', 12, 15, 3, 'Corpo verticale, gambe su.'),
  ('human-flag', 4, 'Tuck flag', 'seconds', 12, 15, 3, 'Ginocchia raccolte, corpo verso l''orizzontale.'),
  ('human-flag', 5, 'Straddle flag', 'seconds', 12, 15, 3, 'Gambe aperte.'),
  ('human-flag', 6, 'Full flag', 'seconds', 5, 10, 3, 'Skill completa. In parallelo: flag raises.'),
  ('iron-cross', 1, 'Ring support (RTO) + ring dip', 'seconds', 15, 20, 3, 'Solidissimo, più ring dip forti.'),
  ('iron-cross', 2, 'Prep croce con elastico / anelli bassi', 'seconds', 10, 12, 3, 'Piedi a terra.'),
  ('iron-cross', 3, 'Negative assistite', 'reps', 3, 5, 3, 'Dal support verso la croce, controllate.'),
  ('iron-cross', 4, 'Assistenza ridotta', 'seconds', 8, 10, 3, 'Elastico progressivamente più leggero.'),
  ('iron-cross', 5, 'Iron cross hold', 'seconds', 5, 8, 3, 'Skill completa (target stimato, il documento non specifica un numero esatto).'),
  ('l-sit-v-sit-manna', 1, 'Foot-supported / tuck L-sit → one-leg', 'seconds', 12, 15, 3, NULL),
  ('l-sit-v-sit-manna', 2, 'Full L-sit', 'seconds', 20, 30, 3, 'Criterio per passare alla V-sit.'),
  ('l-sit-v-sit-manna', 3, 'High L-sit / advanced', 'seconds', 12, 15, 3, 'Spinta scapolare, bacino più alto.'),
  ('l-sit-v-sit-manna', 4, 'V-sit', 'seconds', 5, 10, 3, 'Gambe più in alto dei fianchi. Criterio per passare alla Manna.'),
  ('l-sit-v-sit-manna', 5, 'Manna', 'seconds', 5, NULL, 3, 'Élite, compressione estrema (target stimato).'),
  ('dragon-flag', 1, 'Leg raise alla spalliera/sbarra', 'reps', 8, 10, 3, 'Forza base di compressione.'),
  ('dragon-flag', 2, 'Dragon Flag Tuck', 'seconds', 8, 10, 3, 'Ginocchia al petto, solleva il bacino e controlla la discesa.'),
  ('dragon-flag', 3, 'Dragon Flag One-Leg / Advanced', 'seconds', 8, 10, 3, 'Una gamba tesa, una raccolta per aumentare la leva.'),
  ('dragon-flag', 4, 'Dragon Flag eccentrica', 'reps', 3, 5, 3, 'Sali a candela, scendi alla massima lentezza (6-8s) a corpo teso.'),
  ('dragon-flag', 5, 'Full Dragon Flag', 'seconds', 5, NULL, 3, 'Skill completa: hold o reps sfiorando panca/terra a corpo teso.'),
  ('muscle-up', 1, 'Base: trazioni e dip', 'reps', 10, NULL, 2, '10+ trazioni strict, 10+ dip.'),
  ('muscle-up', 2, 'Trazione esplosiva (high pull-up)', 'reps', 3, 5, 3, 'Sterno/pancia alla sbarra, 4-5 serie × 3-5.'),
  ('muscle-up', 3, 'False grip + negative di muscle-up', 'reps', 3, 5, 3, 'Negative lente attraverso la transizione (anelli).'),
  ('muscle-up', 4, 'Drill transizione', 'reps', 6, 8, 3, 'Baby muscle-up a sbarra bassa, russian dips, straight bar dips.'),
  ('muscle-up', 5, 'Band-assisted muscle-up', 'reps', 6, 8, 3, 'Loop band sotto i piedi per alleggerire la transizione e apprenderne la dinamica.'),
  ('muscle-up', 6, 'Muscle-up strict', 'reps', 6, 8, 3, 'Skill completa: muscle-up completo → strict, controllato per reps.'),
  ('archer-oap', 1, 'Trazioni zavorrate', 'reps', 6, 8, 3, 'Verso +40-50% del peso corporeo.'),
  ('archer-oap', 2, 'One-arm scapular pull-ups', 'reps', 6, 8, 3, 'Appeso a un braccio, sollevati contraendo solo la scapola: protegge la spalla e prepara i tendini.'),
  ('archer-oap', 3, 'Archer pull-up', 'reps', 6, 8, 3, 'Un braccio tira, l''altro teso assiste sulla sbarra.'),
  ('archer-oap', 4, 'One-arm assistita', 'reps', 6, 8, 3, 'Asciugamano/elastico sull''avambraccio che lavora.'),
  ('archer-oap', 5, 'One-arm negative', 'reps', 3, 5, 3, 'Discesa lenta a un braccio, controllata (6-8s).'),
  ('archer-oap', 6, 'One-arm pull-up', 'reps', 1, NULL, 3, 'Skill completa. Tra le dinamiche più dure: spesso richiede zavorra vicina al peso corporeo.'),
  ('front-lever-pullup', 1, 'Tuck / Advanced Tuck FL pull-ups', 'reps', 6, 8, 3, 'Trazioni in posizione raccolta toccando la sbarra con la pancia.'),
  ('front-lever-pullup', 2, 'Straddle FL pull-ups', 'reps', 6, 8, 3, NULL),
  ('front-lever-pullup', 3, 'L-sit to Front Lever Touch', 'reps', 6, 8, 3, 'Transizione dinamica concentrica.'),
  ('front-lever-pullup', 4, 'Full Front Lever pull-up', 'reps', 3, 5, 3, 'Skill completa: trazione in FL completo toccando la sbarra col bacino/pancia (target stimato).'),
  ('hefesto', 1, 'Pelican push-ups', 'reps', 5, 8, 3, 'Flessioni profonde agli anelli/parallele scendendo oltre il livello dell''appoggio.'),
  ('hefesto', 2, 'Hefesto negative', 'reps', 3, 5, 3, 'Da sopra la sbarra, scendi controllando al massimo l''eccentrica (6-8s).'),
  ('hefesto', 3, 'Hefesto assistito', 'reps', 3, 5, 3, 'Elastico sotto i piedi o piedi a terra per ridurre il peso corporeo.'),
  ('hefesto', 4, 'Hefesto completo', 'reps', 3, 5, 3, 'Skill completa (target stimato).'),
  ('hspu', 1, 'Pike push-up → elevated pike', 'reps', 6, 8, 3, 'Piedi rialzati.'),
  ('hspu', 2, 'Wall HSPU ROM parziale → completo', 'reps', 6, 8, 3, NULL),
  ('hspu', 3, 'Deficit wall HSPU', 'reps', 6, 8, 3, 'Mani su rialzi/parallettes per più ROM.'),
  ('hspu', 4, 'Freestanding HSPU', 'reps', 6, 8, 3, 'Skill completa: HSPU a ROM completo (prima al muro, poi libera).'),
  ('one-arm-pushup', 1, 'Push-up standard forti', 'reps', 20, NULL, 2, NULL),
  ('one-arm-pushup', 2, 'Archer push-up', 'reps', 6, 8, 3, NULL),
  ('one-arm-pushup', 3, 'Uneven / assistito', 'reps', 6, 8, 3, 'Una mano rialzata.'),
  ('one-arm-pushup', 4, 'One-arm base larga → stretta', 'reps', 6, 8, 3, NULL),
  ('one-arm-pushup', 5, 'One-arm push-up', 'reps', 6, 8, 3, 'Skill completa.'),
  ('press-to-handstand', 1, 'Pike/Straddle compression drills', 'reps', 6, 8, 3, 'Sollevamenti gambe da seduti a terra.'),
  ('press-to-handstand', 2, 'Pike Press assistito al muro', 'reps', 6, 8, 3, 'Schiena al muro, cammina con i piedi verso le mani.'),
  ('press-to-handstand', 3, 'Straddle Press con piedi rialzati', 'reps', 6, 8, 3, 'Piedi su box/sedia per ridurre il ROM iniziale.'),
  ('press-to-handstand', 4, 'Straddle Press eccentrico', 'reps', 3, 5, 3, 'Dalla verticale scendi rallentando al massimo (6-8s) fino a sfiorare terra.'),
  ('press-to-handstand', 5, 'Full Straddle Press to Handstand', 'reps', 3, 5, 3, 'Skill completa, poi Pike Press a gambe unite.'),
  ('tiger-bend', 1, 'Tiger Bend eccentrico al muro', 'reps', 3, 5, 3, 'Dalla verticale scendi controllando l''appoggio dei gomiti (6-8s).'),
  ('tiger-bend', 2, 'Tiger Bend assistito al muro', 'reps', 3, 5, 3, 'Push-up dai gomiti per tornare in verticale.'),
  ('tiger-bend', 3, 'Tiger Bend eccentrico freestanding', 'reps', 3, 5, 3, NULL),
  ('tiger-bend', 4, 'Full Tiger Bend', 'reps', 3, 5, 3, 'Skill completa (target stimato).'),
  ('90-degree-pushup', 1, 'HSPU con traiettoria inclinata', 'reps', 6, 8, 3, 'Sbilanciandosi in avanti durante la discesa.'),
  ('90-degree-pushup', 2, '90-Degree eccentriche assistite', 'reps', 3, 5, 3, 'Con elastico o al muro (discesa 6-8s).'),
  ('90-degree-pushup', 3, '90-Degree eccentriche freestanding', 'reps', 3, 5, 3, 'Scendi in planche a gomiti flessi e mantieni la posizione.'),
  ('90-degree-pushup', 4, '90-Degree Push-up completo', 'reps', 3, 5, 3, 'Skill completa (target stimato).'),
  ('impossible-dip', 1, 'Russian dips', 'reps', 6, 8, 3, 'Transizione su sbarra/parallele appoggiando gli avambracci.'),
  ('impossible-dip', 2, 'Impossible Dip eccentrico', 'reps', 3, 5, 3, 'Scendi controllando la discesa (6-8s) portando i gomiti all''indietro.'),
  ('impossible-dip', 3, 'Impossible Dip assistito con elastico', 'reps', 3, 5, 3, NULL),
  ('impossible-dip', 4, 'Full Impossible Dip', 'reps', 3, 5, 3, 'Skill completa (target stimato).'),
  ('pistol-squat', 1, 'Squat a una gamba assistito', 'reps', 6, 8, 3, 'Tenendosi a un palo, TRX o anelli.'),
  ('pistol-squat', 2, 'Box Pistol Squat', 'reps', 6, 8, 3, 'Scendi su un box/rialzo progressivamente più basso.'),
  ('pistol-squat', 3, 'Pistol Squat eccentrico', 'reps', 3, 5, 3, 'Discesa controllata (6-8s) a una gamba, risali a due gambe.'),
  ('pistol-squat', 4, 'Full Pistol Squat', 'reps', 6, 8, 3, 'Skill completa.'),
  ('shrimp-squat', 1, 'Knee-touch Shrimp Squat', 'reps', 6, 8, 3, 'Solo il ginocchio posteriore tocca terra, il piede resta sollevato.'),
  ('shrimp-squat', 2, 'Shrimp Squat classico', 'reps', 6, 8, 3, 'Afferra la caviglia posteriore con la mano dello stesso lato.'),
  ('shrimp-squat', 3, 'Deficit Shrimp Squat', 'reps', 6, 8, 3, 'Eseguito su un rialzo per aumentare il ROM. Skill completa.'),
  ('dragon-squat', 1, 'Dragon Squat assistito', 'reps', 3, 5, 3, 'Tenendosi a un supporto laterale per stabilizzare la discesa.'),
  ('dragon-squat', 2, 'Full Dragon Squat', 'reps', 3, 5, 3, 'Skill completa: la gamba libera incrocia dietro e di lato senza mai toccare terra.');

INSERT INTO public.skill_relations (skill_slug, related_skill_slug, relation_type, note) VALUES
  ('one-arm-handstand', 'handstand', 'prerequisite', 'Serve una freestanding handstand di 60s+ con controllo perfetto.'),
  ('front-lever', 'dragon-flag', 'propedeutico', 'Ottimo propedeutico: allena catena posteriore e core in estensione.'),
  ('front-lever-pullup', 'front-lever', 'prerequisite', 'Serve un Front Lever statico solido (10s+).'),
  ('hefesto', 'back-lever', 'prerequisite', 'Serve un Back Lever solido (comprende il German hang).'),
  ('press-to-handstand', 'handstand', 'prerequisite', 'Serve una handstand solida freestanding (30s+).'),
  ('tiger-bend', 'handstand', 'prerequisite', 'Serve stabilità in handstand prima di lavorare la transizione.'),
  ('90-degree-pushup', 'hspu', 'prerequisite', 'Serve un HSPU solido.'),
  ('90-degree-pushup', 'straddle-planche', 'prerequisite', 'Serve una Planche Lean solida.'),
  ('dragon-squat', 'pistol-squat', 'prerequisite', 'Serve un Pistol Squat solido.'),
  ('dragon-squat', 'shrimp-squat', 'prerequisite', 'Serve uno Shrimp Squat solido.');

-- Backfill di next_step_id: collega ogni step al successivo nella stessa
-- skill (stesso skill_slug, step_order + 1). L'ultimo step di ogni skill
-- resta NULL: non c'è un "prossimo allenamento", la skill è completa.
UPDATE public.skill_steps AS s
SET next_step_id = nxt.id
FROM public.skill_steps AS nxt
WHERE nxt.skill_slug = s.skill_slug
  AND nxt.step_order = s.step_order + 1;
