import { Clock, Eye, MessageSquare, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface NewsCardProps {
  title: string;
  summary: string;
  category: string;
  image: string;
  readTime: string;
  views: number;
  comments: number;
  featured?: boolean;
  urgent?: boolean;
}

const NewsCard = ({ 
  title, 
  summary, 
  category, 
  image, 
  readTime, 
  views, 
  comments,
  featured = false,
  urgent = false 
}: NewsCardProps) => {
  return (
    <Card className={`group overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${
      featured ? 'md:col-span-2 md:row-span-2' : ''
    } bg-news-card-bg border-border`}>
      <div className="relative">
        <img 
          src={image} 
          alt={title}
          className={`w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
            featured ? 'h-64 md:h-80' : 'h-48'
          }`}
        />
        
        {/* Category Badge */}
        <Badge 
          className={`absolute top-4 left-4 ${
            urgent ? 'bg-news-highlight text-white' : 'bg-news-category text-white'
          }`}
        >
          <Tag className="h-3 w-3 mr-1" />
          {category}
        </Badge>

        {/* Urgent Badge */}
        {urgent && (
          <Badge className="absolute top-4 right-4 bg-news-highlight text-white animate-pulse">
            URGENTE
          </Badge>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      <CardContent className="p-6">
        <h3 className={`font-bold mb-3 text-foreground line-clamp-2 group-hover:text-primary transition-colors ${
          featured ? 'text-xl md:text-2xl' : 'text-lg'
        }`}>
          {title}
        </h3>
        
        <p className="text-muted-foreground mb-4 line-clamp-3">
          {summary}
        </p>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{readTime}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{views}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <span>{comments}</span>
            </div>
          </div>
        </div>

        <Button 
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          size="sm"
        >
          Leia Mais
        </Button>
      </CardContent>
    </Card>
  );
};

export default NewsCard;