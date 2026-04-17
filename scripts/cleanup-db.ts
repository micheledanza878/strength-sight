import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase URL o API Key non trovati in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupDatabase() {
  console.log('🧹 Inizio pulizia del database...');
  console.log('');

  try {
    // Tabelle da pulire in ordine di dipendenze (child tables first)
    const tables = [
      'set_logs',
      'workout_logs',
      'body_measurements',
      'active_workout_plan',
      'workout_plan_exercises',
      'workout_plan_days',
      'workout_plans',
      'exercises',
    ];

    for (const table of tables) {
      console.log(`⏳ Pulizia ${table}...`);
      const { error } = await supabase
        .from(table)
        .delete()
        .gt('id', ''); // Elimina tutti i record

      if (error) {
        console.error(`❌ Errore durante pulizia ${table}:`, error.message);
        continue;
      }

      console.log(`✅ ${table} pulito`);
    }

    console.log('');
    console.log('✅ Database pulito con successo! Solo gli schemi rimangono intatti.');
  } catch (error) {
    console.error('❌ Errore durante la pulizia:', error);
    process.exit(1);
  }
}

cleanupDatabase();
