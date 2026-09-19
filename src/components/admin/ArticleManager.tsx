import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { RichTextEditor } from '@/components/RichTextEditor';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { DEFAULT_ARTICLE_FONT_SIZE, extractArticleContent, normalizeArticleFontSize, serializeArticleContent } from '@/lib/articleContent';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Database, Tables } from '@/integrations/supabase/types';
import { ChevronLeft, ChevronRight, Copy, Edit, Eye, Plus, Search, Trash2, Upload } from 'lucide-react';

const PAGE_SIZE = 10;
type ArticleStatus = Database['public']['Enums']['article_status'];
type Article = Tables<'articles'>;
type Category = Tables<'categories'>;
type Tag = Tables<'tags'>;

type ArticleWithRelations = Article & {
  category_name?: string;
  tag_ids: string[];
};

type ArticleForm = {
  title: string;
  summary: string;
  content: string;
  category_id: string;
  image_url: string;
  status: ArticleStatus;
  scheduled_for: string;
  published_at: string;
  featured: boolean;
  slug: string;
  tag_ids: string[];
  font_size: number;
};

const statusLabels: Record<ArticleStatus, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendada',
  published: 'Publicada',
  archived: 'Arquivada',
};

const emptyForm: ArticleForm = {
  title: '',
  summary: '',
  content: '',
  category_id: '',
  image_url: '',
  status: 'draft',
  scheduled_for: '',
  published_at: '',
  featured: false,
  slug: '',
  tag_ids: [],
  font_size: DEFAULT_ARTICLE_FONT_SIZE,
};

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function uniqueArticleSlug(value: string, currentArticleId?: string | null) {
  const baseSlug = slugify(value);
  if (!baseSlug) return '';
  let candidate = baseSlug;
  let suffix = 2;
  while (true) {
    const { data, error } = await supabase.from('articles').select('id').eq('slug', candidate).maybeSingle();
    if (error) throw error;
    if (!data || data.id === currentArticleId) return candidate;
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function toLocalInputValue(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function toIsoValue(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function statusVariant(status: ArticleStatus) {
  return status === 'published' ? 'default' : status === 'draft' ? 'secondary' : 'outline';
}

export function ArticleManager() {
  const [articles, setArticles] = useState<ArticleWithRelations[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({ search: '', status: 'all', categoryId: 'all', from: '', to: '' });
  const [formData, setFormData] = useState<ArticleForm>(emptyForm);
  const { user } = useAuth();
  const { toast } = useToast();

  const updateForm = <K extends keyof ArticleForm>(field: K, value: ArticleForm[K]) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
  };

  const loadTaxonomy = useCallback(async () => {
    const [categoriesResult, tagsResult] = await Promise.all([
      supabase.from('categories').select('*').order('display_order').order('name'),
      supabase.from('tags').select('*').order('name'),
    ]);
    if (categoriesResult.error) throw categoriesResult.error;
    if (tagsResult.error) throw tagsResult.error;
    setCategories(categoriesResult.data || []);
    setTags(tagsResult.data || []);
  }, []);

  const loadArticles = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('articles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (filters.search.trim()) query = query.ilike('title', `%${filters.search.trim()}%`);
      if (filters.status !== 'all') query = query.eq('status', filters.status as ArticleStatus);
      if (filters.categoryId !== 'all') query = query.eq('category_id', filters.categoryId);
      if (filters.from) query = query.gte('created_at', new Date(`${filters.from}T00:00:00`).toISOString());
      if (filters.to) {
        const endDate = new Date(`${filters.to}T00:00:00`);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt('created_at', endDate.toISOString());
      }

      const { data, error, count } = await query;
      if (error) throw error;

      const rows = data || [];
      const ids = rows.map((article) => article.id);
      const { data: relations, error: relationError } = ids.length
        ? await supabase.from('article_tags').select('article_id, tag_id').in('article_id', ids)
        : { data: [], error: null };
      if (relationError) throw relationError;

      const categoryMap = new Map(categories.map((category) => [category.id, category.name]));
      const tagMap = new Map<string, string[]>();
      (relations || []).forEach((relation) => {
        const current = tagMap.get(relation.article_id) || [];
        current.push(relation.tag_id);
        tagMap.set(relation.article_id, current);
      });

      setArticles(rows.map((article) => ({
        ...article,
        category_name: categoryMap.get(article.category_id || '') || article.category,
        tag_ids: tagMap.get(article.id) || [],
      })));
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Erro ao buscar artigos:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar as notícias.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [categories, filters, page, toast]);

  useEffect(() => {
    loadTaxonomy().catch((error) => {
      console.error('Erro ao buscar categorias e tags:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar categorias e tags.', variant: 'destructive' });
    });
  }, [loadTaxonomy, toast]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  const uploadImage = async (file: File) => {
    const extension = IMAGE_EXTENSIONS[file.type];
    if (!extension) throw new Error('Selecione uma imagem JPG, PNG, WEBP ou GIF.');
    if (file.size > MAX_IMAGE_SIZE) throw new Error('A imagem deve ter no máximo 5 MB.');
    const path = `articles/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from('uploads').upload(path, file, { upsert: false });
    if (error) throw error;
    return supabase.storage.from('uploads').getPublicUrl(path).data.publicUrl;
  };

  const removeStorageImage = async (url: string) => {
    const marker = '/storage/v1/object/public/uploads/';
    let parsedUrl: URL;
    try { parsedUrl = new URL(url); } catch { return; }
    if (parsedUrl.origin !== new URL(SUPABASE_URL).origin) return;
    const markerIndex = url.indexOf(marker);
    if (markerIndex < 0) return;
    const path = url.slice(markerIndex + marker.length);
    const { error } = await supabase.storage.from('uploads').remove([path]);
    if (error) console.warn('Não foi possível remover a imagem antiga:', error.message);
  };

  const removeStorageImageIfUnused = async (url: string, excludedArticleId?: string) => {
    const query = supabase.from('articles').select('id').eq('image_url', url).limit(1);
    const { data, error } = excludedArticleId ? await query.neq('id', excludedArticleId) : await query;
    if (error) {
      console.warn('Não foi possível verificar referências da imagem:', error.message);
      return;
    }
    if (!data?.length) await removeStorageImage(url);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setUploadingImage(true);
    try {
      const imageUrl = await uploadImage(file);
      updateForm('image_url', imageUrl);
      toast({ title: 'Sucesso', description: 'Imagem enviada com sucesso.' });
    } catch (error) {
      console.error('Erro ao enviar imagem:', error);
      toast({ title: 'Erro', description: 'Não foi possível enviar a imagem.', variant: 'destructive' });
    } finally {
      setUploadingImage(false);
    }
  };

  const buildFormFromArticle = async (article: Article): Promise<ArticleForm> => {
    const { data: relations, error } = await supabase.from('article_tags').select('tag_id').eq('article_id', article.id);
    if (error) throw error;
    const articleContent = extractArticleContent(article.content);
    return {
      title: article.title,
      summary: article.summary || '',
      content: articleContent.html,
      category_id: article.category_id || categories.find((category) => category.name === article.category)?.id || '',
      image_url: article.image_url || '',
      status: article.status,
      scheduled_for: toLocalInputValue(article.scheduled_for),
      published_at: toLocalInputValue(article.published_at),
      featured: Boolean(article.featured),
      slug: article.slug || slugify(article.title),
      tag_ids: (relations || []).map((relation) => relation.tag_id),
      font_size: articleContent.fontSize,
    };
  };

  const resetForm = () => {
    setEditingArticle(null);
    setImageFile(null);
    setFormData(emptyForm);
  };

  const openNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = async (article: Article) => {
    try {
      const nextForm = await buildFormFromArticle(article);
      if (nextForm.category_id && !categories.some((category) => category.id === nextForm.category_id)) {
        const { data: inactiveCategory, error } = await supabase.from('categories').select('*').eq('id', nextForm.category_id).maybeSingle();
        if (error) throw error;
        if (inactiveCategory) setCategories((current) => [...current, inactiveCategory]);
      }
      setFormData(nextForm);
      setEditingArticle(article);
      setIsDialogOpen(true);
    } catch (error) {
      console.error('Erro ao abrir notícia:', error);
      toast({ title: 'Erro', description: 'Não foi possível abrir a notícia.', variant: 'destructive' });
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) return 'Informe o título da notícia.';
    if (!formData.content.trim() || formData.content === '<p></p>') return 'Informe o conteúdo da notícia.';
    if (!formData.category_id) return 'Selecione uma categoria.';
    if (!formData.status) return 'Selecione um status.';
    if (formData.status === 'scheduled' && !formData.scheduled_for) return 'Informe a data e o horário do agendamento.';
    if (!formData.slug.trim()) return 'Informe um slug válido.';
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      toast({ title: 'Validação', description: validationError, variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const previousImageUrl = editingArticle?.image_url || '';
      const scheduledFor = toIsoValue(formData.scheduled_for);
      const publishedAt = formData.status === 'published' ? toIsoValue(formData.published_at) || new Date().toISOString() : null;
      const category = categories.find((item) => item.id === formData.category_id);
      const articleData = {
        title: formData.title.trim(),
        summary: formData.summary.trim() || null,
        content: serializeArticleContent(formData.content, formData.font_size),
        category_id: formData.category_id,
        category: category?.name || 'GERAL',
        image_url: formData.image_url || null,
        status: formData.status,
        scheduled_for: formData.status === 'scheduled' ? scheduledFor : null,
        published_at: publishedAt,
        archived_at: formData.status === 'archived' ? new Date().toISOString() : null,
        slug: await uniqueArticleSlug(formData.slug, editingArticle?.id),
        published: formData.status === 'published',
        featured: formData.featured,
        author_id: editingArticle?.author_id || user?.id || null,
        author_name: editingArticle?.author_name || user?.user_metadata?.name || null,
      };

      let articleId = editingArticle?.id;
      if (editingArticle) {
        const { error } = await supabase.from('articles').update(articleData).eq('id', editingArticle.id);
        if (error) throw error;
      } else {
        let insertResult = await supabase.from('articles').insert(articleData).select('id').single();
        if (insertResult.error?.code === '23505') {
          insertResult = await supabase.from('articles').insert({ ...articleData, slug: await uniqueArticleSlug(formData.slug) }).select('id').single();
        }
        if (insertResult.error) throw insertResult.error;
        articleId = insertResult.data.id;
      }

      if (articleId) {
        const { error: deleteTagsError } = await supabase.from('article_tags').delete().eq('article_id', articleId);
        if (deleteTagsError) throw deleteTagsError;
        if (formData.tag_ids.length) {
          const { error: tagsError } = await supabase.from('article_tags').insert(
            Array.from(new Set(formData.tag_ids)).map((tagId) => ({ article_id: articleId as string, tag_id: tagId })),
          );
          if (tagsError) throw tagsError;
        }
      }

      if (previousImageUrl && previousImageUrl !== formData.image_url) await removeStorageImageIfUnused(previousImageUrl, editingArticle?.id);

      toast({ title: 'Sucesso', description: editingArticle ? 'Notícia atualizada com sucesso.' : 'Notícia criada com sucesso.' });
      setIsDialogOpen(false);
      resetForm();
      await loadArticles();
    } catch (error) {
      console.error('Erro ao salvar notícia:', error);
      toast({ title: 'Erro', description: 'Não foi possível salvar a notícia.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (article: Article) => {
    if (!window.confirm(`Excluir a notícia “${article.title}”? Esta ação não pode ser desfeita.`)) return;
    try {
      const { error } = await supabase.from('articles').delete().eq('id', article.id);
      if (error) throw error;
      if (article.image_url) await removeStorageImageIfUnused(article.image_url, article.id);
      toast({ title: 'Sucesso', description: 'Notícia excluída com sucesso.' });
      await loadArticles();
    } catch (error) {
      console.error('Erro ao excluir notícia:', error);
      toast({ title: 'Erro', description: 'Não foi possível excluir a notícia.', variant: 'destructive' });
    }
  };

  const duplicateArticle = async (article: Article) => {
    try {
      const form = await buildFormFromArticle(article);
      const slug = await uniqueArticleSlug(form.slug);
      let insertResult = await supabase.from('articles').insert({
        title: `${article.title} (cópia)`,
        summary: article.summary,
        content: serializeArticleContent(form.content, form.font_size),
        category: article.category,
        category_id: article.category_id,
        image_url: article.image_url,
        status: 'draft',
        published: false,
        featured: false,
        slug,
        author_id: user?.id || null,
        author_name: user?.user_metadata?.name || article.author_name || null,
      }).select('id').single();
      if (insertResult.error?.code === '23505') {
        insertResult = await supabase.from('articles').insert({
          title: `${article.title} (cópia)`, summary: article.summary, content: article.content,
          category: article.category, category_id: article.category_id, image_url: article.image_url,
          status: 'draft', published: false, featured: false, slug: await uniqueArticleSlug(form.slug),
          author_id: user?.id || null, author_name: user?.user_metadata?.name || article.author_name || null,
        }).select('id').single();
      }
      if (insertResult.error) throw insertResult.error;
      if (form.tag_ids.length) {
        const { error: tagsError } = await supabase.from('article_tags').insert(form.tag_ids.map((tagId) => ({ article_id: insertResult.data.id, tag_id: tagId })));
        if (tagsError) throw tagsError;
      }
      toast({ title: 'Sucesso', description: 'Notícia duplicada como rascunho.' });
      await loadArticles();
    } catch (error) {
      console.error('Erro ao duplicar notícia:', error);
      toast({ title: 'Erro', description: 'Não foi possível duplicar a notícia.', variant: 'destructive' });
    }
  };

  const previewArticle = useMemo(() => ({
    ...formData,
    category: categories.find((category) => category.id === formData.category_id)?.name || 'GERAL',
    author_name: editingArticle?.author_name || user?.user_metadata?.name || null,
  }), [categories, editingArticle?.author_name, formData, user?.user_metadata?.name]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gerenciar Artigos</h2>
          <p className="text-muted-foreground">Crie, edite e organize as notícias do portal.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}><Plus className="mr-2 h-4 w-4" />Novo Artigo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingArticle ? 'Editar Artigo' : 'Novo Artigo'}</DialogTitle>
              <DialogDescription>Preencha os dados editoriais sem alterar o padrão visual do portal.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2"><Label htmlFor="article-title">Título *</Label><Input id="article-title" value={formData.title} onChange={(event) => { updateForm('title', event.target.value); if (!editingArticle || !formData.slug) updateForm('slug', slugify(event.target.value)); }} required /></div>
                <div className="space-y-2"><Label htmlFor="article-category">Categoria *</Label><Select value={formData.category_id} onValueChange={(value) => updateForm('category_id', value)}><SelectTrigger id="article-category"><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger><SelectContent>{categories.filter((category) => category.active || category.id === formData.category_id).map((category) => <SelectItem key={category.id} value={category.id}>{category.name}{!category.active ? ' (inativa)' : ''}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label htmlFor="article-status">Status *</Label><Select value={formData.status} onValueChange={(value) => updateForm('status', value as ArticleStatus)}><SelectTrigger id="article-status"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2 md:col-span-2"><Label htmlFor="article-summary">Resumo</Label><Textarea id="article-summary" value={formData.summary} onChange={(event) => updateForm('summary', event.target.value)} rows={3} /></div>
                <div className="space-y-2"><Label htmlFor="article-slug">Slug *</Label><Input id="article-slug" value={formData.slug} onChange={(event) => updateForm('slug', slugify(event.target.value))} required /><p className="text-xs text-muted-foreground">URL: /artigo/{formData.slug || 'nome-da-noticia'}</p></div>
                <div className="space-y-2"><Label htmlFor="article-scheduled">Data e horário</Label><Input id="article-scheduled" type="datetime-local" value={formData.status === 'scheduled' ? formData.scheduled_for : formData.published_at} onChange={(event) => updateForm(formData.status === 'scheduled' ? 'scheduled_for' : 'published_at', event.target.value)} /><p className="text-xs text-muted-foreground">Horário local do seu navegador.</p></div>
              </div>

              <div className="space-y-2"><Label>Imagem principal</Label><div className="flex flex-wrap items-center gap-3"><Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} className="max-w-sm" /><Button type="button" variant="outline" onClick={() => { setImageFile(null); updateForm('image_url', ''); }} disabled={!formData.image_url}><Trash2 className="mr-2 h-4 w-4" />Remover</Button>{uploadingImage && <span className="text-sm text-muted-foreground">Enviando...</span>}</div>{imageFile && <p className="text-xs text-muted-foreground">{imageFile.name}</p>}{formData.image_url && <img src={formData.image_url} alt="Pré-visualização da imagem" className="h-32 w-48 rounded object-cover" />}</div>

              <div className="space-y-2"><Label>Conteúdo *</Label><RichTextEditor content={formData.content} onChange={(content) => updateForm('content', content)} fontSize={formData.font_size} onFontSizeChange={(fontSize) => updateForm('font_size', normalizeArticleFontSize(fontSize))} /></div>

              <div className="space-y-2"><Label>Tags</Label><div className="grid grid-cols-2 gap-2 rounded-md border border-border p-3 md:grid-cols-4">{tags.length ? tags.map((tag) => <label key={tag.id} className="flex items-center gap-2 text-sm"><Checkbox checked={formData.tag_ids.includes(tag.id)} onCheckedChange={(checked) => updateForm('tag_ids', checked ? [...formData.tag_ids, tag.id] : formData.tag_ids.filter((id) => id !== tag.id))} />{tag.name}</label>) : <span className="text-sm text-muted-foreground">Nenhuma tag cadastrada.</span>}</div></div>

              <div className="flex flex-wrap items-center gap-6"><label className="flex items-center gap-2 text-sm"><Switch checked={formData.featured} onCheckedChange={(checked) => updateForm('featured', checked)} />Destaque editorial</label></div>
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setIsPreviewOpen(true)}><Eye className="mr-2 h-4 w-4" />Visualizar</Button><Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving || uploadingImage}>{saving ? 'Salvando...' : editingArticle ? 'Atualizar Artigo' : 'Criar Artigo'}</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5"><div className="relative lg:col-span-2"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={filters.search} onChange={(event) => { setPage(0); setFilters((current) => ({ ...current, search: event.target.value })); }} placeholder="Pesquisar pelo título..." className="pl-9" /></div><Select value={filters.status} onValueChange={(value) => { setPage(0); setFilters((current) => ({ ...current, status: value })); }}><SelectTrigger><SelectValue placeholder="Todos os status" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><Select value={filters.categoryId} onValueChange={(value) => { setPage(0); setFilters((current) => ({ ...current, categoryId: value })); }}><SelectTrigger><SelectValue placeholder="Todas as categorias" /></SelectTrigger><SelectContent><SelectItem value="all">Todas as categorias</SelectItem>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent></Select><Input type="date" aria-label="Data inicial" value={filters.from} onChange={(event) => { setPage(0); setFilters((current) => ({ ...current, from: event.target.value })); }} /><Input type="date" aria-label="Data final" value={filters.to} onChange={(event) => { setPage(0); setFilters((current) => ({ ...current, to: event.target.value })); }} /></div>

      <Card><CardHeader><CardTitle>Notícias</CardTitle><CardDescription>{totalCount} registro(s) encontrado(s).</CardDescription></CardHeader><CardContent>{loading ? <div className="p-4 text-muted-foreground">Carregando notícias...</div> : articles.length === 0 ? <div className="py-8 text-center text-muted-foreground">Nenhuma notícia encontrada.</div> : <><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Notícia</TableHead><TableHead>Categoria</TableHead><TableHead>Status</TableHead><TableHead>Autor</TableHead><TableHead>Data</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader><TableBody>{articles.map((article) => <TableRow key={article.id}><TableCell><div className="flex min-w-[240px] items-center gap-3">{article.image_url ? <img src={article.image_url} alt={article.title} className="h-12 w-16 rounded object-cover" /> : <div className="h-12 w-16 rounded bg-secondary" />}<div><div className="font-medium">{article.title}</div><div className="flex gap-2 text-xs text-muted-foreground">{article.featured && <Badge variant="secondary">Destaque</Badge>}{article.tag_ids.length > 0 && <span>{article.tag_ids.length} tag(s)</span>}</div></div></div></TableCell><TableCell>{article.category_name || 'Sem categoria'}</TableCell><TableCell><Badge variant={statusVariant(article.status)}>{statusLabels[article.status]}</Badge></TableCell><TableCell>{article.author_name || '—'}</TableCell><TableCell>{new Date(article.updated_at || article.created_at).toLocaleDateString('pt-BR')}</TableCell><TableCell><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => openEditDialog(article)} aria-label="Editar"><Edit className="h-4 w-4" /></Button><Button variant="outline" size="sm" onClick={() => duplicateArticle(article)} aria-label="Duplicar"><Copy className="h-4 w-4" /></Button><Button variant="outline" size="sm" onClick={() => handleDelete(article)} aria-label="Excluir"><Trash2 className="h-4 w-4" /></Button></div></TableCell></TableRow>)}</TableBody></Table></div><div className="flex items-center justify-between pt-4"><span className="text-sm text-muted-foreground">Página {page + 1} de {totalPages}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((current) => current - 1)}><ChevronLeft className="mr-1 h-4 w-4" />Anterior</Button><Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((current) => current + 1)}>Próxima<ChevronRight className="ml-1 h-4 w-4" /></Button></div></div></>}</CardContent></Card>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}><DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>Pré-visualização</DialogTitle><DialogDescription>Prévia editorial utilizando os mesmos dados da notícia.</DialogDescription></DialogHeader><article className="overflow-hidden rounded-lg border border-border bg-card"><>{previewArticle.image_url && <img src={previewArticle.image_url} alt={previewArticle.title} className="h-64 w-full object-cover" />}<div className="p-6"><Badge className="mb-3">{previewArticle.category}</Badge><h1 className="mb-3 text-3xl font-bold">{previewArticle.title || 'Título da notícia'}</h1>{previewArticle.summary && <p className="mb-5 text-lg text-muted-foreground">{previewArticle.summary}</p>}<div className="prose prose-lg max-w-none text-foreground" style={{ fontSize: `${previewArticle.font_size}px` }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewArticle.content || '<p>O conteúdo aparecerá aqui.</p>') }} /></div></></article></DialogContent></Dialog>
    </div>
  );
}
