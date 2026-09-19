-- Correção local de privilégios das tabelas editoriais.
-- Não desabilita RLS, não cria acesso de escrita para anon e não altera
-- a policy "Admins can manage tags" nem a função public.is_admin().
-- A autorização efetiva de escrita continua sendo controlada pelas policies RLS.

-- Leitura pública já prevista pelas policies existentes.
GRANT SELECT ON TABLE public.categories, public.tags, public.articles, public.article_tags TO anon;
GRANT SELECT ON TABLE public.categories, public.tags, public.articles, public.article_tags TO authenticated;

-- O painel usa a role authenticated. A policy "Admins can manage ..."
-- continua restringindo INSERT/UPDATE/DELETE a admin/editor.
GRANT INSERT, UPDATE, DELETE ON TABLE public.tags TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.articles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.article_tags TO authenticated;

-- O AuthProvider consulta o perfil do usuário autenticado para determinar
-- admin/editor; isto não concede escrita nem altera a policy de profiles.
GRANT SELECT ON TABLE public.profiles TO authenticated;

-- Não conceder INSERT/UPDATE/DELETE a anon.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.tags FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.categories FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.articles FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.article_tags FROM anon;

-- Verificação esperada após aplicar esta migration:
--   has_table_privilege('authenticated', 'public.tags', 'INSERT') = true
--   has_table_privilege('anon', 'public.tags', 'INSERT') = false
-- A policy RLS ainda deve exigir public.is_admin() para operações de escrita.
