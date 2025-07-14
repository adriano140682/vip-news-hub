import { useEffect, useState } from "react";
import Header from "@/components/Header";
import NewsCard from "@/components/NewsCard";
import AdBanner from "@/components/AdBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Flame, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-news.jpg";

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
  featured: boolean;
}

const Home = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [featuredArticle, setFeaturedArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching articles:', error);
        return;
      }

      const featured = data?.find(article => article.featured);
      const regular = data?.filter(article => !article.featured) || [];
      
      setFeaturedArticle(featured || null);
      setArticles(regular);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const trendingTopics = [
    "Operação Policial",
    "Nova Escola", 
    "Auxílio Famílias",
    "Festival Cultural",
    "Chuvas Intensas"
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      {featuredArticle ? (
        <section className="relative h-96 overflow-hidden">
          <img 
            src={featuredArticle.image_url || heroImage} 
            alt={featuredArticle.title} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30" />
          <div className="absolute inset-0 flex items-center">
            <div className="container mx-auto px-4">
              <div className="max-w-2xl text-white">
                <Badge className="mb-4 bg-news-highlight text-white">
                  <Flame className="h-3 w-3 mr-1" />
                  DESTAQUE DO DIA
                </Badge>
                <h2 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                  {featuredArticle.title}
                </h2>
                <p className="text-xl mb-6 opacity-90">
                  {featuredArticle.summary}
                </p>
                <Button size="lg" className="bg-primary hover:bg-primary/90" asChild>
                  <Link to={`/artigo/${featuredArticle.slug}`}>
                    Leia a matéria completa
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="relative h-96 overflow-hidden">
          <img 
            src={heroImage} 
            alt="Hero News" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30" />
          <div className="absolute inset-0 flex items-center">
            <div className="container mx-auto px-4">
              <div className="max-w-2xl text-white">
                <Badge className="mb-4 bg-news-highlight text-white">
                  <Flame className="h-3 w-3 mr-1" />
                  DESTAQUE DO DIA
                </Badge>
                <h2 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                  Informação em Tempo Real
                </h2>
                <p className="text-xl mb-6 opacity-90">
                  Fique por dentro das principais notícias da sua região com conteúdo atualizado 24 horas por dia.
                </p>
                <Button size="lg" className="bg-primary hover:bg-primary/90" asChild>
                  <Link to="/categoria/inicio">
                    Ver Todas as Notícias
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Latest News */}
            <section className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-bold text-foreground">Últimas Notícias</h2>
                <Badge className="bg-news-highlight text-white animate-pulse">
                  <Clock className="h-3 w-3 mr-1" />
                  AO VIVO
                </Badge>
              </div>
              
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-48 bg-secondary rounded-lg mb-4"></div>
                      <div className="h-4 bg-secondary rounded mb-2"></div>
                      <div className="h-4 bg-secondary rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            </section>

            {/* Load More */}
            <div className="text-center">
              <Button variant="outline" size="lg" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground" asChild>
                <Link to="/categoria/inicio">
                  Carregar Mais Notícias
                </Link>
              </Button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Trending Topics */}
            <section className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Tópicos em Alta
              </h3>
              <div className="space-y-2">
                {trendingTopics.map((topic, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors cursor-pointer">
                    <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    <span className="text-foreground font-medium">{topic}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Ads */}
            <AdBanner 
              title="Sua empresa aqui!"
              description="Anuncie com a gente e alcance milhares de leitores diariamente."
              image="https://images.unsplash.com/photo-1556761175-b413da4baf72?w=400&h=300&fit=crop"
            />

            <AdBanner 
              title="Loja de Eletrônicos"
              description="Confira nossas promoções especiais com até 50% de desconto."
              image="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop"
              link="#"
            />

            {/* Newsletter */}
            <section className="bg-gradient-to-br from-primary to-accent p-6 rounded-lg text-white">
              <h3 className="text-xl font-bold mb-2">Newsletter VIP</h3>
              <p className="mb-4 opacity-90">Receba as principais notícias no seu email</p>
              <div className="space-y-3">
                <input 
                  type="email" 
                  placeholder="Seu melhor email"
                  className="w-full p-3 rounded-lg text-black"
                />
                <Button className="w-full bg-white text-primary hover:bg-gray-100">
                  Assinar Grátis
                </Button>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-secondary border-t border-border mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
              Os Mais VIP's
            </h3>
            <p className="text-muted-foreground mb-4">
              Portal de Notícias • Informação em Tempo Real
            </p>
            <p className="text-sm text-muted-foreground">
              © 2024 Os Mais VIP's. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;