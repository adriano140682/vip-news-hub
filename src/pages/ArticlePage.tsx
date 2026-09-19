import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import NewsCard from "@/components/NewsCard";
import heroImage from "@/assets/hero-news.jpg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, Share2, Copy, Check } from "lucide-react";
import { articleDate, publicArticlesQuery, publishDueArticles } from "@/lib/publicVisibility";
import { useSeo } from "@/hooks/useSeo";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { extractArticleContent } from "@/lib/articleContent";

type Article = { id: string; title: string; content: string; summary: string | null; category: string; category_id: string | null; image_url: string | null; author_name: string | null; views: number | null; created_at: string; updated_at: string; published_at: string | null; slug: string | null; status: 'draft' | 'scheduled' | 'published' | 'archived' };
type RelatedArticle = { id: string; title: string; summary: string | null; category: string; image_url: string | null; slug: string | null; views: number | null; created_at: string; published_at: string | null };
type Tag = { id: string; name: string; slug: string };

const ArticlePage = () => {
  const { slug } = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [related, setRelated] = useState<RelatedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useSeo({
    title: article ? `${article.title} — Os Mais VIP's` : "Notícia — Os Mais VIP's",
    description: article?.summary || article?.title || 'Notícias e informação em tempo real no Os Mais VIP\'s.',
    path: article?.slug ? `/artigo/${article.slug}` : `/artigo/${slug || ''}`,
    image: article?.image_url,
    type: 'article',
    schema: article ? {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: article.title,
      description: article.summary || article.title,
      ...(article.image_url ? { image: [article.image_url] } : {}),
      datePublished: article.published_at || article.created_at,
      dateModified: article.updated_at,
      ...(article.author_name ? { author: { '@type': 'Person', name: article.author_name } } : {}),
      publisher: { '@type': 'Organization', name: "Os Mais VIP's" },
      mainEntityOfPage: { '@type': 'WebPage', '@id': new URL(`/artigo/${article.slug || slug || ''}`, window.location.origin).toString() },
    } : null,
  });

  useEffect(() => {
    const fetchArticle = async () => {
      if (!slug) return;
      try {
        await publishDueArticles();
        const { data, error } = await publicArticlesQuery().eq('slug', slug).single();
        if (error) throw error;
        const current = data as Article;
        setArticle(current);
        const viewKey = `vip-news-viewed:${current.id}`;
        const lastViewed = Number(window.localStorage.getItem(viewKey) || 0);
        if (!lastViewed || Date.now() - lastViewed > 30 * 60 * 1000) {
          const { error: viewError } = await supabase.rpc('record_article_view', { p_article_id: current.id });
          if (viewError) console.warn('Não foi possível registrar a visualização:', viewError.message);
          else window.localStorage.setItem(viewKey, String(Date.now()));
        }

        const { data: tagRelations } = await supabase.from('article_tags').select('tag_id').eq('article_id', current.id);
        const tagIds = (tagRelations || []).map((relation) => relation.tag_id);
        if (tagIds.length) {
          const { data: tagData } = await supabase.from('tags').select('id, name, slug').in('id', tagIds);
          setTags((tagData || []) as Tag[]);
        }

        let relatedQuery = publicArticlesQuery().neq('id', current.id);
        if (current.category_id) relatedQuery = relatedQuery.eq('category_id', current.category_id);
        const { data: categoryRelated } = await relatedQuery.order('published_at', { ascending: false, nullsFirst: false }).limit(4);
        let relatedArticles = (categoryRelated || []) as RelatedArticle[];
        if (relatedArticles.length < 4 && tagIds.length) {
          const { data: tagArticleRelations } = await supabase.from('article_tags').select('article_id').in('tag_id', tagIds).neq('article_id', current.id).limit(8);
          const extraIds = (tagArticleRelations || []).map((item) => item.article_id).filter((id) => !relatedArticles.some((item) => item.id === id));
          if (extraIds.length) {
            const { data: tagRelated } = await publicArticlesQuery().in('id', extraIds).order('published_at', { ascending: false, nullsFirst: false }).limit(4 - relatedArticles.length);
            relatedArticles = [...relatedArticles, ...((tagRelated || []) as RelatedArticle[])];
          }
        }
        if (relatedArticles.length < 4) {
          const excludedIds = [current.id, ...relatedArticles.map((item) => item.id)];
          const { data: recentRelated } = await publicArticlesQuery().not('id', 'in', `(${excludedIds.join(',')})`).order('published_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }).limit(4 - relatedArticles.length);
          relatedArticles = [...relatedArticles, ...((recentRelated || []) as RelatedArticle[])];
        }
        setRelated(relatedArticles);
      } catch (error) {
        console.error('Erro ao buscar notícia:', error);
        setArticle(null);
      } finally { setLoading(false); }
    };
    fetchArticle();
  }, [slug]);

  if (loading) return <div className="min-h-screen bg-background"><Header /><div className="container mx-auto px-4 py-8"><div className="animate-pulse"><div className="h-8 bg-secondary rounded mb-4" /><div className="h-64 bg-secondary rounded mb-4" /><div className="space-y-2"><div className="h-4 bg-secondary rounded" /><div className="h-4 bg-secondary rounded w-3/4" /></div></div></div></div>;
  if (!article) return <div className="min-h-screen bg-background"><Header /><div className="container mx-auto px-4 py-8 text-center"><h1 className="text-2xl font-bold mb-4">Artigo não encontrado</h1><p className="text-muted-foreground">O artigo que você procura não existe ou não está disponível publicamente.</p></div></div>;

  const articleUrl = new URL(`/artigo/${article.slug || slug || ''}`, window.location.origin).toString();
  const articleContent = extractArticleContent(article.content);
  const share = (url: string) => window.open(url, '_blank', 'noopener,noreferrer,width=640,height=520');
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(articleUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.warn('Não foi possível copiar o link:', error);
    }
  };

  return <div className="min-h-screen bg-background"><Header /><article className="container mx-auto px-4 py-8 max-w-4xl"><div className="bg-card rounded-lg shadow-lg overflow-hidden">{article.image_url && <img src={article.image_url || heroImage} alt={article.title} className="w-full h-64 md:h-96 object-cover" />}<div className="p-6 md:p-8"><div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4"><span className="bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">{article.category}</span><div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span>Publicado em {new Date(articleDate(article)).toLocaleDateString('pt-BR')}</span></div>{article.author_name && <div className="flex items-center gap-2"><User className="h-4 w-4" /><span>{article.author_name}</span></div>}{article.updated_at !== article.created_at && <span>Atualizado em {new Date(article.updated_at).toLocaleDateString('pt-BR')}</span>}</div><div className="flex flex-wrap items-center gap-2 mb-5" aria-label="Compartilhar notícia"><span className="mr-1 text-sm text-muted-foreground"><Share2 className="inline h-4 w-4 mr-1" />Compartilhar:</span><Button type="button" variant="outline" size="sm" onClick={() => share(`https://wa.me/?text=${encodeURIComponent(`${article.title} ${articleUrl}`)}`)}>WhatsApp</Button><Button type="button" variant="outline" size="sm" onClick={() => share(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`)}>Facebook</Button><Button type="button" variant="outline" size="sm" onClick={() => share(`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(articleUrl)}`)}>X</Button><Button type="button" variant="outline" size="sm" onClick={() => void copyLink()}>{copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}{copied ? 'Copiado' : 'Copiar link'}</Button></div><h1 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">{article.title}</h1>{article.summary && <p className="text-lg text-muted-foreground mb-6 font-medium">{article.summary}</p>}{tags.length > 0 && <div className="flex flex-wrap gap-2 mb-6">{tags.map((tag) => <Badge key={tag.id} variant="secondary">#{tag.name}</Badge>)}</div>}<div className="prose prose-lg max-w-none text-foreground" style={{ fontSize: `${articleContent.fontSize}px` }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(articleContent.html.replace(/\n/g, '<br />')) }} /></div></div></article>{related.length > 0 && <section className="container mx-auto px-4 pb-12 max-w-6xl"><h2 className="text-2xl font-bold mb-6">Notícias relacionadas</h2><div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{related.map((item) => <NewsCard key={item.id} title={item.title} summary={item.summary || ''} image={item.image_url || heroImage} category={item.category} date={new Date(articleDate(item)).toLocaleDateString('pt-BR')} slug={item.slug || ''} />)}</div></section>}</div>;
};

export default ArticlePage;
