-- Create projetos table
CREATE TABLE IF NOT EXISTS public.projetos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    cor TEXT DEFAULT '#FFFFFF',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Update tarefas table
ALTER TABLE public.tarefas 
ADD COLUMN IF NOT EXISTS projeto_id UUID REFERENCES public.projetos(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS repeticao TEXT DEFAULT 'none', -- none, daily, weekly, monthly
ADD COLUMN IF NOT EXISTS data_base TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create rotinas table (fixed checklist definitions)
CREATE TABLE IF NOT EXISTS public.rotinas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    itens JSONB DEFAULT '[]'::jsonb, -- Array of objects {id, label}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create rotina_conclusoes table (daily tracking)
CREATE TABLE IF NOT EXISTS public.rotina_conclusoes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    rotina_id UUID NOT NULL REFERENCES public.rotinas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    itens_concluidos TEXT[] DEFAULT '{}', -- Array of item IDs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(rotina_id, user_id, data)
);

-- Enable RLS
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotina_conclusoes ENABLE ROW LEVEL SECURITY;

-- Policies for projetos
CREATE POLICY "Users can manage their own projects" 
ON public.projetos 
FOR ALL 
USING (auth.uid() = user_id);

-- Policies for rotinas
CREATE POLICY "Users can manage their own routines" 
ON public.rotinas 
FOR ALL 
USING (auth.uid() = user_id);

-- Policies for rotina_conclusoes
CREATE POLICY "Users can manage their own routine completions" 
ON public.rotina_conclusoes 
FOR ALL 
USING (auth.uid() = user_id);

-- Add some default projects and routines for a new user would be good, 
-- but we'll handle that in the app logic or via UI.
