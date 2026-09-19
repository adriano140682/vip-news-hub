import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Image } from 'lucide-react';

interface Ad {
  id: string;
  ad_type: string;
  title: string;
  description: string | null;
  image_url: string | null;
  alt_text: string | null;
  link_url: string | null;
  position: string;
  priority: number;
  sponsored: boolean;
  click_count: number;
  impression_count: number;
  start_date: string;
  end_date: string;
  active: boolean;
  created_at: string;
}

const positions = [
  { value: 'HOME_TOP', label: 'Homepage — Topo' },
  { value: 'HOME_MIDDLE', label: 'Homepage — Meio' },
  { value: 'HOME_BOTTOM', label: 'Homepage — Inferior' },
  { value: 'ARTICLE_TOP', label: 'Notícia — Topo' },
  { value: 'ARTICLE_MIDDLE', label: 'Notícia — Meio' },
  { value: 'ARTICLE_BOTTOM', label: 'Notícia — Inferior' },
  { value: 'CATEGORY_TOP', label: 'Categoria — Topo' },
  { value: 'SIDEBAR_TOP', label: 'Barra Lateral' },
  { value: 'banner', label: 'Banner Principal (legado)' },
  { value: 'sidebar', label: 'Barra Lateral (legado)' },
  { value: 'header', label: 'Cabeçalho (legado)' },
  { value: 'footer', label: 'Rodapé (legado)' },
  { value: 'between-articles', label: 'Entre Artigos (legado)' },
];

export function AdManager() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    ad_type: 'banner_image',
    title: '',
    description: '',
    image_url: '',
    alt_text: '',
    link_url: '',
    position: 'HOME_TOP',
    priority: 0,
    sponsored: false,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    active: true,
  });

  const fetchAds = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAds(data || []);
    } catch (error) {
      console.error('Erro ao buscar anúncios:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar anúncios',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `ads/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('uploads')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const imageUrl = await uploadImage(file);
      setFormData(prev => ({ ...prev, image_url: imageUrl }));
      toast({
        title: 'Sucesso',
        description: 'Imagem enviada com sucesso!',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao enviar imagem',
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (formData.link_url && !/^https?:\/\//i.test(formData.link_url)) throw new Error('O link deve usar http:// ou https://.');
      if (formData.ad_type === 'banner_image' && !formData.image_url) throw new Error('Anúncios de imagem precisam de uma imagem.');
      const adData = {
        ...formData,
        priority: Number(formData.priority) || 0,
        end_date: formData.end_date || null,
        image_url: formData.image_url || null,
      };

      if (editingAd) {
        const { error } = await supabase
          .from('ads')
          .update(adData)
          .eq('id', editingAd.id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Anúncio atualizado com sucesso!',
        });
      } else {
        const { error } = await supabase
          .from('ads')
          .insert([adData]);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Anúncio criado com sucesso!',
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchAds();
    } catch (error) {
      console.error('Erro ao salvar anúncio:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao salvar anúncio',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este anúncio?')) return;

    try {
      const { error } = await supabase
        .from('ads')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Anúncio excluído com sucesso!',
      });
      fetchAds();
    } catch (error) {
      console.error('Erro ao excluir anúncio:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir anúncio',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (ad: Ad) => {
    setEditingAd(ad);
    setFormData({
      ad_type: ad.ad_type,
      title: ad.title,
      description: ad.description || '',
      image_url: ad.image_url || '',
      alt_text: ad.alt_text || '',
      link_url: ad.link_url || '',
      position: ad.position,
      priority: ad.priority,
      sponsored: ad.sponsored,
      start_date: ad.start_date,
      end_date: ad.end_date || '',
      active: ad.active,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingAd(null);
    setFormData({
      ad_type: 'banner_image',
      title: '',
      description: '',
      image_url: '',
      alt_text: '',
      link_url: '',
      position: 'HOME_TOP',
      priority: 0,
      sponsored: false,
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      active: true,
    });
  };

  const openDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const getAdStatus = (ad: Ad) => {
    const now = new Date();
    const startDate = new Date(ad.start_date);
    const endDate = ad.end_date ? new Date(ad.end_date) : null;
    if (!ad.active) return 'Inativo';
    if (startDate > now) return 'Agendado';
    if (endDate && endDate < now) return 'Expirado';
    return 'Ativo';
  };

  if (loading) {
    return <div className="p-4">Carregando anúncios...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gerenciar Anúncios</h2>
          <p className="text-muted-foreground">
            Crie e gerencie os anúncios publicitários do site
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Anúncio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingAd ? 'Editar Anúncio' : 'Novo Anúncio'}
              </DialogTitle>
              <DialogDescription>
                Preencha as informações do anúncio
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="ad_type">Tipo</Label><Select value={formData.ad_type} onValueChange={(value) => setFormData(prev => ({ ...prev, ad_type: value }))}><SelectTrigger id="ad_type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="banner_image">Banner de imagem</SelectItem><SelectItem value="sponsored_link">Link patrocinado</SelectItem><SelectItem value="reserved_space">Espaço reservado</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label htmlFor="priority">Prioridade</Label><Input id="priority" type="number" min="0" value={formData.priority} onChange={(e) => setFormData(prev => ({ ...prev, priority: Number(e.target.value) }))} /></div></div>
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2"><Label htmlFor="description">Descrição</Label><Input id="description" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} /></div>

              <div className="space-y-2">
                <Label>Imagem do Anúncio (opcional para link patrocinado e espaço reservado)</Label>
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
                {uploadingImage && <span className="text-sm text-muted-foreground">Enviando...</span>}
                {formData.image_url && (
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded"
                  />
                )}
              </div>

              <div className="space-y-2"><Label htmlFor="alt_text">Texto alternativo</Label><Input id="alt_text" value={formData.alt_text} onChange={(e) => setFormData(prev => ({ ...prev, alt_text: e.target.value }))} placeholder="Descrição da imagem" /></div>

              <div className="space-y-2">
                <Label htmlFor="link_url">Link (opcional)</Label>
                <Input
                  id="link_url"
                  type="url"
                  value={formData.link_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Posição</Label>
                <Select
                  value={formData.position}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, position: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map(position => (
                      <SelectItem key={position.value} value={position.value}>
                        {position.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Data de Início</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Data de Fim (opcional)</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                />
                <Label htmlFor="active">Ativo</Label>
              </div>

              <div className="flex items-center space-x-2"><Switch id="sponsored" checked={formData.sponsored} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sponsored: checked }))} /><Label htmlFor="sponsored">Identificar como patrocinado</Label></div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingAd ? 'Atualizar' : 'Criar'} Anúncio
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Anúncios
          </CardTitle>
          <CardDescription>
            Lista de todos os anúncios cadastrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ads.length === 0 ? (
            <div className="text-center py-8">
              <Image className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Nenhum anúncio</h3>
              <p className="text-muted-foreground">
                Crie seu primeiro anúncio para começar.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Posição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ads.map((ad) => (
                  <TableRow key={ad.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {ad.image_url && (
                          <img
                            src={ad.image_url}
                            alt={ad.title}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        {ad.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      {positions.find(p => p.value === ad.position)?.label}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getAdStatus(ad) === 'Ativo' ? 'default' : 'secondary'}>
                        {getAdStatus(ad)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>Início: {new Date(ad.start_date).toLocaleDateString('pt-BR')}</div>
                        {ad.end_date && (
                          <div>Fim: {new Date(ad.end_date).toLocaleDateString('pt-BR')}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(ad)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(ad.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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
