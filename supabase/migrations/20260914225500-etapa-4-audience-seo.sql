-- Etapa 4: audiência e SEO
-- Reutiliza articles.views e visits já existentes; não cria tabelas duplicadas.

CREATE OR REPLACE FUNCTION public.record_article_view(p_article_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  article_is_public BOOLEAN;
BEGIN
  SELECT (status = 'published'::public.article_status AND published = true)
    INTO article_is_public
  FROM public.articles
  WHERE id = p_article_id;

  IF COALESCE(article_is_public, false) = false THEN
    RETURN false;
  END IF;

  INSERT INTO public.visits (article_id, user_agent)
  VALUES (p_article_id, NULL);

  UPDATE public.articles
  SET views = COALESCE(views, 0) + 1,
      updated_at = updated_at
  WHERE id = p_article_id
    AND status = 'published'::public.article_status
    AND published = true;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.record_article_view(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_article_view(UUID) TO anon, authenticated;

COMMENT ON FUNCTION public.record_article_view(UUID) IS 'Registra uma visualização somente para artigos publicados e públicos.';
