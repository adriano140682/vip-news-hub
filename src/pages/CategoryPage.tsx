import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import NewsCard from "@/components/NewsCard";

interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  image_url: string;
  slug: string;
  author_name: string;
  views: number;
  created_at: string;
}

const CategoryPage = () => {
  const { category } = useParams();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  const categoryNames: { [key: string]: string } = {
    'inicio': 'INÍCIO',
    'policial': 'POLICIAL',
    'geral': 'GERAL', 
    'politica': 'POLÍTICA',
    'variedades': 'VARIEDADES',
    'publicidade': 'PUBLICIDADE'
  };

  useEffect(() => {
    if (category) {
      fetchArticles();
    }
  }, [category]);

  const fetchArticles = async () => {
    try {
      let query = supabase
        .from('articles')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });

      if (category && category !== 'inicio') {
        const categoryName = categoryNames[category.toLowerCase()];
        if (categoryName) {
          query = query.eq('category', categoryName);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching articles:', error);
        return;
      }

      setArticles(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const displayCategory = category ? categoryNames[category.toLowerCase()] || category.toUpperCase() : 'INÍCIO';

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-48 bg-secondary rounded-lg mb-4"></div>
                <div className="h-4 bg-secondary rounded mb-2"></div>
                <div className="h-4 bg-secondary rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{displayCategory}</h1>
          <p className="text-muted-foreground">
            {articles.length} {articles.length === 1 ? 'artigo encontrado' : 'artigos encontrados'}
          </p>
        </div>

        {articles.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">Nenhum artigo encontrado</h2>
            <p className="text-muted-foreground">Não há artigos publicados nesta categoria ainda.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <NewsCard
                key={article.id}
                title={article.title}
                summary={article.summary}
                image={article.image_url}
                category={article.category}
                date={new Date(article.created_at).toLocaleDateString('pt-BR')}
                slug={article.slug}
                views={article.views}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryPage;