import { getCollection, getEntry } from 'astro:content';
import { assertContentIntegrity } from './content-integrity';

/**
 * Pre-launch the site must not be indexed. Flip this at launch (PRD M3) together with
 * removing the X-Robots-Tag header in vercel.json and opening up public/robots.txt.
 */
export const PRELAUNCH = true;

export const CATEGORY_TITLES = {
  spa: { label: 'Spa', accent: 'rituals to slow down', card: 'Spa ritual' },
  'body-skin': { label: 'Body & skin', accent: 'treatments, with care', card: 'Body & skin' },
  'brows-lips': { label: 'Brows & lips', accent: 'soft and semi-permanent', card: 'Brows & lips' },
  smile: { label: 'Smile', accent: 'a little brighter', card: 'Smile' },
} as const;

export async function loadSite() {
  const settingsEntry = await getEntry('settings', 'business');
  if (!settingsEntry) throw new Error('src/content/settings.json must contain a "business" entry');

  const allServices = await getCollection('services');
  const allPackages = await getCollection('packages');
  assertContentIntegrity(allServices, allPackages);

  const byOrder = <T extends { data: { order: number } }>(a: T, b: T) =>
    a.data.order - b.data.order;
  return {
    settings: settingsEntry.data,
    services: allServices.filter((s) => s.data.status !== 'hidden').sort(byOrder),
    packages: allPackages.filter((p) => p.data.status === 'live').sort(byOrder),
  };
}
