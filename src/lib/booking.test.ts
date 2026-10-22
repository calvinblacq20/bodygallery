import { describe, expect, it } from 'vitest';
import { packageSchema } from '../content/schemas';
import { generalBookingUrl, packageBookingUrl, serviceBookingUrl } from './booking';

const NUMBER = '233540185528';
const text = (url: string) => new URL(url).searchParams.get('text');

describe('serviceBookingUrl', () => {
  it('includes duration and price for spa services', () => {
    const url = serviceBookingUrl(NUMBER, {
      name: 'Deep Tissue Massage',
      durationMin: 60,
      priceGHS: 250,
      priceFrom: false,
      consultationRequired: false,
    });
    expect(url.startsWith('https://wa.me/233540185528?text=')).toBe(true);
    expect(text(url)).toContain('Treatment: Deep Tissue Massage - 1 hr - GH₵250');
  });

  it('asks for a consultation and leaves out an unconfirmed price', () => {
    const url = serviceBookingUrl(NUMBER, {
      name: 'Laser Tattoo Removal',
      priceFrom: false,
      consultationRequired: true,
    });
    expect(text(url)).toBe(
      "Hi Body Gallery (from website), I'd like to book a consultation for:\nTreatment: Laser Tattoo Removal",
    );
  });
});

describe('packageBookingUrl', () => {
  it('lists fixed package contents', () => {
    const pkg = packageSchema.parse({
      kind: 'fixed',
      name: 'Package 1',
      tagline: 'Feet, body and face.',
      priceGHS: 350,
      includes: [
        { service: 'pedicure', label: 'Pedicure' },
        { service: 'swedish-massage', label: 'Massage' },
      ],
      order: 1,
    });
    expect(text(packageBookingUrl(NUMBER, pkg))).toContain(
      'Package: Package 1 - GH₵350 (Pedicure, Massage)',
    );
  });

  it('explains the choice and the day rule for choose-N packages', () => {
    const pkg = packageSchema.parse({
      kind: 'choose',
      name: 'Sunday Special',
      tagline: 'Pick any three treatments.',
      priceGHS: 350,
      choose: {
        count: 3,
        from: [
          { service: 'waxing', label: 'Waxing' },
          { service: 'facial', label: 'Facial' },
          { service: 'pedicure', label: 'Pedicure' },
          { service: 'swedish-massage', label: 'Massage' },
        ],
      },
      availableDays: ['sun'],
      notes: 'Sundays only, 12–6pm.',
      order: 3,
    });
    const message = text(packageBookingUrl(NUMBER, pkg));
    expect(message).toContain('(choose any 3: Waxing, Facial, Pedicure, Massage)');
    expect(message).toContain('Sundays only, 12–6pm.');
  });
});

describe('generalBookingUrl', () => {
  it('opens a general appointment request', () => {
    expect(text(generalBookingUrl(NUMBER))).toBe(
      "Hi Body Gallery (from website), I'd like to book an appointment.",
    );
  });
});
