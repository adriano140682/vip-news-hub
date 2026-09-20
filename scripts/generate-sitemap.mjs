import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';

const siteUrl = process.env.PUBLIC_SITE_URL?.replace(/\/$/, '');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const fallbackPaths = ['/', '/categoria/inicio', '/sobre', '/contato', '/privacidade', '/cookies', '/termos', '/politica-editorial', '/anuncie'];

async function fetchRows(path) {
  if (!supabaseUrl || !supabaseKey) return [];
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`
    }
  });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

function xmlUrl(path, lastmod) {
  return `<url><loc>${siteUrl}${path}</loc>${lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : ''}</url>`;
}

try {
  const [categories, articles] = await Promise.all([
    fetchRows('categories?select=slug,updated_at&active=eq.true&order=display_order'),
    fetchRows('articles?select=slug,updated_at,published_at&status=eq.published&published=eq.true&order=published_at.desc'),
  ]);

  const paths = siteUrl ? [
    ...fallbackPaths.map((path) => xmlUrl(path)),
    ...categories.map((category) => xmlUrl(`/categoria/${encodeURIComponent(category.slug)}`, category.updated_at)),
    ...articles
      .filter((article) => article.slug)
      .map((article) => xmlUrl(`/artigo/${encodeURIComponent(article.slug)}`, article.published_at || article.updated_at)),
  ] : [];

  await mkdir('public', { recursive: true });

  await writeFile(
    'public/sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.join('')}</urlset>\n`
  );

  console.log(
    siteUrl
      ? `Sitemap gerado com ${paths.length} URLs.`
      : 'PUBLIC_SITE_URL não configurado; sitemap sem URLs absolutas até o domínio oficial ser informado.'
  );
} catch (error) {
  console.warn(`Sitemap dinâmico não disponível: ${error.message}. Mantendo o sitemap existente.`);
}