import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Eye } from "lucide-react";
import { Link } from "react-router-dom";

interface NewsCardProps {
  title: string;
  summary: string;
  image: string;
  category: string;
  date: string;
  slug: string;
  views?: number;
}

const NewsCard = ({ title, summary, image, category, date, slug, views = 0 }: NewsCardProps) => {
  return (
    <Link to={`/artigo/${slug}`}>
      <Card className="group cursor-pointer overflow-hidden border-border bg-card hover:shadow-lg transition-all duration-300 hover:shadow-primary/10">
        <div className="relative overflow-hidden">
          <img 
            src={image} 
            alt={title}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <Badge 
            variant="secondary" 
            className="absolute top-3 left-3 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {category}
          </Badge>
        </div>
        
        <div className="p-4 space-y-3">
          <h3 className="font-bold text-lg line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          
          <p className="text-muted-foreground text-sm line-clamp-3">
            {summary}
          </p>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{date}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{views} views</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default NewsCard;