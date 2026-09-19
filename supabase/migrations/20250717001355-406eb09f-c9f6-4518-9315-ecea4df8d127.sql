-- Criar função para promover usuário admin@test.com automaticamente
CREATE OR REPLACE FUNCTION auto_promote_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o email for admin@test.com, promover para admin
  IF NEW.email = 'admin@test.com' THEN
    UPDATE public.profiles 
    SET role = 'admin'
    WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para promover admin automaticamente
CREATE OR REPLACE TRIGGER promote_admin_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_promote_admin();