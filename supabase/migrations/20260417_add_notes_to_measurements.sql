-- Add notes column to body_measurements
ALTER TABLE public.body_measurements
ADD COLUMN notes text;
