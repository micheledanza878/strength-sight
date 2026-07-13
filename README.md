# Strength Sight

Il tuo diario di allenamento personale — una Progressive Web App mobile-first per
programmare gli allenamenti, tracciare le sessioni in palestra, seguire la
progressione nelle skill di calisthenics, gestire la dieta e monitorare le misure
del corpo.

## Funzionalità

- **Schede di allenamento** — crea e modifica programmi con giorni ed esercizi
  (serie, ripetizioni, recupero, note); una scheda può essere impostata come attiva.
- **Sessione guidata** — anteprima del giorno, cronometro, timer di recupero,
  registrazione dei set con **salvataggio automatico**, precompilazione dai dati
  della sessione precedente e suggerimenti di **progressione del carico** (double
  progression).
- **Skill di calisthenics** — esercizi a step con avanzamento automatico di livello
  in base alle sedute pulite completate.
- **Dieta** — visualizzatore del piano settimanale, guida agli alimenti e
  sostituzioni, con ricette generate via AI.
- **Corpo & Storico** — misurazioni corporee, storico delle sessioni e dashboard con
  volume per sessione e statistiche.

## Stack tecnologico

- **Frontend:** React 18 + TypeScript, Vite, React Router, TanStack Query
- **UI:** Tailwind CSS + shadcn/ui (Radix), Lucide, Recharts, Sonner — tema dark-first
- **Backend:** Supabase (Postgres, Auth, Edge Functions in Deno)
- **AI:** Google Gemini (ricette, insight sugli esercizi, coach, generazione schede)
- **PWA:** service worker e manifest per l'installazione su mobile

## Sviluppo in locale

Prerequisiti: Node.js 18+ e npm.

```bash
npm install
npm run dev
```

L'app richiede una connessione a un progetto Supabase. Crea un file `.env` nella root:

```bash
VITE_SUPABASE_URL=<url-del-tuo-progetto-supabase>
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-anon-key>
```

## Script npm

| Comando | Descrizione |
|---|---|
| `npm run dev` | Server di sviluppo Vite |
| `npm run build` | Build di produzione |
| `npm run preview` | Anteprima della build |
| `npm run lint` | ESLint |
| `npm run test` | Test con Vitest |

## Struttura del progetto

```
src/
  pages/          Pagine e rotte (Dashboard, WorkoutSelect, WorkoutSession, Diet, ...)
  components/     Componenti condivisi + primitive UI (shadcn) in components/ui
  services/       Logica di dominio (progressione, skill, dieta, ...)
  hooks/          React hook riutilizzabili
  integrations/   Client Supabase e tipi del database
  data/ types/    Dati statici e tipi TypeScript
supabase/
  functions/      Edge Functions (auth, gemini-recipe, exercise-insights, ...)
  migrations/     Migrazioni dello schema Postgres
```

## Deploy

Il build statico (`npm run build`) produce `dist/`, servibile da qualsiasi host
statico. Le Edge Functions e il database sono gestiti su Supabase.
