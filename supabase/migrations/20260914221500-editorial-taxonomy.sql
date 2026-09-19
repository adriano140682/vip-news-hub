-- Etapa 1: modelo editorial e taxonomia do VIP News Hub
-- Compatível com a tabela public.articles existente.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'article_status') THEN
    CREATE TYPE public.article_status AS ENUM ('draft', 'scheduled', 'published', 'archived');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT categories_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT categories_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE TABLE IF NOT EXISTS public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT tags_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT tags_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE TABLE IF NOT EXISTS public.article_tags (
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (article_id, tag_id)
);

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS status public.article_status,
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS category_id UUID;

-- A coluna category original é preservada para compatibilidade durante a transição.
-- category_id passa a ser a referência oficial para novas funcionalidades.
ALTER TABLE public.articles
  DROP CONSTRAINT IF EXISTS articles_category_id_fkey;

ALTER TABLE public.articles
  ADD CONSTRAINT articles_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

-- Categorias já presentes nos artigos são migradas sem remover ou renomear dados existentes.
INSERT INTO public.categories (name, slug, display_order)
VALUES
  ('INÍCIO', 'inicio', 0),
  ('POLICIAL', 'policial', 10),
  ('GERAL', 'geral', 20),
  ('POLÍTICA', 'politica', 30),
  ('VARIEDADES', 'variedades', 40),
  ('PUBLICIDADE', 'publicidade', 50),
  ('ESPORTES', 'esportes', 60)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.categories (name, slug)
SELECT DISTINCT
  trim(a.category),
  trim(both '-' FROM lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(trim(a.category), '[ÁÀÂÃÄÅáàâãäå]', 'a', 'g'),
          '[ÉÈÊËéèêë]', 'e', 'g'
        ),
        '[ÍÌÎÏíìîï]', 'i', 'g'
      ),
      '[^a-zA-Z0-9]+', '-', 'g'
    )
  )))
FROM public.articles a
WHERE a.category IS NOT NULL
  AND length(trim(a.category)) > 0
  AND length(trim(both '-' FROM lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(trim(a.category), '[ÁÀÂÃÄÅáàâãäå]', 'a', 'g'),
          '[ÉÈÊËéèêë]', 'e', 'g'
        ),
        '[ÍÌÎÏíìîï]', 'i', 'g'
      ),
      '[^a-zA-Z0-9]+', '-', 'g'
    )
  ))) > 0
ON CONFLICT (slug) DO NOTHING;

UPDATE public.articles a
SET category_id = c.id
FROM public.categories c
WHERE a.category_id IS NULL
  AND lower(trim(a.category)) = lower(c.name);

-- Artigos atuais publicados continuam publicados; os demais tornam-se rascunhos.
UPDATE public.articles
SET status = CASE WHEN COALESCE(published, false) THEN 'published'::public.article_status ELSE 'draft'::public.article_status END,
    published_at = CASE WHEN COALESCE(published, false) THEN COALESCE(published_at, created_at) ELSE NULL END
WHERE status IS NULL;

ALTER TABLE public.articles
  ALTER COLUMN status SET DEFAULT 'draft'::public.article_status,
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.articles
  DROP CONSTRAINT IF EXISTS articles_scheduled_status_check;

ALTER TABLE public.articles
  ADD CONSTRAINT articles_scheduled_status_check
  CHECK (status <> 'scheduled'::public.article_status OR scheduled_for IS NOT NULL);

CREATE INDEX IF NOT EXISTS articles_status_idx ON public.articles(status);
CREATE INDEX IF NOT EXISTS articles_scheduled_for_idx ON public.articles(scheduled_for);
CREATE INDEX IF NOT EXISTS articles_category_id_idx ON public.articles(category_id);
CREATE INDEX IF NOT EXISTS categories_active_order_idx ON public.categories(active, display_order);
CREATE INDEX IF NOT EXISTS article_tags_tag_id_idx ON public.article_tags(tag_id);

DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tags_updated_at ON public.tags;
CREATE TRIGGER update_tags_updated_at
BEFORE UPDATE ON public.tags
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- A publicação pública agora depende do status editorial. A coluna published permanece
-- temporariamente para compatibilidade com versões antigas do frontend.
DROP POLICY IF EXISTS "Anyone can view published articles" ON public.articles;
CREATE POLICY "Anyone can view published articles"
ON public.articles
FOR SELECT
USING (
  status = 'published'::public.article_status
  AND COALESCE(published, true)
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active categories" ON public.categories;
CREATE POLICY "Anyone can view active categories"
ON public.categories
FOR SELECT
USING (active = true);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories"
ON public.categories
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Anyone can view tags" ON public.tags;
CREATE POLICY "Anyone can view tags"
ON public.tags
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can manage tags" ON public.tags;
CREATE POLICY "Admins can manage tags"
ON public.tags
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Anyone can view article tags" ON public.article_tags;
CREATE POLICY "Anyone can view article tags"
ON public.article_tags
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.articles a
    WHERE a.id = article_tags.article_id
      AND a.status = 'published'::public.article_status
      AND COALESCE(a.published, true)
  )
);

DROP POLICY IF EXISTS "Admins can manage article tags" ON public.article_tags;
CREATE POLICY "Admins can manage article tags"
ON public.article_tags
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

COMMENT ON COLUMN public.articles.category IS 'Compatibilidade legada; usar category_id para novos fluxos.';
COMMENT ON COLUMN public.articles.published IS 'Compatibilidade legada; usar status para novos fluxos.';
COMMENT ON COLUMN public.articles.status IS 'Fluxo editorial: draft, scheduled, published ou archived.';
COMMENT ON COLUMN public.articles.scheduled_for IS 'Data/hora de publicação planejada, armazenada com timezone.';
COMMENT ON TABLE public.categories IS 'Editorias gerenciáveis do portal.';
COMMENT ON TABLE public.tags IS 'Tags editoriais reutilizáveis.';
COMMENT ON TABLE public.article_tags IS 'Relacionamento N:N entre artigos e tags.';
