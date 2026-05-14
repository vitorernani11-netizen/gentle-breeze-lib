-- Add status column to tarefas table
DO $$ BEGIN
    CREATE TYPE public.tarefa_status AS ENUM ('Entrada', 'Hoje', 'Amanha');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.tarefas ADD COLUMN IF NOT EXISTS status public.tarefa_status DEFAULT 'Entrada';
