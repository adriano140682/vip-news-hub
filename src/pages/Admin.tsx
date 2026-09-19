import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, FileText, MessageSquare, Image, Users, BarChart3, FolderTree, Tags } from 'lucide-react';
import { ArticleManager } from '@/components/admin/ArticleManager';
import { CommentManager } from '@/components/admin/CommentManager';
import { AdManager } from '@/components/admin/AdManager';
import { UserManager } from '@/components/admin/UserManager';
import { Dashboard } from '@/components/admin/Dashboard';
import { CategoryManager } from '@/components/admin/CategoryManager';
import { TagManager } from '@/components/admin/TagManager';

export default function Admin() {
  const { signOut, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">Painel Administrativo</h1>
            <p className="text-muted-foreground">Bem-vindo, {profile?.name}</p>
          </div>
          <Button onClick={() => signOut()} variant="outline"><LogOut className="mr-2 h-4 w-4" />Sair</Button>
        </div>
      </header>
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
            <TabsTrigger value="dashboard" className="flex items-center gap-2"><BarChart3 className="h-4 w-4" />Dashboard</TabsTrigger>
            <TabsTrigger value="articles" className="flex items-center gap-2"><FileText className="h-4 w-4" />Artigos</TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2"><FolderTree className="h-4 w-4" />Categorias</TabsTrigger>
            <TabsTrigger value="tags" className="flex items-center gap-2"><Tags className="h-4 w-4" />Tags</TabsTrigger>
            <TabsTrigger value="comments" className="flex items-center gap-2"><MessageSquare className="h-4 w-4" />Comentários</TabsTrigger>
            <TabsTrigger value="ads" className="flex items-center gap-2"><Image className="h-4 w-4" />Anúncios</TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2"><Users className="h-4 w-4" />Usuários</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard" className="mt-6"><Dashboard /></TabsContent>
          <TabsContent value="articles" className="mt-6"><ArticleManager /></TabsContent>
          <TabsContent value="categories" className="mt-6"><CategoryManager /></TabsContent>
          <TabsContent value="tags" className="mt-6"><TagManager /></TabsContent>
          <TabsContent value="comments" className="mt-6"><CommentManager /></TabsContent>
          <TabsContent value="ads" className="mt-6"><AdManager /></TabsContent>
          <TabsContent value="users" className="mt-6"><UserManager /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
