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
CREATE POLICY "Users can manage their own social media usage" 
ON public.uso_redes_sociais 
FOR ALL 
USING (auth.uid() = user_id);
