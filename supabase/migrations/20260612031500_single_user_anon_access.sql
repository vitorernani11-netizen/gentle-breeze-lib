-- ============================================================
-- SINGLE-USER ANONYMOUS ACCESS POLICY
-- Permite que o app acesse os dados sem autenticação,
-- usando um user_id fixo 'hw-local-user-001'.
-- Estratégia: RLS desabilitado nas tabelas do app pessoal,
-- já que é um sistema de uso único sem outros usuários.
-- ============================================================

-- Desabilita RLS em todas as tabelas do app para acesso direto com anon key
-- (seguro porque o projeto é pessoal e a anon key está no app)

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
