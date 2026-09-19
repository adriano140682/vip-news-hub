-- Create articles table for news content
CREATE TABLE public.articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'GERAL',
  image_url TEXT,
  slug TEXT UNIQUE,
  author_name TEXT DEFAULT 'Os Mais VIP''s',
  published BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to published articles
CREATE POLICY "Anyone can view published articles" 
ON public.articles 
FOR SELECT 
USING (published = true);

-- Create function to generate slug from title
CREATE OR REPLACE FUNCTION public.generate_slug(title TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(title, '[áàâãäå]', 'a', 'gi'),
        '[éèêë]', 'e', 'gi'
      ), 
      '[^a-z0-9]+', '-', 'gi'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_articles_updated_at
BEFORE UPDATE ON public.articles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample articles
INSERT INTO public.articles (title, summary, content, category, image_url, slug, featured) VALUES
('Prefeitura anuncia obras de infraestrutura', 'Novas obras prometem melhorar a qualidade de vida dos moradores', 'A prefeitura municipal anunciou hoje um pacote de obras de infraestrutura que beneficiará diversos bairros da cidade. As obras incluem pavimentação de ruas, melhorias no sistema de drenagem e construção de novas praças...', 'GERAL', '/api/placeholder/400/250', 'prefeitura-anuncia-obras-infraestrutura', true),
('Operação policial prende suspeitos de tráfico', 'Ação coordenada resultou na apreensão de drogas e prisão de criminosos', 'Uma operação da Polícia Civil realizada na madrugada de hoje resultou na prisão de cinco suspeitos de tráfico de drogas. Foram apreendidos mais de 10 kg de entorpecentes e material para o preparo das substâncias...', 'POLICIAL', '/api/placeholder/400/250', 'operacao-policial-prende-suspeitos-trafico', false),
('Nova escola será inaugurada no próximo mês', 'Unidade de ensino atenderá mais de 500 alunos da região', 'A nova escola municipal será inaugurada no próximo mês e promete atender a demanda educacional da região norte da cidade. A unidade conta com 12 salas de aula, laboratório de informática e quadra poliesportiva...', 'GERAL', '/api/placeholder/400/250', 'nova-escola-sera-inaugurada-proximo-mes', false),
('Festa junina movimenta centro da cidade', 'Evento tradicional atrai milhares de visitantes', 'A tradicional festa junina da cidade acontece neste fim de semana na praça central. O evento conta com barracas de comidas típicas, quadrilha e apresentações musicais. A expectativa é receber mais de 5 mil visitantes...', 'VARIEDADES', '/api/placeholder/400/250', 'festa-junina-movimenta-centro-cidade', false),
('Câmara aprova projeto de lei do executivo', 'Proposta visa modernizar a gestão municipal', 'A Câmara Municipal aprovou por unanimidade o projeto de lei enviado pelo executivo que visa modernizar a gestão pública. A nova legislação prevê a digitalização de processos e melhoria no atendimento ao cidadão...', 'POLÍTICA', '/api/placeholder/400/250', 'camara-aprova-projeto-lei-executivo', false);