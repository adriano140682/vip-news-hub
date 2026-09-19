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
import { articleDate, publicArticlesQuery, publishDueArticles } from "@/lib/publicVisibility";
import { useSeo } from "@/hooks/useSeo";

type Article = {
  id: string;
  title: string;
  summary: string | null;
  content: string;
  category: string;
  image_url: string | null;
  slug: string | null;
  author_name: string | null;
  views: number | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  featured: boolean | null;
};
type PublicAd = { id: string; title: string; description: string | null; image_url: string | null; link_url: string | null; alt_text: string | null; sponsored: boolean; position: string; priority: number };

const Home = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [featuredArticle, setFeaturedArticle] = useState<Article | null>(null);
  const [mostRead, setMostRead] = useState<Article[]>([]);
  const [sidebarAds, setSidebarAds] = useState<PublicAd[]>([]);
  const [loading, setLoading] = useState(true);

  useSeo({ title: "Os Mais VIP's — Portal de Notícias", description: 'Notícias atualizadas, informação em tempo real e conteúdo editorial do Os Mais VIP\'s.', path: '/' });

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        await publishDueArticles();
        const [latestResult, mostReadResult, adsResult] = await Promise.all([
          publicArticlesQuery().order('published_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }).limit(10),
          publicArticlesQuery().order('views', { ascending: false, nullsFirst: false }).order('published_at', { ascending: false, nullsFirst: false }).limit(5),
          supabase.from('ads').select('id, title, description, image_url, link_url, alt_text, sponsored, position, priority').in('position', ['SIDEBAR_TOP', 'HOME_MIDDLE', 'sidebar', 'banner']).eq('active', true).order('priority', { ascending: false }).limit(2),
        ]);
        if (latestResult.error) throw latestResult.error;
        if (mostReadResult.error) throw mostReadResult.error;
        if (adsResult.error) throw adsResult.error;
        const publicArticles = (latestResult.data || []) as Article[];
        const ranked = (mostReadResult.data || []) as Article[];
        const featured = publicArticles.find((article) => article.featured) || null;
        setFeaturedArticle(featured);
        setArticles(publicArticles.filter((article) => article.id !== featured?.id));
        setMostRead(ranked.some((article) => (article.views || 0) > 0) ? ranked : publicArticles.slice(0, 5));
        setSidebarAds((adsResult.data || []) as PublicAd[]);
      } catch (error) {
        console.error('Erro ao buscar notícias públicas:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, []);

  const trendingTopics = mostRead.map((article) => article.title);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {featuredArticle ? (
        <section className="relative h-96 overflow-hidden">
          <img src={featuredArticle.image_url || heroImage} alt={featuredArticle.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30" />
          <div className="absolute inset-0 flex items-center"><div className="container mx-auto px-4"><div className="max-w-2xl text-white"><Badge className="mb-4 bg-news-highlight text-white"><Flame className="h-3 w-3 mr-1" />DESTAQUE DO DIA</Badge><h2 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">{featuredArticle.title}</h2><p className="text-xl mb-6 opacity-90">{featuredArticle.summary || ''}</p><Button size="lg" className="bg-primary hover:bg-primary/90" asChild><Link to={`/artigo/${featuredArticle.slug}`}>Leia a matéria completa</Link></Button></div></div></div>
        </section>
      ) : (
        <section className="relative h-96 overflow-hidden"><img src={heroImage} alt="Hero News" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30" /><div className="absolute inset-0 flex items-center"><div className="container mx-auto px-4"><div className="max-w-2xl text-white"><Badge className="mb-4 bg-news-highlight text-white"><Flame className="h-3 w-3 mr-1" />DESTAQUE DO DIA</Badge><h2 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">Informação em Tempo Real</h2><p className="text-xl mb-6 opacity-90">Fique por dentro das principais notícias da sua região com conteúdo atualizado 24 horas por dia.</p><Button size="lg" className="bg-primary hover:bg-primary/90" asChild><Link to="/categoria/inicio">Ver Todas as Notícias</Link></Button></div></div></div></section>
      )}
      <div className="container mx-auto px-4 py-8"><div className="grid grid-cols-1 lg:grid-cols-4 gap-8"><div className="lg:col-span-3"><section className="mb-8"><div className="flex items-center gap-3 mb-6"><h2 className="text-2xl font-bold text-foreground">Últimas Notícias</h2><Badge className="bg-news-highlight text-white animate-pulse"><Clock className="h-3 w-3 mr-1" />AO VIVO</Badge></div>{loading ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{[...Array(6)].map((_, i) => <div key={i} className="animate-pulse"><div className="h-48 bg-secondary rounded-lg mb-4" /><div className="h-4 bg-secondary rounded mb-2" /><div className="h-4 bg-secondary rounded w-3/4" /></div>)}</div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{articles.map((article) => <NewsCard key={article.id} title={article.title} summary={article.summary || ''} image={article.image_url || heroImage} category={article.category} date={new Date(articleDate(article)).toLocaleDateString('pt-BR')} slug={article.slug || ''} />)}</div>}</section><div className="text-center"><Button variant="outline" size="lg" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground" asChild><Link to="/categoria/inicio">Carregar Mais Notícias</Link></Button></div></div><div className="space-y-8"><section className="bg-card p-6 rounded-lg border border-border"><h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Mais Lidas</h3><div className="space-y-2">{(trendingTopics.length ? trendingTopics : ['Nenhuma notícia disponível']).map((topic, index) => <div key={`${topic}-${index}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors"><span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">{index + 1}</span><span className="text-foreground font-medium line-clamp-2">{topic}</span></div>)}</div></section>{sidebarAds.map((ad) => <AdBanner key={ad.id} id={ad.id} title={ad.title} description={ad.description} image={ad.image_url} link={ad.link_url} altText={ad.alt_text} sponsored={ad.sponsored} />)}<section className="bg-gradient-to-br from-primary to-accent p-6 rounded-lg text-white"><h3 className="text-xl font-bold mb-2">Newsletter VIP</h3><p className="mb-4 opacity-90">Receba as principais notícias no seu email</p><div className="space-y-3"><input type="email" placeholder="Seu melhor email" className="w-full p-3 rounded-lg text-black" /><Button className="w-full bg-white text-primary hover:bg-gray-100">Assinar Grátis</Button></div></section></div></div></div>
      <footer className="bg-secondary border-t border-border mt-12"><div className="container mx-auto px-4 py-8"><div className="text-center"><h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">Os Mais VIP's</h3><p className="text-muted-foreground mb-4">Portal de Notícias • Informação em Tempo Real</p><nav aria-label="Links institucionais" className="mb-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground"><Link to="/privacidade" className="hover:text-foreground transition-colors">Política de Privacidade</Link><Link to="/termos" className="hover:text-foreground transition-colors">Termos de Uso</Link><Link to="/contato" className="hover:text-foreground transition-colors">Contato</Link></nav><p className="text-sm text-muted-foreground">© 2024 Os Mais VIP's. Todos os direitos reservados.</p></div></div></footer>
    </div>
  );
};

export default Home;
