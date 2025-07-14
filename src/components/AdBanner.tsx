import { ExternalLink } from "lucide-react";

interface AdBannerProps {
  title: string;
  description: string;
  image: string;
  link?: string;
  size?: 'small' | 'medium' | 'large';
  position?: 'sidebar' | 'horizontal' | 'featured';
}

const AdBanner = ({ 
  title, 
  description, 
  image, 
  link, 
  size = 'medium',
  position = 'sidebar' 
}: AdBannerProps) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'h-32';
      case 'large':
        return 'h-64';
      default:
        return 'h-48';
    }
  };

  const getLayoutClasses = () => {
    switch (position) {
      case 'horizontal':
        return 'flex-row';
      case 'featured':
        return 'flex-col bg-gradient-to-r from-vip-gold/10 to-primary/10';
      default:
        return 'flex-col';
    }
  };

  return (
    <div className={`group relative overflow-hidden rounded-lg border border-border bg-card hover:shadow-lg transition-all duration-300 ${getSizeClasses()}`}>
      <div className={`flex ${getLayoutClasses()} h-full`}>
        <div className="relative flex-1">
          <img 
            src={image} 
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
        
        <div className={`absolute bottom-0 left-0 right-0 p-4 text-white ${
          position === 'horizontal' ? 'relative bg-card text-foreground flex-1 flex flex-col justify-center' : ''
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-vip-gold text-black px-2 py-1 rounded font-medium">
              PUBLICIDADE
            </span>
          </div>
          
          <h4 className={`font-bold mb-1 ${position === 'horizontal' ? 'text-foreground' : ''}`}>
            {title}
          </h4>
          
          <p className={`text-sm opacity-90 line-clamp-2 ${position === 'horizontal' ? 'text-muted-foreground' : ''}`}>
            {description}
          </p>

          {link && (
            <div className="mt-2">
              <span className={`inline-flex items-center gap-1 text-xs hover:underline ${
                position === 'horizontal' ? 'text-primary' : 'text-white'
              }`}>
                Saiba mais <ExternalLink className="h-3 w-3" />
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdBanner;