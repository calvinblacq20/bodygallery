import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { z } from 'astro/zod';
import { contentProblems } from '../lib/content-integrity';
import { makeServiceSchema, packageSchema, settingsSchema } from './schemas';

const serviceSchema = makeServiceSchema(() => z.string());
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const validService = {
  name: 'Deep Tissue Massage',
  category: 'spa',
  summary: 'Firmer pressure that works into tight muscles.',
  durationMin: 60,
  priceGHS: 250,
  order: 1,
};

describe('service rules', () => {
  it('accepts a valid service', () => {
    expect(serviceSchema.safeParse(validService).success).toBe(true);
  });

  it('rejects prices that are not whole cedis', () => {
    expect(serviceSchema.safeParse({ ...validService, priceGHS: 249.99 }).success).toBe(false);
  });

  it('allows a missing price (shown as "on consultation", never guessed)', () => {
    const { priceGHS: _omitted, ...withoutPrice } = validService;
    expect(serviceSchema.safeParse(withoutPrice).success).toBe(true);
  });

  it('rejects a photo without meaningful alt text', () => {
    expect(
      serviceSchema.safeParse({ ...validService, photo: { src: 'room.jpg', alt: '' } }).success,
    ).toBe(false);
  });

  it('rejects unknown categories', () => {
    expect(serviceSchema.safeParse({ ...validService, category: 'shop' }).success).toBe(false);
  });
});

describe('settings rules', () => {
  const settings = JSON.parse(read('./settings.json')).business;

  it('the real settings file is valid', () => {
    const result = settingsSchema.safeParse(settings);
    expect(result.error?.issues ?? []).toEqual([]);
  });

  it('requires every weekday to be listed (null when closed)', () => {
    const { sun: _sunday, ...sixDays } = settings.hours;
    expect(settingsSchema.safeParse({ ...settings, hours: sixDays }).success).toBe(false);
  });

  it('rejects opening hours that end before they start', () => {
    const hours = { ...settings.hours, mon: { open: '19:00', close: '09:00' } };
    expect(settingsSchema.safeParse({ ...settings, hours }).success).toBe(false);
  });

  it('rejects a WhatsApp number with a plus sign or leading zero', () => {
    expect(settingsSchema.safeParse({ ...settings, whatsappE164: '+233540185528' }).success).toBe(
      false,
    );
    expect(settingsSchema.safeParse({ ...settings, whatsappE164: '0540185528' }).success).toBe(
      false,
    );
  });
});

describe('package rules', () => {
  const packages = JSON.parse(read('./packages.json')) as Array<{ id: string }>;

  it('the real packages file is valid', () => {
    for (const pkg of packages) {
      const result = packageSchema.safeParse(pkg);
      expect(result.error?.issues ?? [], pkg.id).toEqual([]);
    }
  });

  it('rejects a choose-N package with too few options', () => {
    const result = packageSchema.safeParse({
      kind: 'choose',
      name: 'Too Few',
      tagline: 'Not enough choices here.',
      priceGHS: 100,
      choose: {
        count: 2,
        from: [
          { service: 'a', label: 'A' },
          { service: 'b', label: 'B' },
        ],
      },
      order: 1,
    });
    expect(result.success).toBe(false);
  });

  it('every live package points only at live services that exist', () => {
    const serviceIds = readdirSync(new URL('./services/', import.meta.url))
      .filter((f) => f.endsWith('.md'))
      .map((f) => ({ id: f.replace(/\.md$/, ''), data: { status: 'live' as const } }));
    const parsed = packages.map((p) => ({ id: p.id, data: packageSchema.parse(p) }));
    expect(contentProblems(serviceIds, parsed)).toEqual([]);
  });
});

describe('contentProblems', () => {
  const pkg = {
    id: 'p',
    data: packageSchema.parse({
      kind: 'fixed',
      name: 'Test',
      tagline: 'Test package here.',
      priceGHS: 100,
      includes: [
        { service: 'facial', label: 'Facial' },
        { service: 'ghost', label: 'Ghost' },
      ],
      order: 1,
    }),
  };

  it('reports unknown and hidden services together', () => {
    const problems = contentProblems([{ id: 'facial', data: { status: 'hidden' } }], [pkg]);
    expect(problems).toEqual([
      'Package "p" includes service "facial" which is hidden',
      'Package "p" includes unknown service "ghost"',
    ]);
  });

  it('ignores packages that are not live', () => {
    const hiddenPkg = { ...pkg, data: { ...pkg.data, status: 'hidden' as const } };
    expect(contentProblems([], [hiddenPkg])).toEqual([]);
  });
});
