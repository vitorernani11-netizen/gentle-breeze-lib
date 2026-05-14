ALTER TABLE public.tarefas 
ADD COLUMN IF NOT EXISTS contagem_adiamentos INTEGER DEFAULT 0;