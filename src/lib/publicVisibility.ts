import { supabase } from '@/integrations/supabase/client';

export const PUBLIC_ARTICLE_SELECT = `
  id,
  title,
  summary,
  content,
  category,
  category_id,
  image_url,
  slug,
  author_name,
  views,
  featured,
  created_at,
  updated_at,
  published_at,
  status
`;

export function publicArticlesQuery() {
  return supabase.from('articles').select(PUBLIC_ARTICLE_SELECT).eq('status', 'published').eq('published', true);
}

export function articleDate(article: { published_at?: string | null; created_at: string }) {
  return article.published_at || article.created_at;
}

export async function publishDueArticles() {
  const { error } = await supabase.rpc('publish_due_articles');
  if (error) console.warn('Não foi possível atualizar notícias agendadas:', error.message);
}
