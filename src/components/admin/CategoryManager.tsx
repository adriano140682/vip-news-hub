import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';

type Category = Tables<'categories'>;

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function categoryErrorMessage(error: { code?: string; message?: string; status?: number } | null | undefined) {
  const message = (error?.message || '').toLowerCase();
  if (error?.code === '42501' || error?.status === 403 || message.includes('permission denied') || message.includes('row-level security')) return 'Seu usuário não tem permissão administrativa para essa operação.';
  if (error?.status === 401 || message.includes('jwt') || message.includes('auth')) return 'Sua sessão expirou. Faça login novamente.';
  if (error?.code === '23505' || message.includes('duplicate') || message.includes('unique')) return 'Já existe uma categoria com esse nome ou slug.';
  return 'Não foi possível concluir a operação no Supabase.';
}

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '', active: true, display_order: 0 });
  const { toast } = useToast();
  const { user, profile, isAdmin } = useAuth();

  const loadCategories = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('categories').select('*').order('display_order').order('name');
    if (error) {
      console.error('Erro ao carregar categorias:', error);
      toast({ title: 'Erro ao carregar categorias', description: categoryErrorMessage(error), variant: 'destructive' });
    } else setCategories(data || []);
    setLoading(false);
  }, [toast]);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const reset = () => { setEditing(null); setForm({ name: '', slug: '', description: '', active: true, display_order: 0 }); };
  const openNew = () => { reset(); setOpen(true); };
  const openEdit = (category: Category) => { setEditing(category); setForm({ name: category.name, slug: category.slug, description: category.description || '', active: category.active, display_order: category.display_order }); setOpen(true); };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !profile || !isAdmin) { toast({ title: 'Acesso não autorizado', description: 'Entre com um usuário administrador ou editor para gerenciar categorias.', variant: 'destructive' }); return; }
    const payload = { name: form.name.trim(), slug: slugify(form.slug || form.name), description: form.description.trim() || null, active: form.active, display_order: form.display_order };
    if (!payload.name || !payload.slug) { toast({ title: 'Validação', description: 'Informe nome e slug.', variant: 'destructive' }); return; }
    const [nameResult, slugResult] = await Promise.all([
      supabase.from('categories').select('id').ilike('name', payload.name).maybeSingle(),
      supabase.from('categories').select('id').eq('slug', payload.slug).maybeSingle(),
    ]);
    if (nameResult.error || slugResult.error) { const error = nameResult.error || slugResult.error; console.error('Erro ao validar categoria:', error); toast({ title: 'Erro ao validar categoria', description: categoryErrorMessage(error), variant: 'destructive' }); return; }
    if ([nameResult.data, slugResult.data].some((row) => row && row.id !== editing?.id)) { toast({ title: 'Validação', description: 'Já existe uma categoria com esse nome ou slug.', variant: 'destructive' }); return; }
    const result = editing ? await supabase.from('categories').update(payload).eq('id', editing.id) : await supabase.from('categories').insert(payload);
    if (result.error) { console.error('Erro ao salvar categoria:', result.error); toast({ title: 'Erro ao salvar categoria', description: categoryErrorMessage(result.error), variant: 'destructive' }); return; }
    toast({ title: 'Sucesso', description: editing ? 'Categoria atualizada com sucesso.' : 'Categoria criada com sucesso.' });
    setOpen(false); reset(); await loadCategories();
  };

  const remove = async (category: Category) => {
    if (!window.confirm(`Excluir a categoria “${category.name}”? Os artigos ficarão sem categoria vinculada.`)) return;
    if (!user || !profile || !isAdmin) { toast({ title: 'Acesso não autorizado', description: 'Entre com um usuário administrador ou editor para gerenciar categorias.', variant: 'destructive' }); return; }
    const { error } = await supabase.from('categories').delete().eq('id', category.id);
    if (error) { console.error('Erro ao excluir categoria:', error); toast({ title: 'Erro ao excluir categoria', description: categoryErrorMessage(error), variant: 'destructive' }); return; }
    toast({ title: 'Sucesso', description: 'Categoria excluída com sucesso.' }); await loadCategories();
  };

  return <div className="space-y-6"><div className="flex items-center justify-between"><div><h2 className="text-2xl font-bold">Categorias</h2><p className="text-muted-foreground">Gerencie as editorias utilizadas pelas notícias.</p></div><Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nova Categoria</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{editing ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle><DialogDescription>Use as categorias existentes sempre que possível.</DialogDescription></DialogHeader><form onSubmit={save} className="space-y-4"><div className="space-y-2"><Label htmlFor="category-name">Nome</Label><Input id="category-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value, slug: current.slug || slugify(event.target.value) }))} required /></div><div className="space-y-2"><Label htmlFor="category-slug">Slug</Label><Input id="category-slug" value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: slugify(event.target.value) }))} required /></div><div className="space-y-2"><Label htmlFor="category-description">Descrição</Label><Textarea id="category-description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></div><div className="flex gap-6"><label className="flex items-center gap-2 text-sm"><Switch checked={form.active} onCheckedChange={(active) => setForm((current) => ({ ...current, active }))} />Ativa</label><div className="flex items-center gap-2"><Label htmlFor="category-order">Ordem</Label><Input id="category-order" type="number" className="w-24" value={form.display_order} onChange={(event) => setForm((current) => ({ ...current, display_order: Number(event.target.value) }))} /></div></div><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit">Salvar</Button></div></form></DialogContent></Dialog></div><Card><CardHeader><CardTitle>Editorias cadastradas</CardTitle><CardDescription>{categories.length} categoria(s)</CardDescription></CardHeader><CardContent>{loading ? <div className="p-4 text-muted-foreground">Carregando categorias...</div> : <Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Slug</TableHead><TableHead>Status</TableHead><TableHead>Ordem</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader><TableBody>{categories.map((category) => <TableRow key={category.id}><TableCell className="font-medium">{category.name}</TableCell><TableCell>{category.slug}</TableCell><TableCell><Badge variant={category.active ? 'default' : 'secondary'}>{category.active ? 'Ativa' : 'Inativa'}</Badge></TableCell><TableCell>{category.display_order}</TableCell><TableCell><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => openEdit(category)}><Edit className="h-4 w-4" /></Button><Button variant="outline" size="sm" onClick={() => remove(category)}><Trash2 className="h-4 w-4" /></Button></div></TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card></div>;
}
