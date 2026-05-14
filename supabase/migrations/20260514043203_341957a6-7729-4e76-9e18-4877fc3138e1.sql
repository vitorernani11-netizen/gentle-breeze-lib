-- Create academic activities table
CREATE TABLE public.atividades_academicas (
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
CREATE POLICY "Users can view their own academic activities" 
ON public.atividades_academicas FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own academic activities" 
ON public.atividades_academicas FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own academic activities" 
ON public.atividades_academicas FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own academic activities" 
ON public.atividades_academicas FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_atividades_academicas_updated_at
BEFORE UPDATE ON public.atividades_academicas
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();