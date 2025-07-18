-- Primeiro, vamos criar um usuário admin diretamente
-- Como não podemos inserir diretamente em auth.users, vamos criar uma função para facilitar o login

-- Função para promover um usuário específico para admin
CREATE OR REPLACE FUNCTION promote_to_admin(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_uuid uuid;
BEGIN
    -- Buscar o user_id pelo email
    SELECT id INTO user_uuid 
    FROM auth.users 
    WHERE email = user_email;
    
    -- Se o usuário existe, promover para admin
    IF user_uuid IS NOT NULL THEN
        UPDATE public.profiles 
        SET role = 'admin'
        WHERE user_id = user_uuid;
        
        -- Se não existe perfil, criar um
        IF NOT FOUND THEN
            INSERT INTO public.profiles (user_id, name, role)
            VALUES (user_uuid, 'Admin', 'admin');
        END IF;
    END IF;
END;
$$;

-- Atualizar a função handle_new_user para garantir que admin@test.com seja sempre admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Inserir perfil padrão
  INSERT INTO public.profiles (user_id, name, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 
    CASE 
      WHEN NEW.email = 'admin@test.com' THEN 'admin'::user_role
      ELSE 'user'::user_role
    END
  );
  RETURN NEW;
END;
$$;