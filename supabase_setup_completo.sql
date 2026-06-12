-- Create custom types for financial records
DO $$ BEGIN
    CREATE TYPE public.conta_tipo AS ENUM ('Pessoal', 'Nabih');
    CREATE TYPE public.transacao_tipo AS ENUM ('Entrada', 'Saida');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create 'Tarefas' table
CREATE TABLE IF NOT EXISTS public.tarefas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    categoria TEXT,
    data_execucao TIMESTAMPTZ DEFAULT now(),
    status_concluido BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create 'Financeiro' table
CREATE TABLE IF NOT EXISTS public.financeiro (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conta public.conta_tipo NOT NULL,
    tipo public.transacao_tipo NOT NULL,
    valor DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    descricao TEXT,
    data TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create 'Checkin_Diario' table
CREATE TABLE IF NOT EXISTS public.checkin_diario (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    horas_sono NUMERIC(4, 2),
    marmitas_prontas BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, data)
);

-- Enable Row Level Security
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_diario ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Tarefas
DROP POLICY IF EXISTS "Users can manage their own tasks" ON public.tarefas;
CREATE POLICY "Users can manage their own tasks" ON public.tarefas
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Financeiro
DROP POLICY IF EXISTS "Users can manage their own financial records" ON public.financeiro;
CREATE POLICY "Users can manage their own financial records" ON public.financeiro
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Checkin_Diario
DROP POLICY IF EXISTS "Users can manage their own check-ins" ON public.checkin_diario;
CREATE POLICY "Users can manage their own check-ins" ON public.checkin_diario
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Function and trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_tarefas_updated_at ON public.tarefas;
CREATE TRIGGER set_tarefas_updated_at BEFORE UPDATE ON public.tarefas FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_financeiro_updated_at ON public.financeiro;
CREATE TRIGGER set_financeiro_updated_at BEFORE UPDATE ON public.financeiro FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_checkin_diario_updated_at ON public.checkin_diario;
CREATE TRIGGER set_checkin_diario_updated_at BEFORE UPDATE ON public.checkin_diario FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER FUNCTION public.handle_updated_at() SET search_path = public;

-- Add status column to tarefas table
DO $$ BEGIN
    CREATE TYPE public.tarefa_status AS ENUM ('Entrada', 'Hoje', 'Amanha');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.tarefas ADD COLUMN IF NOT EXISTS status public.tarefa_status DEFAULT 'Entrada';

CREATE TABLE IF NOT EXISTS public.receitas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descricao TEXT,
    ingredientes JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.receitas ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Users can manage their own recipes" ON public.receitas;
CREATE POLICY "Users can manage their own recipes" ON public.receitas
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS set_receitas_updated_at ON public.receitas;
CREATE TRIGGER set_receitas_updated_at BEFORE UPDATE ON public.receitas FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

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
DROP POLICY IF EXISTS "Users can manage their own projects" ON public.projetos;
CREATE POLICY "Users can manage their own projects" 
ON public.projetos 
FOR ALL 
USING (auth.uid() = user_id);

-- Policies for rotinas
DROP POLICY IF EXISTS "Users can manage their own routines" ON public.rotinas;
CREATE POLICY "Users can manage their own routines" 
ON public.rotinas 
FOR ALL 
USING (auth.uid() = user_id);

-- Policies for rotina_conclusoes
DROP POLICY IF EXISTS "Users can manage their own routine completions" ON public.rotina_conclusoes;
CREATE POLICY "Users can manage their own routine completions" 
ON public.rotina_conclusoes 
FOR ALL 
USING (auth.uid() = user_id);

-- Add some default projects and routines for a new user would be good, 
-- but we'll handle that in the app logic or via UI.
ALTER TABLE public.tarefas 
ADD COLUMN IF NOT EXISTS contagem_adiamentos INTEGER DEFAULT 0;
ALTER TABLE public.tarefas 
ADD COLUMN IF NOT EXISTS deletado_por_inercia BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS data_adiamento TIMESTAMP WITH TIME ZONE;

-- Create academic activities table
CREATE TABLE IF NOT EXISTS public.atividades_academicas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL DEFAULT auth.uid(),
    nome TEXT NOT NULL,
    data_entrega DATE NOT NULL,
    concluido BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.atividades_academicas ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can view their own academic activities" ON public.atividades_academicas;
CREATE POLICY "Users can view their own academic activities" 
ON public.atividades_academicas FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own academic activities" ON public.atividades_academicas;
CREATE POLICY "Users can create their own academic activities" 
ON public.atividades_academicas FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own academic activities" ON public.atividades_academicas;
CREATE POLICY "Users can update their own academic activities" 
ON public.atividades_academicas FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own academic activities" ON public.atividades_academicas;
CREATE POLICY "Users can delete their own academic activities" 
ON public.atividades_academicas FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_atividades_academicas_updated_at ON public.atividades_academicas;
CREATE TRIGGER update_atividades_academicas_updated_at
BEFORE UPDATE ON public.atividades_academicas
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

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
DROP POLICY IF EXISTS "Users can view their own hydration" ON public.hidratacao;
CREATE POLICY "Users can view their own hydration" 
ON public.hidratacao FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own hydration" ON public.hidratacao;
CREATE POLICY "Users can insert their own hydration" 
ON public.hidratacao FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own hydration" ON public.hidratacao;
CREATE POLICY "Users can update their own hydration" 
ON public.hidratacao FOR UPDATE 
USING (auth.uid() = user_id);

-- Trigger for hydration updated_at
DROP TRIGGER IF EXISTS update_hidratacao_updated_at ON public.hidratacao;
CREATE TRIGGER update_hidratacao_updated_at
BEFORE UPDATE ON public.hidratacao
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create anxiety dumps table
CREATE TABLE IF NOT EXISTS public.anxiety_dumps (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    conteudo TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.anxiety_dumps ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can view their own anxiety dumps" ON public.anxiety_dumps;
CREATE POLICY "Users can view their own anxiety dumps" 
ON public.anxiety_dumps FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own anxiety dumps" ON public.anxiety_dumps;
CREATE POLICY "Users can insert their own anxiety dumps" 
ON public.anxiety_dumps FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create sleep_events table
CREATE TABLE IF NOT EXISTS public.sleep_events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    inicio_sono TIMESTAMP WITH TIME ZONE DEFAULT now(),
    fim_sono TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

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
DROP POLICY IF EXISTS "Users can view their own sleep events" ON public.sleep_events;
CREATE POLICY "Users can view their own sleep events" ON public.sleep_events FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own sleep events" ON public.sleep_events;
CREATE POLICY "Users can insert their own sleep events" ON public.sleep_events FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own sleep events" ON public.sleep_events;
CREATE POLICY "Users can update their own sleep events" ON public.sleep_events FOR UPDATE USING (auth.uid() = user_id);

-- Policies for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Create social media usage table
CREATE TABLE IF NOT EXISTS public.uso_redes_sociais (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    minutos INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, data)
);

-- Enable RLS
ALTER TABLE public.uso_redes_sociais ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can manage their own social media usage" ON public.uso_redes_sociais;
CREATE POLICY "Users can manage their own social media usage" 
ON public.uso_redes_sociais 
FOR ALL 
USING (auth.uid() = user_id);

ALTER TABLE public.tarefas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.projetos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uso_redes_sociais DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.receitas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.atividades_academicas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sleep_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_diario DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hidratacao DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotinas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotina_conclusoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.anxiety_dumps DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- SINGLE-USER ANONYMOUS ACCESS POLICY
-- Permite que o app acesse os dados sem autenticação,
-- usando um user_id fixo 'hw-local-user-001'.
-- Estratégia: RLS desabilitado nas tabelas do app pessoal,
-- já que é um sistema de uso único sem outros usuários.
-- ============================================================

-- Desabilita RLS em todas as tabelas do app para acesso direto com anon key
ALTER TABLE public.tarefas              DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.projetos             DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_diario       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hidratacao           DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro           DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.atividades_academicas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.anxiety_dumps        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sleep_events         DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uso_redes_sociais    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotinas              DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotina_conclusoes    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles             DISABLE ROW LEVEL SECURITY;

-- Garante que a anon key pode fazer SELECT, INSERT, UPDATE, DELETE
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
