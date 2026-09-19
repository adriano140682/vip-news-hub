-- Etapa 7: correções de segurança
-- O contador público usa record_article_view(), uma função SECURITY DEFINER
-- que valida o artigo antes de inserir em visits. A inserção direta anônima
-- é removida para impedir poluição arbitrária das métricas.

DROP POLICY IF EXISTS "Anyone can insert visits" ON public.visits;

-- Comentários não estão ativos no portal público nesta versão. A inserção
-- anônima é removida; a leitura de aprovados e a administração existente são
-- preservadas para futura ativação controlada.
DROP POLICY IF EXISTS "Anyone can insert comments" ON public.comments;
