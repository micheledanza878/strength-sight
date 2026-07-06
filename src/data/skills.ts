/**
 * Catalogo statico delle skill calisthenics, con i relativi step di
 * progressione. Contenuto preso da progressioni_skill.md (versione estesa).
 *
 * Regole valide per tutte le skill:
 * - da fresco, a inizio seduta, prima dell'ipertrofia (skill neurologiche)
 * - mai a cedimento: fermati quando la tecnica peggiora
 * - 2-3 volte a settimana, volume basso
 * - deload ogni 6-8 settimane
 * - non allenarle tutte insieme: 1-3 skill per ciclo
 *
 * Criteri di avanzamento (dal documento):
 * - Statiche (tenute isometriche): 12-15s per 3 serie, per 2-3 sedute consecutive.
 * - Dinamiche (ripetizioni): 6-8 reps a ROM completo con eccentrica di 2s, per 3-4 serie.
 * - Eccentriche (negative): 3-5 reps con discesa controllata di almeno 6-8s.
 *
 * NOTA SUGLI SLUG: front-lever, handstand, straddle-planche e muscle-up sono
 * stabili da prima di questo aggiornamento — non rinominarli, anche se il
 * contenuto degli step cambia, per non rompere eventuali dati già salvati in
 * user_skill_progress / set_logs per utenti che le hanno già in scheda.
 */

export type SkillCategory =
  | "statiche-spinta"
  | "statiche-trazione"
  | "core"
  | "dinamiche-trazione"
  | "dinamiche-spinta"
  | "gambe";

export type SkillType = "static" | "dynamic" | "eccentric";

export interface SkillStep {
  order: number;
  name: string;
  targetType: "seconds" | "reps";
  targetMin: number;
  targetMax?: number;
  /** Sedute consecutive a target richieste prima di avanzare allo step successivo. */
  criteriaSessions: number;
  notes?: string;
}

export type SkillRelationType = "prerequisite" | "propedeutico";

export interface SkillRelation {
  /** slug dell'altra skill collegata */
  slug: string;
  type: SkillRelationType;
  note: string;
}

export interface Skill {
  slug: string;
  name: string;
  category: SkillCategory;
  type: SkillType;
  warning?: string;
  /** Prerequisito di sblocco specifico (sezione 4 del documento), se presente. */
  prerequisite?: string;
  /** true per le 4 skill consigliate ora; le altre restano un menù per cicli futuri. */
  isPriority?: boolean;
  /** Altre skill del catalogo collegate a questa (prerequisito o propedeutica). */
  relatedSkills?: SkillRelation[];
  recommendedSets: number;
  recommendedRestSeconds: number;
  steps: SkillStep[];
}

export const ELITE_FAST_TRACK_NOTE =
  "Nota élite: puoi approcciare lo step successivo (con assistenza elastico o solo in negativa) con una tenuta solida di almeno 8-10s dello step precedente.";

export const SKILLS: Skill[] = [
  // ── STATICHE — SPINTA ───────────────────────────────────────────
  {
    slug: "handstand",
    name: "Handstand / Verticale",
    category: "statiche-spinta",
    type: "static",
    isPriority: true,
    recommendedSets: 3,
    recommendedRestSeconds: 90,
    warning: "Prep obbligatoria: condizionamento polsi + mobilità spalle.",
    steps: [
      { order: 1, name: "Hollow hold + pike hold", targetType: "seconds", targetMin: 30, criteriaSessions: 2, notes: "Core e allineamento, base di partenza." },
      { order: 2, name: "Handstand pancia al muro", targetType: "seconds", targetMin: 30, targetMax: 45, criteriaSessions: 3, notes: "Sali \"a salire\", hold progressivo." },
      { order: 3, name: "Bail out / Pirouette", targetType: "reps", targetMin: 5, criteriaSessions: 2, notes: "Uscita di sicurezza ruotando su un braccio: elimina la paura di cadere all'indietro." },
      { order: 4, name: "Handstand schiena al muro", targetType: "seconds", targetMin: 20, targetMax: 30, criteriaSessions: 3, notes: "Cerca l'allineamento: petto al muro per correggere l'arco." },
      { order: 5, name: "Wall shoulder taps", targetType: "reps", targetMin: 8, targetMax: 10, criteriaSessions: 3, notes: "Tocchi alternati sulle spalle in verticale al muro: stabilità e resistenza scapolare." },
      { order: 6, name: "Kick-up e ricerca equilibrio", targetType: "seconds", targetMin: 10, targetMax: 15, criteriaSessions: 3, notes: "Pressione delle dita a terra per bilanciare." },
      { order: 7, name: "Freestanding handstand", targetType: "seconds", targetMin: 30, criteriaSessions: 3, notes: "Skill completa: hold libero 30s+." },
    ],
  },
  {
    slug: "one-arm-handstand",
    name: "One Arm Handstand (OAH)",
    category: "statiche-spinta",
    type: "static",
    warning: "Élite. Prereq: freestanding handstand di 60s+ con controllo perfetto.",
    relatedSkills: [
      { slug: "handstand", type: "prerequisite", note: "Serve una freestanding handstand di 60s+ con controllo perfetto." },
    ],
    recommendedSets: 3,
    recommendedRestSeconds: 120,
    steps: [
      { order: 1, name: "Side-to-side weight shifts", targetType: "reps", targetMin: 8, targetMax: 10, criteriaSessions: 3, notes: "Spostamenti di carico da una mano all'altra in verticale." },
      { order: 2, name: "Finger-assisted OAH", targetType: "seconds", targetMin: 8, targetMax: 10, criteriaSessions: 3, notes: "Rimuovi progressivamente le dita della mano di supporto: 5 → 3 → 1 → sfioramento." },
      { order: 3, name: "Straddle OAH", targetType: "seconds", targetMin: 5, targetMax: 8, criteriaSessions: 3, notes: "Gambe divaricate per abbassare il baricentro e facilitare il bilanciamento." },
      { order: 4, name: "Full OAH", targetType: "seconds", targetMin: 5, criteriaSessions: 3, notes: "Skill completa: hold di 5s+ su un braccio solo, gambe unite." },
    ],
  },
  {
    slug: "elbow-lever",
    name: "Elbow Lever",
    category: "statiche-spinta",
    type: "static",
    recommendedSets: 3,
    recommendedRestSeconds: 60,
    warning: "Prep: condizionamento polsi.",
    steps: [
      { order: 1, name: "Piazzamento mani e gomiti", targetType: "seconds", targetMin: 12, targetMax: 15, criteriaSessions: 3, notes: "Dita in fuori, gomiti piantati nell'addome/anca." },
      { order: 2, name: "Tuck / one-leg elbow lever", targetType: "seconds", targetMin: 12, targetMax: 15, criteriaSessions: 3 },
      { order: 3, name: "Full elbow lever", targetType: "seconds", targetMin: 15, targetMax: 20, criteriaSessions: 3, notes: "Skill completa: gambe tese. Soprattutto equilibrio + tolleranza polsi." },
    ],
  },
  {
    slug: "straddle-planche",
    name: "Planche",
    category: "statiche-spinta",
    type: "static",
    isPriority: true,
    recommendedSets: 3,
    recommendedRestSeconds: 120,
    warning: "Prep obbligatoria ogni volta: condizionamento polsi + verticale solida.",
    steps: [
      { order: 1, name: "Planche lean", targetType: "seconds", targetMin: 15, targetMax: 20, criteriaSessions: 3, notes: "Spalle avanti oltre le mani finché i piedi si alleggeriscono. Il mattone (prova anche a piedi rialzati)." },
      { order: 2, name: "Tuck planche", targetType: "seconds", targetMin: 12, targetMax: 15, criteriaSessions: 3, notes: "Ginocchia raccolte, braccia tese, spalle protratte, bacino sopra le spalle." },
      { order: 3, name: "Advanced tuck planche", targetType: "seconds", targetMin: 12, targetMax: 15, criteriaSessions: 3, notes: "Anca aperta, schiena piatta e parallela. Step lungo." },
      { order: 4, name: "One-leg planche", targetType: "seconds", targetMin: 12, targetMax: 15, criteriaSessions: 3, notes: "Una gamba tesa in linea col corpo, l'altra raccolta. Alternare le gambe." },
      { order: 5, name: "Half lay planche", targetType: "seconds", targetMin: 10, targetMax: 12, criteriaSessions: 3, notes: "Fianchi estesi, ginocchia piegate a 90° all'indietro (leva ridotta)." },
      { order: 6, name: "Straddle planche", targetType: "seconds", targetMin: 5, targetMax: 10, criteriaSessions: 3, notes: "Skill completa: gambe tese e aperte, corpo parallelo. Oltre (élite, anni): full → maltese → victorian." },
    ],
  },

  // ── STATICHE — TRAZIONE ─────────────────────────────────────────
  {
    slug: "front-lever",
    name: "Front Lever",
    category: "statiche-trazione",
    type: "static",
    isPriority: true,
    relatedSkills: [
      { slug: "dragon-flag", type: "propedeutico", note: "Ottimo propedeutico: allena catena posteriore e core in estensione." },
    ],
    recommendedSets: 3,
    recommendedRestSeconds: 90,
    warning: "Prep: active/scapular hang, skin the cat controllato.",
    steps: [
      { order: 1, name: "Tuck FL raise → tuck FL hold", targetType: "seconds", targetMin: 12, targetMax: 15, criteriaSessions: 3, notes: "Schiena orizzontale, ginocchia raccolte." },
      { order: 2, name: "Advanced tuck front lever", targetType: "seconds", targetMin: 12, targetMax: 15, criteriaSessions: 3, notes: "Anca aperta, schiena piatta." },
      { order: 3, name: "Front lever negative", targetType: "reps", targetMin: 3, targetMax: 5, criteriaSessions: 3, notes: "Sali in inverted hang, scendi controllando al massimo (6-8s) fino a corpo teso." },
      { order: 4, name: "One-leg front lever", targetType: "seconds", targetMin: 12, targetMax: 15, criteriaSessions: 3, notes: "Una gamba tesa in linea, l'altra raccolta. Alternare." },
      { order: 5, name: "Half lay front lever", targetType: "seconds", targetMin: 10, targetMax: 12, criteriaSessions: 3, notes: "Corpo dritto da spalle a ginocchia, gambe piegate a 90° all'indietro." },
      { order: 6, name: "Straddle front lever", targetType: "seconds", targetMin: 12, targetMax: 15, criteriaSessions: 3 },
      { order: 7, name: "Full front lever", targetType: "seconds", targetMin: 10, criteriaSessions: 3, notes: "Skill completa: hold ~10s, corpo dritto. In parallelo: front lever raise + row." },
    ],
  },
  {
    slug: "back-lever",
    name: "Back Lever",
    category: "statiche-trazione",
    type: "static",
    warning: "⚠️ Stressa spalle e bicipiti in estensione. Riscalda bene, entra gradualmente nel German hang.",
    recommendedSets: 3,
    recommendedRestSeconds: 90,
    steps: [
      { order: 1, name: "German hang", targetType: "seconds", targetMin: 15, targetMax: 20, criteriaSessions: 3, notes: "Skin the cat fino in basso, tenuta per la tolleranza della spalla." },
      { order: 2, name: "Tuck back lever", targetType: "seconds", targetMin: 12, targetMax: 15, criteriaSessions: 3, notes: "Da inverted hang scendi a orizzontale, ginocchia raccolte." },
      { order: 3, name: "Advanced tuck back lever", targetType: "seconds", targetMin: 12, targetMax: 15, criteriaSessions: 3 },
      { order: 4, name: "Straddle back lever", targetType: "seconds", targetMin: 12, targetMax: 15, criteriaSessions: 3 },
      { order: 5, name: "Full back lever", targetType: "seconds", targetMin: 5, targetMax: 10, criteriaSessions: 3, notes: "Skill completa." },
    ],
  },
  {
    slug: "human-flag",
    name: "Human Flag / Bandiera",
    category: "statiche-trazione",
    type: "static",
    recommendedSets: 3,
    recommendedRestSeconds: 90,
    warning: "Serve un palo verticale o due sbarre. Prep: obliqui, dorsali, presa.",
    steps: [
      { order: 1, name: "Confidenza con la presa", targetType: "seconds", targetMin: 10, targetMax: 15, criteriaSessions: 2, notes: "Mano alta tira, mano bassa spinge." },
      { order: 2, name: "Flag leans / Kick-offs", targetType: "reps", targetMin: 5, criteriaSessions: 3, notes: "Piccoli slanci staccando i piedi da terra per 1-2s, imparando a spingere col braccio inferiore." },
      { order: 3, name: "Vertical flag / chamber", targetType: "seconds", targetMin: 12, targetMax: 15, criteriaSessions: 3, notes: "Corpo verticale, gambe su." },
      { order: 4, name: "Tuck flag", targetType: "seconds", targetMin: 12, targetMax: 15, criteriaSessions: 3, notes: "Ginocchia raccolte, corpo verso l'orizzontale." },
      { order: 5, name: "Straddle flag", targetType: "seconds", targetMin: 12, targetMax: 15, criteriaSessions: 3, notes: "Gambe aperte." },
      { order: 6, name: "Full flag", targetType: "seconds", targetMin: 5, targetMax: 10, criteriaSessions: 3, notes: "Skill completa. In parallelo: flag raises." },
    ],
  },
  {
    slug: "iron-cross",
    name: "Iron Cross",
    category: "statiche-trazione",
    type: "static",
    warning: "⚠️ ÉLITE ad alto rischio: enorme stress su gomiti e tendini bicipiti/pettorali. Serve condizionamento tendineo di anni e idealmente un coach. Non forzare.",
    recommendedSets: 3,
    recommendedRestSeconds: 150,
    steps: [
      { order: 1, name: "Ring support (RTO) + ring dip", targetType: "seconds", targetMin: 15, targetMax: 20, criteriaSessions: 3, notes: "Solidissimo, più ring dip forti." },
      { order: 2, name: "Prep croce con elastico / anelli bassi", targetType: "seconds", targetMin: 10, targetMax: 12, criteriaSessions: 3, notes: "Piedi a terra." },
      { order: 3, name: "Negative assistite", targetType: "reps", targetMin: 3, targetMax: 5, criteriaSessions: 3, notes: "Dal support verso la croce, controllate." },
      { order: 4, name: "Assistenza ridotta", targetType: "seconds", targetMin: 8, targetMax: 10, criteriaSessions: 3, notes: "Elastico progressivamente più leggero." },
      { order: 5, name: "Iron cross hold", targetType: "seconds", targetMin: 5, targetMax: 8, criteriaSessions: 3, notes: "Skill completa (target stimato, il documento non specifica un numero esatto)." },
    ],
  },

  // ── CORE / COMPRESSIONE ─────────────────────────────────────────
  {
    slug: "l-sit-v-sit-manna",
    name: "L-sit → V-sit → Manna",
    category: "core",
    type: "static",
    recommendedSets: 3,
    recommendedRestSeconds: 60,
    warning: "Prep: mobilità in compressione (pike), forza flessori dell'anca, polsi.",
    steps: [
      { order: 1, name: "Foot-supported / tuck L-sit → one-leg", targetType: "seconds", targetMin: 12, targetMax: 15, criteriaSessions: 3 },
      { order: 2, name: "Full L-sit", targetType: "seconds", targetMin: 20, targetMax: 30, criteriaSessions: 3, notes: "Criterio per passare alla V-sit." },
      { order: 3, name: "High L-sit / advanced", targetType: "seconds", targetMin: 12, targetMax: 15, criteriaSessions: 3, notes: "Spinta scapolare, bacino più alto." },
      { order: 4, name: "V-sit", targetType: "seconds", targetMin: 5, targetMax: 10, criteriaSessions: 3, notes: "Gambe più in alto dei fianchi. Criterio per passare alla Manna." },
      { order: 5, name: "Manna", targetType: "seconds", targetMin: 5, criteriaSessions: 3, notes: "Élite, compressione estrema (target stimato)." },
    ],
  },
  {
    slug: "dragon-flag",
    name: "Dragon Flag",
    category: "core",
    type: "static",
    recommendedSets: 3,
    recommendedRestSeconds: 90,
    warning: "Ottimo propedeutico per il Front Lever: allena catena posteriore e core in estensione.",
    steps: [
      { order: 1, name: "Leg raise alla spalliera/sbarra", targetType: "reps", targetMin: 8, targetMax: 10, criteriaSessions: 3, notes: "Forza base di compressione." },
      { order: 2, name: "Dragon Flag Tuck", targetType: "seconds", targetMin: 8, targetMax: 10, criteriaSessions: 3, notes: "Ginocchia al petto, solleva il bacino e controlla la discesa." },
      { order: 3, name: "Dragon Flag One-Leg / Advanced", targetType: "seconds", targetMin: 8, targetMax: 10, criteriaSessions: 3, notes: "Una gamba tesa, una raccolta per aumentare la leva." },
      { order: 4, name: "Dragon Flag eccentrica", targetType: "reps", targetMin: 3, targetMax: 5, criteriaSessions: 3, notes: "Sali a candela, scendi alla massima lentezza (6-8s) a corpo teso." },
      { order: 5, name: "Full Dragon Flag", targetType: "seconds", targetMin: 5, criteriaSessions: 3, notes: "Skill completa: hold o reps sfiorando panca/terra a corpo teso." },
    ],
  },

  // ── DINAMICHE — TRAZIONE ────────────────────────────────────────
  {
    slug: "muscle-up",
    name: "Muscle-up",
    category: "dinamiche-trazione",
    type: "dynamic",
    isPriority: true,
    prerequisite: "10-12 trazioni strict al petto (sterno) + 12-15 dip profonde alle parallele.",
    recommendedSets: 4,
    recommendedRestSeconds: 120,
    steps: [
      { order: 1, name: "Base: trazioni e dip", targetType: "reps", targetMin: 10, criteriaSessions: 2, notes: "10+ trazioni strict, 10+ dip." },
      { order: 2, name: "Trazione esplosiva (high pull-up)", targetType: "reps", targetMin: 3, targetMax: 5, criteriaSessions: 3, notes: "Sterno/pancia alla sbarra, 4-5 serie × 3-5." },
      { order: 3, name: "False grip + negative di muscle-up", targetType: "reps", targetMin: 3, targetMax: 5, criteriaSessions: 3, notes: "Negative lente attraverso la transizione (anelli)." },
      { order: 4, name: "Drill transizione", targetType: "reps", targetMin: 6, targetMax: 8, criteriaSessions: 3, notes: "Baby muscle-up a sbarra bassa, russian dips, straight bar dips." },
      { order: 5, name: "Band-assisted muscle-up", targetType: "reps", targetMin: 6, targetMax: 8, criteriaSessions: 3, notes: "Loop band sotto i piedi per alleggerire la transizione e apprenderne la dinamica." },
      { order: 6, name: "Muscle-up strict", targetType: "reps", targetMin: 6, targetMax: 8, criteriaSessions: 3, notes: "Skill completa: muscle-up completo → strict, controllato per reps." },
    ],
  },
  {
    slug: "archer-oap",
    name: "Archer Pull-up → One-arm Pull-up",
    category: "dinamiche-trazione",
    type: "dynamic",
    prerequisite: "1 trazione zavorrata con +50% del peso corporeo.",
    recommendedSets: 4,
    recommendedRestSeconds: 120,
    steps: [
      { order: 1, name: "Trazioni zavorrate", targetType: "reps", targetMin: 6, targetMax: 8, criteriaSessions: 3, notes: "Verso +40-50% del peso corporeo." },
      { order: 2, name: "One-arm scapular pull-ups", targetType: "reps", targetMin: 6, targetMax: 8, criteriaSessions: 3, notes: "Appeso a un braccio, sollevati contraendo solo la scapola: protegge la spalla e prepara i tendini." },
      { order: 3, name: "Archer pull-up", targetType: "reps", targetMin: 6, targetMax: 8, criteriaSessions: 3, notes: "Un braccio tira, l'altro teso assiste sulla sbarra." },
      { order: 4, name: "One-arm assistita", targetType: "reps", targetMin: 6, targetMax: 8, criteriaSessions: 3, notes: "Asciugamano/elastico sull'avambraccio che lavora." },
      { order: 5, name: "One-arm negative", targetType: "reps", targetMin: 3, targetMax: 5, criteriaSessions: 3, notes: "Discesa lenta a un braccio, controllata (6-8s)." },
      { order: 6, name: "One-arm pull-up", targetType: "reps", targetMin: 1, criteriaSessions: 3, notes: "Skill completa. Tra le dinamiche più dure: spesso richiede zavorra vicina al peso corporeo." },
    ],
  },
  {
    slug: "front-lever-pullup",
    name: "Front Lever Pull-up / FL Touch",
    category: "dinamiche-trazione",
    type: "dynamic",
    warning: "Trazione orizzontale dinamica. Prereq: Front Lever statico solido (10s+).",
    relatedSkills: [
      { slug: "front-lever", type: "prerequisite", note: "Serve un Front Lever statico solido (10s+)." },
    ],
    recommendedSets: 4,
    recommendedRestSeconds: 120,
    steps: [
      { order: 1, name: "Tuck / Advanced Tuck FL pull-ups", targetType: "reps", targetMin: 6, targetMax: 8, criteriaSessions: 3, notes: "Trazioni in posizione raccolta toccando la sbarra con la pancia." },
      { order: 2, name: "Straddle FL pull-ups", targetType: "reps", targetMin: 6, targetMax: 8, criteriaSessions: 3 },
      { order: 3, name: "L-sit to Front Lever Touch", targetType: "reps", targetMin: 6, targetMax: 8, criteriaSessions: 3, notes: "Transizione dinamica concentrica." },
      { order: 4, name: "Full Front Lever pull-up", targetType: "reps", targetMin: 3, targetMax: 5, criteriaSessions: 3, notes: "Skill completa: trazione in FL completo toccando la sbarra col bacino/pancia (target stimato)." },
    ],
  },
  {
    slug: "hefesto",
    name: "Hefesto",
    category: "dinamiche-trazione",
    type: "eccentric",
    warning: "⚠️ Élite. Estremamente stressante per bicipiti e spalla in estensione. Prereq: German hang + Back lever solidi.",
    prerequisite: "10 German Hang completi (entrata/uscita controllata) + 5 Pelican Push-ups profondi.",
    relatedSkills: [
      { slug: "back-lever", type: "prerequisite", note: "Serve un Back Lever solido (comprende il German hang)." },
    ],
    recommendedSets: 4,
    recommendedRestSeconds: 150,
    steps: [
      { order: 1, name: "Pelican push-ups", targetType: "reps", targetMin: 5, targetMax: 8, criteriaSessions: 3, notes: "Flessioni profonde agli anelli/parallele scendendo oltre il livello dell'appoggio." },
      { order: 2, name: "Hefesto negative", targetType: "reps", targetMin: 3, targetMax: 5, criteriaSessions: 3, notes: "Da sopra la sbarra, scendi controllando al massimo l'eccentrica (6-8s)." },
      { order: 3, name: "Hefesto assistito", targetType: "reps", targetMin: 3, targetMax: 5, criteriaSessions: 3, notes: "Elastico sotto i piedi o piedi a terra per ridurre il peso corporeo." },
      { order: 4, name: "Hefesto completo", targetType: "reps", targetMin: 3, targetMax: 5, criteriaSessions: 3, notes: "Skill completa (target stimato)." },
    ],
  },

  // ── DINAMICHE — SPINTA ──────────────────────────────────────────
  {
    slug: "hspu",
    name: "Handstand Push-up (HSPU)",
    category: "dinamiche-spinta",
    type: "dynamic",
    warning: "Prereq: verticale al muro solida + pike push-up forti.",
    recommendedSets: 4,
    recommendedRestSeconds: 120,
    steps: [
      { order: 1, name: "Pike push-up → elevated pike", targetType: "reps", targetMin: 6, targetMax: 8, criteriaSessions: 3, notes: "Piedi rialzati." },
      { order: 2, name: "Wall HSPU ROM parziale → completo", targetType: "reps", targetMin: 6, targetMax: 8, criteriaSessions: 3 },
      { order: 3, name: "Deficit wall HSPU", targetType: "reps", targetMin: 6, targetMax: 8, criteriaSessions: 3, notes: "Mani su rialzi/parallettes per più ROM." },
      { order: 4, name: "Freestanding HSPU", targetType: "reps", targetMin: 6, targetMax: 8, criteriaSessions: 3, notes: "Skill completa: HSPU a ROM completo (prima al muro, poi libera)." },
    ],
  },
  {
    slug: "one-arm-pushup",
    name: "One-arm Push-up",
    category: "dinamiche-spinta",
    type: "dynamic",
    recommendedSets: 4,
    recommendedRestSeconds: 90,
    steps: [
      { order: 1, name: "Push-up standard forti", targetType: "reps", targetMin: 20, criteriaSessions: 2 },
      { order: 2, name: "Archer push-up", targetType: "reps", targetMin: 6, targetMax: 8, criteriaSessions: 3 },
      { order: 3, name: "Uneven / assistito", targetType: "reps", targetMin: 6, targetMax: 8, criteriaSessions: 3, notes: "Una mano rialzata." },
      { order: 4, name: "One-arm base larga → stretta", targetType: "reps", targetMin: 6, targetMax: 8, criteriaSessions: 3 },
      { order: 5, name: "One-arm push-up", targetType: "reps", targetMin: 6, targetMax: 8, criteriaSessions: 3, notes: "Skill completa." },
    ],
  },
  {
    slug: "press-to-handstand",
    name: "Press to Handstand",
    category: "dinamiche-spinta",
    type: "dynamic",
    warning: "Bilanciamento + forza spalle + flessibilità attiva (compressione). Prereq: Handstand solida freestanding.",
    prerequisite: "30 secondi di verticale libera stabile + mobilità di Pike/Straddle a terra.",
    relatedSkills: [
      { slug: "handstand", type: "prerequisite", note: "Serve una handstand solida freestanding (30s+)." },
    ],
    recommendedSets: 4,
    recommendedRestSeconds: 120,
    steps: [
      { order: 1, name: "Pike/Straddle compression drills", targetType: "reps", targetMin: 6, targetMax: 8, criteriaSessions: 3, notes: "Sollevamenti gambe da seduti a terra." },
      { order: 2, name: "Pike Press assistito al muro", targetType: "reps", targetMin: 6, targetMax: 8, criteriaSessions: 3, notes: "Schiena al muro, cammina con i piedi verso le mani." },
      { order: 3, name: "Straddle Press con piedi rialzati", targetType: "reps", targetMin: 6, targetMax: 8, criteriaSessions: 3, notes: "Piedi su box/sedia per ridurre il ROM iniziale." },
      { order: 4, name: "Straddle Press eccentrico", targetType: "reps", targetMin: 3, targetMax: 5, criteriaSessions: 3, notes: "Dalla verticale scendi rallentando al massimo (6-8s) fino a sfiorare terra." },
      { order: 5, name: "Full Straddle Press to Handstand", targetType: "reps", targetMin: 3, targetMax: 5, criteriaSessions: 3, notes: "Skill completa, poi Pike Press a gambe unite." },
    ],
  },
  {
    slug: "tiger-bend",
    name: "Tiger Bend",
    category: "dinamiche-spinta",
    type: "eccentric",
    warning: "Transizione dinamica tra Handstand e Forearm Stand. Prereq: stabilità su entrambe le tenute.",
    relatedSkills: [
      { slug: "handstand", type: "prerequisite", note: "Serve stabilità in handstand prima di lavorare la transizione." },
    ],
    recommendedSets: 4,
    recommendedRestSeconds: 120,
    steps: [
      { order: 1, name: "Tiger Bend eccentrico al muro", targetType: "reps", targetMin: 3, targetMax: 5, criteriaSessions: 3, notes: "Dalla verticale scendi controllando l'appoggio dei gomiti (6-8s)." },
      { order: 2, name: "Tiger Bend assistito al muro", targetType: "reps", targetMin: 3, targetMax: 5, criteriaSessions: 3, notes: "Push-up dai gomiti per tornare in verticale." },
      { order: 3, name: "Tiger Bend eccentrico freestanding", targetType: "reps", targetMin: 3, targetMax: 5, criteriaSessions: 3 },
      { order: 4, name: "Full Tiger Bend", targetType: "reps", targetMin: 3, targetMax: 5, criteriaSessions: 3, notes: "Skill completa (target stimato)." },
    ],
  },
  {
    slug: "90-degree-pushup",
    name: "90-Degree Push-up",
    category: "dinamiche-spinta",
    type: "eccentric",
    warning: "Élite. Handstand to Planche Push-up. Prereq: HSPU + Planche Lean solidi.",
    relatedSkills: [
      { slug: "hspu", type: "prerequisite", note: "Serve un HSPU solido." },
      { slug: "straddle-planche", type: "prerequisite", note: "Serve una Planche Lean solida." },
    ],
    recommendedSets: 4,
    recommendedRestSeconds: 150,
    steps: [
      { order: 1, name: "HSPU con traiettoria inclinata", targetType: "reps", targetMin: 6, targetMax: 8, criteriaSessions: 3, notes: "Sbilanciandosi in avanti durante la discesa." },
      { order: 2, name: "90-Degree eccentriche assistite", targetType: "reps", targetMin: 3, targetMax: 5, criteriaSessions: 3, notes: "Con elastico o al muro (discesa 6-8s)." },
      { order: 3, name: "90-Degree eccentriche freestanding", targetType: "reps", targetMin: 3, targetMax: 5, criteriaSessions: 3, notes: "Scendi in planche a gomiti flessi e mantieni la posizione." },
      { order: 4, name: "90-Degree Push-up completo", targetType: "reps", targetMin: 3, targetMax: 5, criteriaSessions: 3, notes: "Skill completa (target stimato)." },
    ],
  },
  {
    slug: "impossible-dip",
    name: "Impossible Dip",
    category: "dinamiche-spinta",
    type: "eccentric",
    warning: "⚠️ Élite. Forza estrema nei tricipiti e stabilità dei gomiti. Prereq: Dip zavorrate forti (+50% BW).",
    recommendedSets: 4,
    recommendedRestSeconds: 150,
    steps: [
      { order: 1, name: "Russian dips", targetType: "reps", targetMin: 6, targetMax: 8, criteriaSessions: 3, notes: "Transizione su sbarra/parallele appoggiando gli avambracci." },
      { order: 2, name: "Impossible Dip eccentrico", targetType: "reps", targetMin: 3, targetMax: 5, criteriaSessions: 3, notes: "Scendi controllando la discesa (6-8s) portando i gomiti all'indietro." },
      { order: 3, name: "Impossible Dip assistito con elastico", targetType: "reps", targetMin: 3, targetMax: 5, criteriaSessions: 3 },
      { order: 4, name: "Full Impossible Dip", targetType: "reps", targetMin: 3, targetMax: 5, criteriaSessions: 3, notes: "Skill completa (target stimato)." },
    ],
  },

  // ── LOWER BODY / GAMBE ──────────────────────────────────────────
  {
    slug: "pistol-squat",
    name: "Pistol Squat",
    category: "gambe",
    type: "dynamic",
    recommendedSets: 4,
    recommendedRestSeconds: 90,
    steps: [
      { order: 1, name: "Squat a una gamba assistito", targetType: "reps", targetMin: 6, targetMax: 8, criteriaSessions: 3, notes: "Tenendosi a un palo, TRX o anelli." },
      { order: 2, name: "Box Pistol Squat", targetType: "reps", targetMin: 6, targetMax: 8, criteriaSessions: 3, notes: "Scendi su un box/rialzo progressivamente più basso." },
      { order: 3, name: "Pistol Squat eccentrico", targetType: "reps", targetMin: 3, targetMax: 5, criteriaSessions: 3, notes: "Discesa controllata (6-8s) a una gamba, risali a due gambe." },
      { order: 4, name: "Full Pistol Squat", targetType: "reps", targetMin: 6, targetMax: 8, criteriaSessions: 3, notes: "Skill completa." },
    ],
  },
  {
    slug: "shrimp-squat",
    name: "Shrimp Squat (Airborne Squat)",
    category: "gambe",
    type: "dynamic",
    recommendedSets: 4,
    recommendedRestSeconds: 90,
    steps: [
      { order: 1, name: "Knee-touch Shrimp Squat", targetType: "reps", targetMin: 6, targetMax: 8, criteriaSessions: 3, notes: "Solo il ginocchio posteriore tocca terra, il piede resta sollevato." },
      { order: 2, name: "Shrimp Squat classico", targetType: "reps", targetMin: 6, targetMax: 8, criteriaSessions: 3, notes: "Afferra la caviglia posteriore con la mano dello stesso lato." },
      { order: 3, name: "Deficit Shrimp Squat", targetType: "reps", targetMin: 6, targetMax: 8, criteriaSessions: 3, notes: "Eseguito su un rialzo per aumentare il ROM. Skill completa." },
    ],
  },
  {
    slug: "dragon-squat",
    name: "Dragon Squat",
    category: "gambe",
    type: "dynamic",
    warning: "Prereq: Pistol e Shrimp squat solidi. Richiede estrema mobilità di anca e caviglia.",
    relatedSkills: [
      { slug: "pistol-squat", type: "prerequisite", note: "Serve un Pistol Squat solido." },
      { slug: "shrimp-squat", type: "prerequisite", note: "Serve uno Shrimp Squat solido." },
    ],
    recommendedSets: 4,
    recommendedRestSeconds: 90,
    steps: [
      { order: 1, name: "Dragon Squat assistito", targetType: "reps", targetMin: 3, targetMax: 5, criteriaSessions: 3, notes: "Tenendosi a un supporto laterale per stabilizzare la discesa." },
      { order: 2, name: "Full Dragon Squat", targetType: "reps", targetMin: 3, targetMax: 5, criteriaSessions: 3, notes: "Skill completa: la gamba libera incrocia dietro e di lato senza mai toccare terra." },
    ],
  },
];

export function getSkill(slug: string): Skill | undefined {
  return SKILLS.find((s) => s.slug === slug);
}

export function getSkillStep(skill: Skill, stepOrder: number): SkillStep | undefined {
  return skill.steps.find((s) => s.order === stepOrder);
}

/**
 * Riferimento esplicito al prossimo step da allenare dopo quello corrente,
 * oppure undefined se lo step corrente è già l'ultimo (skill completa).
 */
export function getNextStep(skill: Skill, currentStepOrder: number): SkillStep | undefined {
  return getSkillStep(skill, currentStepOrder + 1);
}

export function getRelatedSkills(skill: Skill): { skill: Skill; relation: SkillRelation }[] {
  if (!skill.relatedSkills) return [];
  return skill.relatedSkills
    .map((relation) => {
      const related = getSkill(relation.slug);
      return related ? { skill: related, relation } : null;
    })
    .filter((v): v is { skill: Skill; relation: SkillRelation } => v !== null);
}
