import { z } from 'astro/zod';
import { WEEKDAYS } from '../lib/weekdays';

export const SERVICE_CATEGORIES = ['spa', 'body-skin', 'brows-lips', 'smile'] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

const e164 = z.string().regex(/^\d{11,15}$/, 'Digits only with country code, e.g. 233540185528');
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:MM');
const status = z.enum(['live', 'hidden', 'coming-soon']).default('live');

const openingHours = z
  .object({ open: hhmm, close: hhmm })
  .refine((h) => h.open < h.close, 'Opening time must be before closing time');

export const settingsSchema = z.object({
  businessName: z.string().min(1),
  tagline: z.string().min(1),
  whatsappE164: e164,
  phones: z.array(z.object({ e164, label: z.string().min(1) })).min(1),
  address: z.object({
    street: z.string().min(1),
    locality: z.string().min(1),
    region: z.string().min(1),
    country: z.literal('GH'),
  }),
  plusCode: z.string().min(1),
  geo: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }),
  directions: z.array(z.string().min(1)).min(1),
  // Every weekday must be listed: an object of hours, or null when closed.
  hours: z.record(z.enum(WEEKDAYS), openingHours.nullable()),
  timezone: z.literal('Africa/Accra'),
  closures: z.array(z.object({ date: z.iso.date(), note: z.string().min(1) })).default([]),
  socials: z.object({
    tiktok: z.url(),
    instagram: z.url(),
    googleMaps: z.url(),
  }),
  bookingPolicy: z.string().min(1),
  pricesUpdatedAt: z.iso.date(),
});
export type Settings = z.infer<typeof settingsSchema>;

/** `image` is Astro's image() helper in the content config, and a stub in tests. */
export const makeServiceSchema = <TImage extends z.ZodType>(image: () => TImage) =>
  z.object({
    name: z.string().min(2).max(60),
    category: z.enum(SERVICE_CATEGORIES),
    summary: z.string().min(10).max(160),
    durationMin: z.number().int().positive().optional(),
    // Whole cedis only. Leave it out when the owner hasn't confirmed a price: never guess.
    priceGHS: z.number().int().positive().optional(),
    priceFrom: z.boolean().default(false),
    consultationRequired: z.boolean().default(false),
    photo: z.object({ src: image(), alt: z.string().min(5) }).optional(),
    featured: z.boolean().default(false),
    order: z.number().int(),
    status,
  });
export type ServiceData = z.infer<ReturnType<typeof makeServiceSchema>>;

const packageItem = z.object({ service: z.string().min(1), label: z.string().min(1) });

const packageBase = {
  name: z.string().min(2).max(40),
  tagline: z.string().min(5).max(80),
  priceGHS: z.number().int().positive(),
  availableDays: z.array(z.enum(WEEKDAYS)).optional(),
  notes: z.string().optional(),
  order: z.number().int(),
  status,
};

export const packageSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('fixed'), includes: z.array(packageItem).min(2), ...packageBase }),
  z.object({
    kind: z.literal('choose'),
    choose: z
      .object({ count: z.number().int().min(1), from: z.array(packageItem).min(2) })
      .refine((c) => c.from.length > c.count, 'A choose-N package needs more options than N'),
    ...packageBase,
  }),
]);
export type PackageData = z.infer<typeof packageSchema>;
