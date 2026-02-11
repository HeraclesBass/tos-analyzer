import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fine-print.org';

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/library`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];

  try {
    const publicAnalyses = await prisma.analysis.findMany({
      where: { isPublic: true },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    const dynamicPages: MetadataRoute.Sitemap = publicAnalyses.map((analysis) => ({
      url: `${baseUrl}/analysis/${analysis.id}`,
      lastModified: analysis.createdAt,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));

    return [...staticPages, ...dynamicPages];
  } catch {
    return staticPages;
  }
}
