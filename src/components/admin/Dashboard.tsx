import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Archive, CalendarClock, Eye, FileEdit, FileText, FolderTree, MessageSquare, Users } from 'lucide-react';

type StatusCounts = { total: number; published: number; draft: number; scheduled: number; archived: number; categories: number; comments: number; users: number; visits: number };

const initialStats: StatusCounts = { total: 0, published: 0, draft: 0, scheduled: 0, archived: 0, categories: 0, comments: 0, users: 0, visits: 0 };

export function Dashboard() {
  const [stats, setStats] = useState<StatusCounts>(initialStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [all, published, draft, scheduled, archived, categories, comments, users, visits] = await Promise.all([
          supabase.from('articles').select('id', { count: 'exact', head: true }),
          supabase.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'published'),
          supabase.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
          supabase.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'scheduled'),
          supabase.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'archived'),
          supabase.from('categories').select('id', { count: 'exact', head: true }),
          supabase.from('comments').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('visits').select('id', { count: 'exact', head: true }),
        ]);
        const metrics = [
          ['total', all], ['published', published], ['draft', draft], ['scheduled', scheduled],
          ['archived', archived], ['categories', categories], ['comments', comments], ['users', users], ['visits', visits],
        ] as const;
        metrics.forEach(([name, result]) => {
          if (result.error) console.warn(`Não foi possível carregar a métrica ${name}:`, result.error.message);
        });
        setStats({ total: all.count || 0, published: published.count || 0, draft: draft.count || 0, scheduled: scheduled.count || 0, archived: archived.count || 0, categories: categories.count || 0, comments: comments.count || 0, users: users.count || 0, visits: visits.count || 0 });
      } catch (error) { console.error('Erro ao buscar estatísticas:', error); } finally { setLoading(false); }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Card key={index} className="animate-pulse"><CardHeader><div className="h-4 w-24 rounded bg-muted" /></CardHeader><CardContent><div className="h-7 w-16 rounded bg-muted" /></CardContent></Card>)}</div>;

  const cards = [
    { title: 'Total de Notícias', value: stats.total, icon: FileText },
    { title: 'Publicadas', value: stats.published, icon: FileText },
    { title: 'Rascunhos', value: stats.draft, icon: FileEdit },
    { title: 'Agendadas', value: stats.scheduled, icon: CalendarClock },
    { title: 'Arquivadas', value: stats.archived, icon: Archive },
    { title: 'Categorias', value: stats.categories, icon: FolderTree },
    { title: 'Comentários', value: stats.comments, icon: MessageSquare },
    { title: 'Usuários', value: stats.users, icon: Users },
  ];

  return <div className="space-y-6"><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{cards.map(({ title, value, icon: Icon }) => <Card key={title}><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{title}</CardTitle><Icon className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{value}</div></CardContent></Card>)}</div><Card><CardHeader><CardTitle>Resumo editorial</CardTitle><CardDescription>Status atual do conteúdo no Supabase.</CardDescription></CardHeader><CardContent><div className="flex flex-wrap gap-2"><Badge variant="default">{stats.published} publicadas</Badge><Badge variant="secondary">{stats.draft} rascunhos</Badge><Badge variant="outline">{stats.scheduled} agendadas</Badge><Badge variant="outline">{stats.archived} arquivadas</Badge></div><div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><Eye className="h-4 w-4" />{stats.visits} visitas registradas. O ranking de visualizações será tratado em etapa posterior.</div></CardContent></Card></div>;
}
