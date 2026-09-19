-- Revisão dos privilégios administrativos do VIP News Hub.
-- RLS permanece ativo e continua sendo a autorização efetiva por public.is_admin().
-- Nenhuma operação de escrita é concedida à role anon.

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA storage TO authenticated;

-- Cadastros editoriais administrados pelo painel.
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.categories, public.tags, public.articles, public.article_tags
TO authenticated;

-- Outros cadastros administrativos existentes.
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.comments, public.ads
TO authenticated;

-- Perfis: leitura no painel e edição somente quando a policy RLS permitir.
GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;

-- Visitas são inseridas pela função/policy pública existente; o painel apenas consulta.
GRANT SELECT ON TABLE public.visits TO authenticated;

-- Operações de mídia usadas pelo painel. As policies abaixo continuam exigindo
-- public.is_admin() para escrita; anon recebe somente leitura pública.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE storage.objects TO authenticated;
GRANT SELECT ON TABLE storage.objects TO anon;

DROP POLICY IF EXISTS "Admins can update uploads" ON storage.objects;
CREATE POLICY "Admins can update uploads"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'uploads' AND public.is_admin())
WITH CHECK (bucket_id = 'uploads' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can delete uploads" ON storage.objects;
CREATE POLICY "Admins can delete uploads"
ON storage.objects
FOR DELETE
USING (bucket_id = 'uploads' AND public.is_admin());

-- Garantir explicitamente que anon não tenha escrita nos cadastros do painel.
REVOKE INSERT, UPDATE, DELETE
ON TABLE public.categories, public.tags, public.articles, public.article_tags,
          public.ads, public.profiles
FROM anon;

REVOKE INSERT, UPDATE, DELETE ON TABLE storage.objects FROM anon;

-- A policy original "Admins can upload files" permanece responsável pelo INSERT
-- em storage.objects; as policies novas cobrem somente UPDATE e DELETE.
