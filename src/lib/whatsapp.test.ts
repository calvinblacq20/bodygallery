import { describe, expect, it } from 'vitest';
import { MESSAGE_MAX_LENGTH, bookingMessage, whatsappUrl } from './whatsapp';

describe('bookingMessage', () => {
  it('tags every message so the owner can count website bookings', () => {
    expect(bookingMessage({ kind: 'general' })).toMatch(/^Hi Body Gallery \(from website\)/);
  });

  it('names the treatment, duration and price for spa services', () => {
    const message = bookingMessage({
      kind: 'service',
      name: 'Deep Tissue Massage',
      detail: '1 hr - GH₵250',
      consultation: false,
    });
    expect(message).toBe(
      "Hi Body Gallery (from website), I'd like to book:\nTreatment: Deep Tissue Massage - 1 hr - GH₵250",
    );
  });

  it('asks for a consultation for advanced treatments', () => {
    const message = bookingMessage({
      kind: 'service',
      name: 'Laser Tattoo Removal',
      consultation: true,
    });
    expect(message).toContain("I'd like to book a consultation for:");
    expect(message).toContain('Treatment: Laser Tattoo Removal');
  });

  it('lists package contents and notes', () => {
    const message = bookingMessage({
      kind: 'package',
      name: 'Sunday Special',
      price: 'GH₵350',
      items: ['Waxing', 'Facial', 'Pedicure', 'Massage'],
      notes: 'Sundays only, 12–6pm.',
    });
    expect(message).toContain(
      'Package: Sunday Special - GH₵350 (Waxing, Facial, Pedicure, Massage)',
    );
    expect(message.endsWith('Sundays only, 12–6pm.')).toBe(true);
  });

  it('refuses to build a message longer than WhatsApp handles comfortably', () => {
    expect(() =>
      bookingMessage({
        kind: 'service',
        name: 'x'.repeat(MESSAGE_MAX_LENGTH),
        consultation: false,
      }),
    ).toThrow(/limit/);
  });
});

describe('whatsappUrl', () => {
  it('URL-encodes the message, including newlines and the cedi sign', () => {
    const url = whatsappUrl('233540185528', 'Hi\nGH₵250 & more');
    expect(url).toBe('https://wa.me/233540185528?text=Hi%0AGH%E2%82%B5250%20%26%20more');
    expect(decodeURIComponent(new URL(url).searchParams.get('text') ?? '')).toBe(
      'Hi\nGH₵250 & more',
    );
  });

  it('rejects malformed numbers', () => {
    expect(() => whatsappUrl('+233540185528', 'Hi')).toThrow();
    expect(() => whatsappUrl('0540185528', 'Hi')).toThrow();
  });
});
