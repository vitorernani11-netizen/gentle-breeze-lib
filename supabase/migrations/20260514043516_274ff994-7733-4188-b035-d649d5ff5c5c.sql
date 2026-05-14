-- Add EAD reminder field to tasks
ALTER TABLE public.tarefas ADD COLUMN IF NOT EXISTS lembrete_ead_48h BOOLEAN DEFAULT false;

-- Add training verification to daily checkin
ALTER TABLE public.checkin_diario ADD COLUMN IF NOT EXISTS treino_madrugada_realizado BOOLEAN DEFAULT false;

-- Create hydration table
CREATE TABLE IF NOT EXISTS public.hidratacao (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    quantidade_ml INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, data)
);

-- Enable RLS for hydration
ALTER TABLE public.hidratacao ENABLE ROW LEVEL SECURITY;

-- Create policies for hydration
CREATE POLICY "Users can view their own hydration" 
ON public.hidratacao FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own hydration" 
ON public.hidratacao FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own hydration" 
ON public.hidratacao FOR UPDATE 
USING (auth.uid() = user_id);

-- Trigger for hydration updated_at
CREATE TRIGGER update_hidratacao_updated_at
BEFORE UPDATE ON public.hidratacao
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();