-- Inserir um usuário de teste diretamente no auth.users (para teste)
-- Nota: Em produção, os usuários devem se registrar normalmente

-- Primeiro, vamos inserir um usuário de teste na tabela auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_sent_at,
  confirmation_token,
  recovery_sent_at,
  recovery_token,
  email_change_sent_at,
  new_email,
  email_change_token_new,
  email_change,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'authenticated',
  'authenticated',
  'admin@test.com',
  '$2a$10$8K1p/a0dqKP/pCfxhWA2ZeO7MaPe3.1yqWMlVmePfVt7NKkp/G.5W', -- senha: admin123
  NOW(),
  NOW(),
  '',
  NOW(),
  '',
  NOW(),
  '',
  '',
  '',
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Admin Teste"}',
  false,
  NOW(),
  NOW(),
  null,
  null,
  '',
  '',
  null,
  '',
  0,
  null,
  '',
  null
) ON CONFLICT (email) DO NOTHING;

-- Agora criar o perfil correspondente
INSERT INTO public.profiles (user_id, name, role) 
VALUES ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Admin Teste', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';