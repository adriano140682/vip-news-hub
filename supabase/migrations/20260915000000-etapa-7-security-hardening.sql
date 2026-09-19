-- Etapa 7: hardening de segurança
-- Impede que um usuário autenticado altere ou insira seu próprio perfil
-- com role elevada. Perfis continuam sendo criados pelo trigger SECURITY DEFINER
-- e administrados por usuários autorizados.

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles"
ON public.profiles
FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

COMMENT ON TABLE public.profiles IS 'Perfis criados pelo trigger de autenticação e administrados por usuários autorizados; usuários comuns não podem alterar sua role.';

ALTER FUNCTION public.is_admin() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
