-- Rimuove dipendenza da auth per app uso personale
-- Disabilita RLS su tutte le tabelle
ALTER TABLE public.workout_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.set_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_measurements DISABLE ROW LEVEL SECURITY;

-- Rimuove vincoli FK su user_id (non più legato a auth.users)
ALTER TABLE public.workout_logs DROP CONSTRAINT IF EXISTS workout_logs_user_id_fkey;
ALTER TABLE public.set_logs DROP CONSTRAINT IF EXISTS set_logs_user_id_fkey;
ALTER TABLE public.body_measurements DROP CONSTRAINT IF EXISTS body_measurements_user_id_fkey;
