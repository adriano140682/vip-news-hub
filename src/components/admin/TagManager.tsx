import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';

type Tag = Tables<'tags'>;

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function tagErrorMessage(error: { code?: string; message?: string; status?: number } | null | undefined, action: 'carregar' | 'salvar' | 'excluir') {
  const code = error?.code || '';
  const message = (error?.message || '').toLowerCase();
  if (code === '23505' || message.includes('duplicate') || message.includes('unique')) return 'Já existe uma tag com esse nome ou slug.';
  if (code === '42501' || error?.status === 401 || error?.status === 403 || message.includes('row-level security') || message.includes('permission denied')) return 'Seu usuário não tem permissão administrativa para essa operação.';
  if (!error || message.includes('network') || message.includes('fetch')) return `Não foi possível ${action} as tags porque o Supabase não está acessível.`;
  return `Não foi possível ${action} a tag no Supabase. Tente novamente.`;
}

export function TagManager() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tag | null>(null);
  const [form, setForm] = useState({ name: '', slug: '' });
  const { toast } = useToast();
  const { isAdmin, user, profile } = useAuth();

  const loadTags = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('tags').select('*').order('name');
    if (error) { console.error('Erro ao carregar tags:', error); toast({ title: 'Erro ao carregar tags', description: tagErrorMessage(error, 'carregar'), variant: 'destructive' }); } else setTags(data || []);
    setLoading(false);
  }, [toast]);

  useEffect(() => { loadTags(); }, [loadTags]);
  const reset = () => { setEditing(null); setForm({ name: '', slug: '' }); };
  const openNew = () => { reset(); setOpen(true); };
  const openEdit = (tag: Tag) => { setEditing(tag); setForm({ name: tag.name, slug: tag.slug }); setOpen(true); };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !profile || !isAdmin) { toast({ title: 'Acesso não autorizado', description: 'Entre com um usuário administrador ou editor para gerenciar tags.', variant: 'destructive' }); return; }
    const payload = { name: form.name.trim(), slug: slugify(form.slug || form.name) };
    if (!payload.name || !payload.slug) { toast({ title: 'Validação', description: 'Informe nome e slug.', variant: 'destructive' }); return; }
    const [nameResult, slugResult] = await Promise.all([
      supabase.from('tags').select('id').ilike('name', payload.name).maybeSingle(),
      supabase.from('tags').select('id').eq('slug', payload.slug).maybeSingle(),
    ]);
    if (nameResult.error || slugResult.error) { const error = nameResult.error || slugResult.error; console.error('Erro ao validar tag:', error); toast({ title: 'Erro ao validar tag', description: tagErrorMessage(error, 'salvar'), variant: 'destructive' }); return; }
    if ([nameResult.data, slugResult.data].some((row) => row && row.id !== editing?.id)) { toast({ title: 'Validação', description: 'Já existe uma tag com esse nome ou slug.', variant: 'destructive' }); return; }
    const result = editing ? await supabase.from('tags').update(payload).eq('id', editing.id) : await supabase.from('tags').insert(payload);
    if (result.error) { console.error('Erro ao salvar tag:', result.error); toast({ title: 'Erro ao salvar tag', description: tagErrorMessage(result.error, 'salvar'), variant: 'destructive' }); return; }
    toast({ title: 'Sucesso', description: editing ? 'Tag atualizada com sucesso.' : 'Tag criada com sucesso.' }); setOpen(false); reset(); await loadTags();
  };

  const remove = async (tag: Tag) => {
    if (!window.confirm(`Excluir a tag “${tag.name}”? Ela será removida das notícias associadas.`)) return;
    if (!user || !profile || !isAdmin) { toast({ title: 'Acesso não autorizado', description: 'Entre com um usuário administrador ou editor para gerenciar tags.', variant: 'destructive' }); return; }
    const { error } = await supabase.from('tags').delete().eq('id', tag.id);
    if (error) { console.error('Erro ao excluir tag:', error); toast({ title: 'Erro ao excluir tag', description: tagErrorMessage(error, 'excluir'), variant: 'destructive' }); return; }
    toast({ title: 'Sucesso', description: 'Tag excluída com sucesso.' }); await loadTags();
  };

  return <div className="space-y-6"><div className="flex items-center justify-between"><div><h2 className="text-2xl font-bold">Tags</h2><p className="text-muted-foreground">Gerencie os termos usados para organizar as notícias.</p></div><Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nova Tag</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{editing ? 'Editar Tag' : 'Nova Tag'}</DialogTitle><DialogDescription>Tags podem ser associadas a várias notícias.</DialogDescription></DialogHeader><form onSubmit={save} className="space-y-4"><div className="space-y-2"><Label htmlFor="tag-name">Nome</Label><Input id="tag-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value, slug: current.slug || slugify(event.target.value) }))} required /></div><div className="space-y-2"><Label htmlFor="tag-slug">Slug</Label><Input id="tag-slug" value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: slugify(event.target.value) }))} required /></div><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit">Salvar</Button></div></form></DialogContent></Dialog></div><Card><CardHeader><CardTitle>Tags cadastradas</CardTitle><CardDescription>{tags.length} tag(s)</CardDescription></CardHeader><CardContent>{loading ? <div className="p-4 text-muted-foreground">Carregando tags...</div> : <Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Slug</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader><TableBody>{tags.map((tag) => <TableRow key={tag.id}><TableCell className="font-medium"><Badge variant="secondary">{tag.name}</Badge></TableCell><TableCell>{tag.slug}</TableCell><TableCell><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => openEdit(tag)}><Edit className="h-4 w-4" /></Button><Button variant="outline" size="sm" onClick={() => remove(tag)}><Trash2 className="h-4 w-4" /></Button></div></TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card></div>;
}
