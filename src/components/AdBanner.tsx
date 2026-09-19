import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AdBannerProps {
  id?: string;
  title: string;
  description?: string | null;
  image?: string | null;
  link?: string | null;
  altText?: string | null;
  sponsored?: boolean;
  size?: 'small' | 'medium' | 'large';
  position?: 'sidebar' | 'horizontal' | 'featured';
}

const AdBanner = ({ id, title, description, image, link, altText, sponsored = false, size = 'medium', position = 'sidebar' }: AdBannerProps) => {
  const getSizeClasses = () => size === 'small' ? 'h-32' : size === 'large' ? 'h-64' : 'h-48';
  const getLayoutClasses = () => position === 'horizontal' ? 'flex-row' : position === 'featured' ? 'flex-col bg-gradient-to-r from-vip-gold/10 to-primary/10' : 'flex-col';
  const handleClick = () => {
    if (id) void supabase.rpc('record_ad_click', { p_ad_id: id });
  };

  const content = <div className={`group relative overflow-hidden rounded-lg border border-border bg-card hover:shadow-lg transition-all duration-300 ${getSizeClasses()}`}><div className={`flex ${getLayoutClasses()} h-full`}>{image ? <div className="relative flex-1"><img src={image} alt={altText || title} loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" /></div> : <div className="flex-1 bg-secondary" />}<div className={`absolute bottom-0 left-0 right-0 p-4 text-white ${position === 'horizontal' ? 'relative bg-card text-foreground flex-1 flex flex-col justify-center' : ''}`}><div className="flex items-center gap-2 mb-1"><span className="text-xs bg-vip-gold text-black px-2 py-1 rounded font-medium">{sponsored ? 'PATROCINADO' : 'PUBLICIDADE'}</span></div><h4 className={`font-bold mb-1 ${position === 'horizontal' ? 'text-foreground' : ''}`}>{title}</h4>{description && <p className={`text-sm opacity-90 line-clamp-2 ${position === 'horizontal' ? 'text-muted-foreground' : ''}`}>{description}</p>}{link && <div className="mt-2"><span className={`inline-flex items-center gap-1 text-xs hover:underline ${position === 'horizontal' ? 'text-primary' : 'text-white'}`}>Saiba mais <ExternalLink className="h-3 w-3" /></span></div>}</div></div></div>;
  return link ? <a href={link} target="_blank" rel="noopener noreferrer sponsored" onClick={handleClick} aria-label={title}>{content}</a> : content;
};

export default AdBanner;
