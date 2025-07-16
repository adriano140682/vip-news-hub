-- Criar um usuário admin para teste
-- Primeiro vamos criar um perfil admin com um user_id específico
INSERT INTO public.profiles (user_id, name, role) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Admin Principal', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';