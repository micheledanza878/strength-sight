import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase URL o API Key non trovati in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertScheda1() {
  console.log('📝 Inizio inserimento Scheda 1...');
  console.log('');

  try {
    // 1. Inserisci il workout_plan
    console.log('⏳ Inserendo workout_plan...');
    const { data: planData, error: planError } = await supabase
      .from('workout_plans')
      .insert({
        name: 'Scheda 1',
        description: 'Scheda Split A/B/Gambe',
        duration_weeks: 12,
      })
      .select()
      .single();

    if (planError) {
      console.error('❌ Errore inserimento plan:', planError.message);
      process.exit(1);
    }

    const planId = planData.id;
    console.log(`✅ Piano creato: ${planId}`);
    console.log('');

    // 2. Inserisci i 5 giorni
    console.log('⏳ Inserendo giorni della scheda...');
    const days = [
      { day_number: 1, day_name: 'Petto/Dorso' },
      { day_number: 2, day_name: 'Spalle Braccia' },
      { day_number: 3, day_name: 'Gambe' },
      { day_number: 4, day_name: 'Petto/Braccia' },
      { day_number: 5, day_name: 'Dorso/Spalle' },
    ];

    const { data: daysData, error: daysError } = await supabase
      .from('workout_plan_days')
      .insert(days.map(d => ({ ...d, workout_plan_id: planId })))
      .select();

    if (daysError) {
      console.error('❌ Errore inserimento giorni:', daysError.message);
      process.exit(1);
    }

    const dayIds: { [key: number]: string } = {};
    daysData.forEach(day => {
      dayIds[day.day_number] = day.id;
    });

    console.log(`✅ ${daysData.length} giorni creati`);
    console.log('');

    // 3. Inserisci gli esercizi
    console.log('⏳ Inserendo esercizi...');

    const exercises = [
      // GIORNO 1: Petto/Dorso
      { day: 1, name: 'Push-up', order: 1, sets: 4, min: null, max: null, notes: 'MAX ripetizioni', weight: null },
      { day: 1, name: 'Croci panca piana', order: 2, sets: 4, min: 10, max: 10, notes: '', weight: null },
      { day: 1, name: 'Spinte panca inclinata', order: 3, sets: 4, min: 6, max: 8, notes: '', weight: null },
      { day: 1, name: 'Trazioni elastico', order: 4, sets: 4, min: 6, max: 6, notes: '', weight: null },
      { day: 1, name: 'Rematore singolo su panca', order: 5, sets: 4, min: 6, max: 8, notes: 'Carico pesante', weight: null },
      { day: 1, name: 'Australian Row', order: 6, sets: 4, min: 8, max: 10, notes: '', weight: null },
      { day: 1, name: 'Dumbbell Pullover', order: 7, sets: 4, min: 10, max: 10, notes: '', weight: null },

      // GIORNO 2: Spalle Braccia
      { day: 2, name: 'Military press', order: 1, sets: 4, min: 6, max: 8, notes: '', weight: 20 },
      { day: 2, name: 'Alzate posteriori', order: 2, sets: 4, min: 10, max: 10, notes: '', weight: 12 },
      { day: 2, name: 'Alzate laterali 45°', order: 3, sets: 4, min: 10, max: 10, notes: '', weight: 10 },
      { day: 2, name: 'Hammer Curl', order: 4, sets: 4, min: 6, max: 8, notes: '', weight: 12 },
      { day: 2, name: 'Curl concentrato', order: 5, sets: 4, min: 8, max: 10, notes: '', weight: 10 },
      { day: 2, name: 'French Press (nuca)', order: 6, sets: 4, min: 6, max: 8, notes: '', weight: null },
      { day: 2, name: 'Kickback manubrio', order: 7, sets: 4, min: 10, max: 10, notes: '', weight: null },

      // GIORNO 3: Gambe
      { day: 3, name: 'Affondi bulgari', order: 1, sets: 4, min: 8, max: 10, notes: 'Stabilità + glutei, per gamba', weight: 8 },
      { day: 3, name: 'Stacco rumeno', order: 2, sets: 4, min: 6, max: 8, notes: 'Femorali + catena posteriore', weight: 20 },
      { day: 3, name: 'Squat', order: 3, sets: 4, min: 6, max: 8, notes: 'Fondamentale quadricipiti/glutei', weight: null },
      { day: 3, name: 'Hip Thrust', order: 4, sets: 4, min: 8, max: 10, notes: 'Focus glutei', weight: null },
      { day: 3, name: 'Sissy Squat', order: 5, sets: 3, min: 10, max: 12, notes: 'Superset', weight: null },
      { day: 3, name: 'Nordic Hamstring Curl', order: 6, sets: 3, min: 6, max: 8, notes: 'Superset', weight: null },
      { day: 3, name: 'Calf Raise su rialzo', order: 7, sets: 4, min: 12, max: 15, notes: 'Polpacci', weight: null },

      // GIORNO 4: Petto/Braccia
      { day: 4, name: 'Push up', order: 1, sets: 4, min: null, max: null, notes: 'MAX ripetizioni', weight: null },
      { day: 4, name: 'Spinta stretta panca piana', order: 2, sets: 4, min: 6, max: 8, notes: '', weight: 14 },
      { day: 4, name: 'Croci panca inclinata', order: 3, sets: 4, min: 10, max: 10, notes: '', weight: 16 },
      { day: 4, name: 'Curl panca inclinata', order: 4, sets: 4, min: 6, max: 8, notes: '', weight: 10 },
      { day: 4, name: 'Curl bilanciere EZ', order: 5, sets: 4, min: 6, max: 8, notes: '', weight: 14 },
      { day: 4, name: 'Spider Curl', order: 6, sets: 4, min: 8, max: 10, notes: '', weight: 6 },
      { day: 4, name: 'French press', order: 7, sets: 4, min: 8, max: 10, notes: '', weight: null },
      { day: 4, name: 'Kickback manubrio', order: 8, sets: 4, min: 10, max: 10, notes: '', weight: null },

      // GIORNO 5: Dorso/Spalle
      { day: 5, name: 'Trazioni con elastico', order: 1, sets: 4, min: null, max: null, notes: 'MAX ripetizioni', weight: null },
      { day: 5, name: 'Rematore su panca', order: 2, sets: 4, min: 6, max: 8, notes: '', weight: null },
      { day: 5, name: 'Rematore 45° manubri', order: 3, sets: 4, min: 8, max: 10, notes: '', weight: null },
      { day: 5, name: 'Lento in avanti', order: 4, sets: 4, min: 6, max: 8, notes: '', weight: null },
      { day: 5, name: 'Alzate laterali', order: 5, sets: 4, min: 8, max: 10, notes: '', weight: null },
      { day: 5, name: 'Face Pull', order: 6, sets: 4, min: 12, max: 12, notes: '', weight: null },
      { day: 5, name: 'Shrugs', order: 7, sets: 4, min: 12, max: 12, notes: '', weight: null },
    ];

    const exerciseInserts = exercises.map(ex => ({
      workout_plan_day_id: dayIds[ex.day],
      exercise_name: ex.name,
      order_number: ex.order,
      sets: ex.sets,
      reps_min: ex.min,
      reps_max: ex.max,
      notes: ex.notes,
      weight: ex.weight,
    }));

    const { data: exData, error: exError } = await supabase
      .from('workout_plan_exercises')
      .insert(exerciseInserts)
      .select();

    if (exError) {
      console.error('❌ Errore inserimento esercizi:', exError.message);
      process.exit(1);
    }

    console.log(`✅ ${exData.length} esercizi creati`);
    console.log('');

    console.log('✅ Scheda 1 inserita con successo!');
    console.log(`   - Piano: ${planId}`);
    console.log(`   - Giorni: ${Object.keys(dayIds).length}`);
    console.log(`   - Esercizi: ${exData.length}`);
  } catch (error) {
    console.error('❌ Errore durante inserimento:', error);
    process.exit(1);
  }
}

insertScheda1();
