import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { faqSchema, makeServiceSchema, packageSchema, settingsSchema } from './content/schemas';

const settings = defineCollection({
  loader: file('src/content/settings.json'),
  schema: settingsSchema,
});

const services = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/services' }),
  schema: ({ image }) => makeServiceSchema(image),
});

const packages = defineCollection({
  loader: file('src/content/packages.json'),
  schema: packageSchema,
});

const faqs = defineCollection({
  loader: file('src/content/faqs.json'),
  schema: faqSchema,
});

export const collections = { settings, services, packages, faqs };
