import type { MetadataRoute } from 'next';

// Static sitemap for the five-page marketing site. Trailing slashes match
// next.config's trailingSlash:true so the URLs agree with what ships.
const BASE = 'https://www.fusioncoffeeshop.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: { path: string; priority: number }[] = [
    { path: '/', priority: 1 },
    { path: '/menu/', priority: 0.9 },
    { path: '/merch/', priority: 0.7 },
    { path: '/party/', priority: 0.7 },
    { path: '/about/', priority: 0.6 },
    { path: '/contact/', priority: 0.6 },
  ];

  return routes.map(({ path, priority }) => ({
    url: `${BASE}${path}`,
    changeFrequency: path === '/menu/' ? 'weekly' : 'monthly',
    priority,
  }));
}
