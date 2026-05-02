export interface WorkoutPlan {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  duration_weeks?: number | null;
  created_at?: string;
}

export interface WorkoutPlanDay {
  id: string;
  workout_plan_id: string;
  day_number: number;
  day_name: string;
  created_at?: string;
}

export interface WorkoutPlanExercise {
  id: string;
  workout_plan_day_id: string;
  exercise_name: string;
  order_number: number;
  sets: number;
  reps_min?: number | null;
  reps_max?: number | null;
  rest_seconds?: number | null;
  notes?: string | null;
  primary_body_part_id?: string | null;
}

export interface WorkoutPlanDayWithExercises extends WorkoutPlanDay {
  workout_plan_exercises: WorkoutPlanExercise[];
}

export interface WorkoutPlanWithDays extends WorkoutPlan {
  workout_plan_days: WorkoutPlanDayWithExercises[];
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  workout_day: string;
  workout_plan_day_id?: string | null;
  started_at: string;
  completed_at?: string | null;
}

export interface SetLog {
  id?: string;
  workout_log_id: string;
  user_id: string;
  exercise_name: string;
  set_number: number;
  reps: number;
  weight: number;
  created_at?: string;
}

export interface BodyPart {
  id: string;
  slug: string;
  name: string;
  icon: string;
}

export interface BodyMeasurement {
  id: string;
  user_id: string;
  measured_at: string;
  weight?: number | null;
  height_cm?: number | null;
  collo_cm?: number | null;
  braccio_front_cm?: number | null;
  avambraccio_cm?: number | null;
  petto_torace_cm?: number | null;
  vita_cm?: number | null;
  fianchi_cm?: number | null;
  schiena_altezza_dorsali_cm?: number | null;
  spalle_ampiezza_cm?: number | null;
  glutei_circonferenza_cm?: number | null;
  coscia_cm?: number | null;
  polpaccio_cm?: number | null;
  notes?: string | null;
}

export interface DashboardStats {
  streak: number;
  weekCount: number;
  monthCount: number;
  monthVolume: number;
  volumeChart: { date: string; volume: number; day: string }[];
  weeklyVolumeChart: { week: string; volume: number }[];
  topPRs: { exercise: string; weight: number; reps: number }[];
  lastMeasurementDaysAgo: number | null;
  lastWorkout: { day: string; date: string } | null;
  nextPlanDay: WorkoutPlanDay | null;
  plans: WorkoutPlan[];
}
