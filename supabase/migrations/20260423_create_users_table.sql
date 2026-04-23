-- Users table
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only read their own data" ON public.users FOR SELECT USING (auth.uid() IS NULL OR id = auth.uid());

-- Create index on username for faster lookups
CREATE INDEX idx_users_username ON public.users(username);

-- Update workout_logs to reference users properly
ALTER TABLE public.workout_logs
  DROP CONSTRAINT workout_logs_user_id_fkey,
  ADD CONSTRAINT workout_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Update set_logs to reference users properly
ALTER TABLE public.set_logs
  DROP CONSTRAINT set_logs_user_id_fkey,
  ADD CONSTRAINT set_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Update body_measurements to reference users properly
ALTER TABLE public.body_measurements
  DROP CONSTRAINT body_measurements_user_id_fkey,
  ADD CONSTRAINT body_measurements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
