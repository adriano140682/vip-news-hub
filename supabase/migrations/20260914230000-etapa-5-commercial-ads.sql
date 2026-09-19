-- Etapa 5: publicidade e estrutura comercial
-- Evolui public.ads existente; não cria uma tabela paralela de anúncios.

ALTER TABLE public.ads
  ALTER COLUMN image_url DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS ad_type TEXT NOT NULL DEFAULT 'banner_image',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS alt_text TEXT,
  ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sponsored BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS click_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS impression_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.ads
  DROP CONSTRAINT IF EXISTS ads_ad_type_check,
  ADD CONSTRAINT ads_ad_type_check CHECK (ad_type IN ('banner_image', 'sponsored_link', 'reserved_space')),
  DROP CONSTRAINT IF EXISTS ads_link_url_safe_check,
  ADD CONSTRAINT ads_link_url_safe_check CHECK (link_url IS NULL OR link_url ~* '^https?://'),
  DROP CONSTRAINT IF EXISTS ads_image_url_safe_check,
  ADD CONSTRAINT ads_image_url_safe_check CHECK (image_url IS NULL OR image_url ~* '^https?://'),
  DROP CONSTRAINT IF EXISTS ads_date_range_check,
  ADD CONSTRAINT ads_date_range_check CHECK (end_date IS NULL OR end_date >= start_date);

CREATE INDEX IF NOT EXISTS ads_public_position_idx
  ON public.ads (position, active, start_date, end_date, priority DESC);

CREATE OR REPLACE FUNCTION public.record_ad_click(p_ad_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ad_is_active BOOLEAN;
BEGIN
  SELECT (active = true AND start_date <= CURRENT_DATE AND (end_date IS NULL OR end_date >= CURRENT_DATE))
    INTO ad_is_active
  FROM public.ads
  WHERE id = p_ad_id;

  IF COALESCE(ad_is_active, false) = false THEN
    RETURN false;
  END IF;

  UPDATE public.ads
  SET click_count = COALESCE(click_count, 0) + 1,
      updated_at = updated_at
  WHERE id = p_ad_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.record_ad_click(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_ad_click(UUID) TO anon, authenticated;

COMMENT ON FUNCTION public.record_ad_click(UUID) IS 'Registra de forma agregada um clique em anúncio próprio ativo.';
