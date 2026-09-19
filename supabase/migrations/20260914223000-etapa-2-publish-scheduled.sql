-- Etapa 2: publicação de notícias agendadas
-- Não altera a migration aprovada da Etapa 1.

CREATE OR REPLACE FUNCTION public.publish_due_articles()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE public.articles
  SET status = 'published'::public.article_status,
      published = true,
      published_at = COALESCE(published_at, now()),
      scheduled_for = NULL,
      updated_at = now()
  WHERE status = 'scheduled'::public.article_status
    AND scheduled_for IS NOT NULL
    AND scheduled_for <= now();

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$;

-- A função só pode promover registros que já atingiram o horário agendado.
-- Isso permite que o portal execute a transição no carregamento, sem conceder
-- permissões de escrita geral ao visitante.
REVOKE ALL ON FUNCTION public.publish_due_articles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_due_articles() TO anon, authenticated;

COMMENT ON FUNCTION public.publish_due_articles() IS 'Publica notícias agendadas cujo horário, com timezone, já foi atingido.';
