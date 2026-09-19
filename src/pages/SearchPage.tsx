import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '@/components/Header';
import NewsCard from '@/components/NewsCard';
import heroImage from '@/assets/hero-news.jpg';
import { publicArticlesQuery, articleDate, publishDueArticles } from '@/lib/publicVisibility';
import { supabase } from '@/integrations/supabase/client';
import { useSeo } from '@/hooks/useSeo';

type Article = { id: string; title: string; summary: string | null; content: string; category: string; image_url: string | null; slug: string | null; views: number | null; created_at: string; published_at: string | null };
const PAGE_SIZE = 12;

export default function SearchPage() {
  const [params] = useSearchParams();
  const term = (params.get('q') || '').trim();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useSeo({ title: term ? `Busca: ${term} — Os Mais VIP's` : `Busca — Os Mais VIP's`, description: 'Pesquise notícias publicadas no Os Mais VIP\'s.', path: `/buscar${term ? `?q=${encodeURIComponent(term)}` : ''}` });

  useEffect(() => {
    const searchArticles = async () => {
      setLoading(true);
      try {
        await publishDueArticles();
        if (!term) { setArticles([]); return; }
        const pattern = `%${term}%`;
        const [textResult, tagResult] = await Promise.all([
          publicArticlesQuery().or(`title.ilike.${pattern},summary.ilike.${pattern},content.ilike.${pattern},category.ilike.${pattern}`).order('published_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }).limit(PAGE_SIZE),
          supabase.from('tags').select('id').ilike('name', pattern),
        ]);
        if (textResult.error) throw textResult.error;
        if (tagResult.error) throw tagResult.error;
        const tagIds = (tagResult.data || []).map((tag) => tag.id);
        let tagArticles: Article[] = [];
        if (tagIds.length) {
          const { data: relations, error: relationError } = await supabase.from('article_tags').select('article_id').in('tag_id', tagIds).limit(PAGE_SIZE);
          if (relationError) throw relationError;
          const articleIds = (relations || []).map((relation) => relation.article_id);
          if (articleIds.length) {
            const { data, error } = await publicArticlesQuery().in('id', articleIds).order('published_at', { ascending: false, nullsFirst: false }).limit(PAGE_SIZE);
            if (error) throw error;
            tagArticles = (data || []) as Article[];
          }
        }
        const merged = [...((textResult.data || []) as Article[]), ...tagArticles].filter((article, index, list) => list.findIndex((item) => item.id === article.id) === index).slice(0, PAGE_SIZE);
        setArticles(merged);
      } catch (error) { console.error('Erro ao buscar notícias:', error); setArticles([]); } finally { setLoading(false); }
    };
    searchArticles();
  }, [term]);

  return <div className="min-h-screen bg-background"><Header /><main className="container mx-auto px-4 py-8"><div className="mb-8"><h1 className="text-3xl font-bold mb-2">Busca</h1><p className="text-muted-foreground">{term ? `Resultados para “${term}”` : 'Digite um termo para pesquisar notícias.'}</p></div>{loading ? <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{[...Array(6)].map((_, i) => <div key={i} className="animate-pulse"><div className="h-48 bg-secondary rounded-lg mb-4" /><div className="h-4 bg-secondary rounded mb-2" /></div>)}</div> : articles.length ? <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{articles.map((article) => <NewsCard key={article.id} title={article.title} summary={article.summary || ''} image={article.image_url || heroImage} category={article.category} date={new Date(articleDate(article)).toLocaleDateString('pt-BR')} slug={article.slug || ''} />)}</div> : <div className="py-12 text-center text-muted-foreground">Nenhuma notícia publicada encontrada.</div>}</main></div>;
}
