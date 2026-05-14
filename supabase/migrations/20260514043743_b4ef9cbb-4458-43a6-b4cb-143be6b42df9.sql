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
CREATE POLICY "Users can view their own anxiety dumps" 
ON public.anxiety_dumps FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own anxiety dumps" 
ON public.anxiety_dumps FOR INSERT 
WITH CHECK (auth.uid() = user_id);