import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import NewsCard from "@/components/NewsCard";
import heroImage from "@/assets/hero-news.jpg";
import { articleDate, publicArticlesQuery, publishDueArticles } from "@/lib/publicVisibility";
import { useSeo } from "@/hooks/useSeo";

type Article = { id: string; title: string; summary: string | null; category: string; image_url: string | null; slug: string | null; views: number | null; created_at: string; published_at: string | null };
type Category = { id: string; name: string; slug: string; description: string | null };

const CategoryPage = () => {
  const { category } = useParams();
  const [articles, setArticles] = useState<Article[]>([]);
  const [displayCategory, setDisplayCategory] = useState('INÍCIO');
  const [categoryDescription, setCategoryDescription] = useState('Notícias e informações atualizadas do Os Mais VIP\'s.');
  const [loading, setLoading] = useState(true);

  useSeo({ title: `${displayCategory} — Os Mais VIP's`, description: categoryDescription, path: `/categoria/${category || 'inicio'}` });

  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      try {
        await publishDueArticles();
        const { data: categoryData } = await supabase.from('categories').select('id, name, slug, description').eq('active', true).order('display_order').order('name');
        const categories = (categoryData || []) as Category[];
        const selected = categories.find((item) => item.slug === category?.toLowerCase());
        setDisplayCategory(selected?.name || (category === 'inicio' ? 'INÍCIO' : category?.toUpperCase() || 'INÍCIO'));
        setCategoryDescription(selected?.description || `Notícias de ${selected?.name || category || 'início'} no Os Mais VIP's.`);
        let query = publicArticlesQuery();
        if (category && category !== 'inicio' && selected) query = query.eq('category_id', selected.id);
        const { data, error } = await query.order('published_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
        if (error) throw error;
        setArticles((data || []) as Article[]);
      } catch (error) {
        console.error('Erro ao buscar categoria:', error);
        setArticles([]);
      } finally { setLoading(false); }
    };
    fetchArticles();
  }, [category]);

  return <div className="min-h-screen bg-background"><Header /><div className="container mx-auto px-4 py-8"><div className="mb-8"><h1 className="text-3xl font-bold mb-2">{displayCategory}</h1><p className="text-muted-foreground">{articles.length} {articles.length === 1 ? 'artigo encontrado' : 'artigos encontrados'}</p></div>{loading ? <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{[...Array(6)].map((_, i) => <div key={i} className="animate-pulse"><div className="h-48 bg-secondary rounded-lg mb-4" /><div className="h-4 bg-secondary rounded mb-2" /><div className="h-4 bg-secondary rounded w-3/4" /></div>)}</div> : articles.length === 0 ? <div className="text-center py-12"><h2 className="text-xl font-semibold mb-2">Nenhum artigo encontrado</h2><p className="text-muted-foreground">Não há artigos publicados nesta categoria ainda.</p></div> : <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{articles.map((article) => <NewsCard key={article.id} title={article.title} summary={article.summary || ''} image={article.image_url || heroImage} category={article.category} date={new Date(articleDate(article)).toLocaleDateString('pt-BR')} slug={article.slug || ''} />)}</div>}</div></div>;
};

export default CategoryPage;
