import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Check, X, MessageSquare } from 'lucide-react';

interface Comment {
  id: string;
  article_id: string;
  user_name: string;
  email: string;
  content: string;
  approved: boolean;
  created_at: string;
  articles: {
    title: string;
  };
}

export function CommentManager() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          articles (title)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Erro ao buscar comentários:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar comentários',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .update({ approved: true })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Comentário aprovado!',
      });
      fetchComments();
    } catch (error) {
      console.error('Erro ao aprovar comentário:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao aprovar comentário',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este comentário?')) return;

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Comentário excluído!',
      });
      fetchComments();
    } catch (error) {
      console.error('Erro ao excluir comentário:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir comentário',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="p-4">Carregando comentários...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Gerenciar Comentários</h2>
        <p className="text-muted-foreground">
          Aprove ou rejeite comentários dos usuários
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comentários
          </CardTitle>
          <CardDescription>
            Lista de todos os comentários enviados pelos usuários
          </CardDescription>
        </CardHeader>
        <CardContent>
          {comments.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Nenhum comentário</h3>
              <p className="text-muted-foreground">
                Não há comentários para revisar no momento.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artigo</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Comentário</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comments.map((comment) => (
                  <TableRow key={comment.id}>
                    <TableCell className="font-medium">
                      {comment.articles?.title || 'Artigo removido'}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{comment.user_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {comment.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="truncate">{comment.content}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={comment.approved ? 'default' : 'secondary'}>
                        {comment.approved ? 'Aprovado' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(comment.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {!comment.approved && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApprove(comment.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(comment.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}