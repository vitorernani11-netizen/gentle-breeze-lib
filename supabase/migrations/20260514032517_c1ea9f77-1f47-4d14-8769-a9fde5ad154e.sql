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
CREATE POLICY "Users can manage their own tasks" ON public.tarefas
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Financeiro
CREATE POLICY "Users can manage their own financial records" ON public.financeiro
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Checkin_Diario
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

CREATE TRIGGER set_tarefas_updated_at BEFORE UPDATE ON public.tarefas FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_financeiro_updated_at BEFORE UPDATE ON public.financeiro FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_checkin_diario_updated_at BEFORE UPDATE ON public.checkin_diario FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
