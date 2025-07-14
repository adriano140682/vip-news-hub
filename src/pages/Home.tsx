import Header from "@/components/Header";
import NewsCard from "@/components/NewsCard";
import AdBanner from "@/components/AdBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Flame, Clock } from "lucide-react";
import heroImage from "@/assets/hero-news.jpg";

const Home = () => {
  // Mock data para demonstração
  const featuredNews = {
    title: "Operação da Polícia Civil prende quadrilha especializada em furtos na região",
    summary: "Grande operação deflagrada na madrugada desta terça-feira resultou na prisão de cinco suspeitos envolvidos em uma série de furtos que aterrorizava moradores da cidade.",
    category: "POLICIAL",
    image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&h=600&fit=crop",
    readTime: "5 min",
    views: 1247,
    comments: 23,
    urgent: true
  };

  const regularNews = [
    {
      title: "Nova escola municipal será inaugurada no próximo mês",
      summary: "Investimento de R$ 2,5 milhões beneficiará mais de 500 alunos da região norte da cidade.",
      category: "GERAL",
      image: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400&h=300&fit=crop",
      readTime: "3 min",
      views: 856,
      comments: 12
    },
    {
      title: "Prefeito anuncia novo programa de auxílio às famílias carentes",
      summary: "Medida visa beneficiar cerca de 3 mil famílias em situação de vulnerabilidade social.",
      category: "POLÍTICA",
      image: "https://images.unsplash.com/photo-1559523161-0fc0d8b38a7a?w=400&h=300&fit=crop",
      readTime: "4 min",
      views: 634,
      comments: 18
    },
    {
      title: "Festival de Cultura Local movimenta o centro da cidade",
      summary: "Evento reúne artistas locais e promove a cultura regional com entrada gratuita.",
      category: "VARIEDADES",
      image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop",
      readTime: "2 min",
      views: 425,
      comments: 7
    },
    {
      title: "Chuvas intensas causam alagamentos em bairros da periferia",
      summary: "Defesa Civil monitora situação e emite alerta para moradores de áreas de risco.",
      category: "GERAL",
      image: "https://images.unsplash.com/photo-1527766833261-b09c3163a791?w=400&h=300&fit=crop",
      readTime: "3 min",
      views: 912,
      comments: 15
    }
  ];

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
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                Ver Todas as Notícias
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Breaking News */}
            <section className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-bold text-foreground">Notícias em Destaque</h2>
                <Badge className="bg-news-highlight text-white animate-pulse">
                  <Clock className="h-3 w-3 mr-1" />
                  AO VIVO
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <NewsCard {...featuredNews} featured />
                {regularNews.slice(0, 2).map((news, index) => (
                  <NewsCard key={index} {...news} />
                ))}
              </div>
            </section>

            {/* Regular News Grid */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-6">Últimas Notícias</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {regularNews.slice(2).map((news, index) => (
                  <NewsCard key={index + 2} {...news} />
                ))}
              </div>
            </section>

            {/* Load More */}
            <div className="text-center">
              <Button variant="outline" size="lg" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                Carregar Mais Notícias
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