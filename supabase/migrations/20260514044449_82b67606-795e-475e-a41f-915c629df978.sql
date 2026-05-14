-- Create sleep_events table
CREATE TABLE IF NOT EXISTS public.sleep_events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    inicio_sono TIMESTAMP WITH TIME ZONE DEFAULT now(),
    fim_sono TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add column to checkin_diario if not exists (already exists based on previous code view, but let's be sure)
-- The previous view showed: horas_sono: checkin.horas_sono ? parseFloat(checkin.horas_sono) : null
-- So the column exists.

-- Add a table for user state/preferences if needed, or just use a column in profiles.
-- Let's check if profiles table exists.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        CREATE TABLE public.profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            notificacoes_silenciadas_ate TIMESTAMP WITH TIME ZONE,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
    ELSE
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notificacoes_silenciadas_ate TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.sleep_events ENABLE ROW LEVEL SECURITY;

-- Policies for sleep_events
CREATE POLICY "Users can view their own sleep events" ON public.sleep_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own sleep events" ON public.sleep_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sleep events" ON public.sleep_events FOR UPDATE USING (auth.uid() = user_id);

-- Policies for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
