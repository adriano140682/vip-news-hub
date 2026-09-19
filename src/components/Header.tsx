import { useEffect, useState } from "react";
import { Search, Menu, User, Calendar, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type Category = { name: string; slug: string };

const Header = () => {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase.from('categories').select('name, slug').eq('active', true).order('display_order').order('name').then(({ data, error }) => {
      if (error) console.warn('Não foi possível carregar categorias do menu:', error.message);
      setCategories((data || []) as Category[]);
    });
  }, []);

  const currentDate = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const menuCategories = categories.length ? categories : [{ name: 'INÍCIO', slug: 'inicio' }];

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const term = search.trim();
    if (term) navigate(`/buscar?q=${encodeURIComponent(term)}`);
  };

  return <header className="w-full bg-background border-b border-border"><div className="bg-primary text-primary-foreground py-2"><div className="container mx-auto px-4 flex justify-between items-center text-sm"><div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span className="capitalize">{currentDate}</span></div><div className="flex items-center gap-4"><span>Tempo Real • Notícias 24h</span>{user ? <div className="flex items-center gap-2">{isAdmin && <Button asChild variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary/20"><Link to="/admin">Admin</Link></Button>}<Button onClick={signOut} variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary/20"><LogOut className="h-4 w-4 mr-2" />Sair</Button></div> : <Button asChild variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary/20"><Link to="/auth"><User className="h-4 w-4 mr-2" />Login</Link></Button>}</div></div></div><div className="container mx-auto px-4 py-6"><div className="flex flex-col md:flex-row items-center justify-between gap-6"><div className="text-center md:text-left"><h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Os Mais VIP's</h1><p className="text-muted-foreground text-sm mt-1">Portal de Notícias • Informação em Tempo Real</p></div><form onSubmit={submitSearch} className="relative w-full md:w-96"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar notícias..." className="pl-10 bg-secondary border-border" aria-label="Buscar notícias" /></form></div></div><nav className="bg-secondary border-t border-border"><div className="container mx-auto px-4"><div className="flex items-center justify-between"><div className="hidden md:flex">{menuCategories.map((category) => <Link key={category.slug} to={`/categoria/${category.slug}`} className="px-6 py-4 font-medium text-sm transition-all hover:bg-primary/10 text-foreground hover:text-primary">{category.name}</Link>)}</div><Button variant="ghost" size="sm" className="md:hidden"><Menu className="h-5 w-5" /></Button><div className="flex items-center gap-2 bg-news-highlight text-white px-4 py-2 rounded-md"><div className="w-2 h-2 bg-white rounded-full animate-pulse" /><span className="text-sm font-medium">AO VIVO</span></div></div></div></nav></header>;
};

export default Header;
