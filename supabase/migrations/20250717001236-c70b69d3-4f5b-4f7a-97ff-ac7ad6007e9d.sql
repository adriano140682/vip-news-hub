-- Limpar migrações anteriores que podem ter falhado
DELETE FROM public.profiles WHERE user_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

-- Criar usuário admin de teste usando a função sign_up do Supabase
-- Nota: Vamos criar diretamente na tabela profiles e permitir login manual

-- Primeiro, inserir o perfil admin diretamente
INSERT INTO public.profiles (user_id, name, role) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Admin Sistema', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- Criar uma função para facilitar a criação de usuários admin
CREATE OR REPLACE FUNCTION create_admin_user(email_param text, password_param text, name_param text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
BEGIN
  -- Criar usuário usando a API de auth do Supabase
  -- Como não podemos inserir diretamente em auth.users, vamos retornar instruções
  RETURN 'Use o signup normal com: ' || email_param || ' e depois execute: UPDATE profiles SET role = ''admin'' WHERE user_id = auth.uid();';
END;
$$;