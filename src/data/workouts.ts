export interface Exercise {
  name: string;
  sets: number;
  reps: string; // e.g. "10", "6-8", "Max"
  weight?: string; // e.g. "20kg", "12kg"
}

export interface WorkoutDay {
  id: string;
  label: string;
  title: string;
  color: string; // tailwind color token
  exercises: Exercise[];
}

export const WORKOUT_DAYS: WorkoutDay[] = [
  {
    id: "A",
    label: "Giorno A",
    title: "Petto / Dorso",
    color: "hsl(210, 100%, 50%)",
    exercises: [
      { name: "Push-up", sets: 4, reps: "Max" },
      { name: "Croci panca piana", sets: 4, reps: "10" },
      { name: "Spinte panca inclinata", sets: 4, reps: "6-8" },
      { name: "Trazioni elastico", sets: 4, reps: "6" },
      { name: "Rematore singolo", sets: 4, reps: "6-8" },
      { name: "Australian Row", sets: 4, reps: "8-10" },
      { name: "Dumbbell Pullover", sets: 4, reps: "10" },
    ],
  },
  {
    id: "B",
    label: "Giorno B",
    title: "Spalle / Braccia",
    color: "hsl(38, 92%, 50%)",
    exercises: [
      { name: "Military Press", sets: 4, reps: "6-8", weight: "20kg" },
      { name: "Alzate posteriori", sets: 4, reps: "10", weight: "12kg" },
      { name: "Alzate laterali 45°", sets: 4, reps: "10", weight: "10kg" },
      { name: "Hammer Curl", sets: 4, reps: "6-8", weight: "12kg" },
      { name: "Curl concentrato", sets: 4, reps: "8-10", weight: "10kg" },
      { name: "French Press", sets: 4, reps: "8-10" },
      { name: "Kickback", sets: 4, reps: "10" },
    ],
  },
  {
    id: "C",
    label: "Giorno C",
    title: "Petto / Braccia",
    color: "hsl(145, 65%, 42%)",
    exercises: [
      { name: "Push Up", sets: 4, reps: "Max" },
      { name: "Spinta stretta", sets: 4, reps: "6-8" },
      { name: "Croci inclinate", sets: 4, reps: "10" },
      { name: "Curl panca inclinata", sets: 4, reps: "6-8" },
      { name: "Curl EZ", sets: 4, reps: "8-10" },
      { name: "Spider Curl", sets: 4, reps: "10" },
      { name: "French Press", sets: 4, reps: "8-10" },
      { name: "Kickback", sets: 4, reps: "10" },
    ],
  },
  {
    id: "D",
    label: "Giorno D",
    title: "Dorso / Spalle",
    color: "hsl(280, 70%, 55%)",
    exercises: [
      { name: "Trazioni elastico", sets: 4, reps: "Max" },
      { name: "Rematore panca", sets: 4, reps: "6-8" },
      { name: "Rematore 45°", sets: 4, reps: "8-10" },
      { name: "Lento avanti", sets: 4, reps: "6-8" },
      { name: "Alzate laterali", sets: 4, reps: "10" },
      { name: "Face Pull", sets: 4, reps: "12" },
      { name: "Shrugs", sets: 4, reps: "10" },
    ],
  },
  {
    id: "Gambe",
    label: "Gambe",
    title: "Gambe",
    color: "hsl(0, 72%, 51%)",
    exercises: [
      { name: "Affondi bulgari", sets: 4, reps: "8" },
      { name: "Stacco rumeno", sets: 4, reps: "8" },
      { name: "Squat", sets: 4, reps: "8" },
      { name: "Hip Thrust", sets: 4, reps: "10" },
      { name: "Sissy Squat (Superset)", sets: 3, reps: "12" },
      { name: "Nordic Hamstring Curl (Superset)", sets: 3, reps: "6" },
      { name: "Calf Raise", sets: 4, reps: "15" },
    ],
  },
];

export const WORKOUT_ORDER = ["A", "B", "C", "D", "Gambe"];

export function getNextWorkoutDay(lastDay: string | null): WorkoutDay {
  if (!lastDay) return WORKOUT_DAYS[0];
  const idx = WORKOUT_ORDER.indexOf(lastDay);
  const nextIdx = (idx + 1) % WORKOUT_ORDER.length;
  return WORKOUT_DAYS[nextIdx];
}
