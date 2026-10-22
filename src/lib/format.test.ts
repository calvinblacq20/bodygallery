import { describe, expect, it } from 'vitest';
import {
  formatDuration,
  formatGHS,
  formatLocalPhone,
  priceText,
  splitDisplayName,
  telHref,
} from './format';

describe('formatGHS', () => {
  it('formats whole cedis with the cedi sign', () => {
    expect(formatGHS(250)).toBe('GH₵250');
    expect(formatGHS(1200)).toBe('GH₵1,200');
  });

  it('rejects fractions, zero and negatives instead of printing a wrong price', () => {
    expect(() => formatGHS(99.5)).toThrow();
    expect(() => formatGHS(0)).toThrow();
    expect(() => formatGHS(-5)).toThrow();
  });
});

describe('priceText', () => {
  it('shows the price when known', () => {
    expect(priceText({ priceGHS: 250, priceFrom: false, consultationRequired: false })).toBe(
      'GH₵250',
    );
  });

  it('prefixes "From" for starting prices', () => {
    expect(priceText({ priceGHS: 800, priceFrom: true, consultationRequired: true })).toBe(
      'From GH₵800',
    );
  });

  it('never invents a price when none is confirmed', () => {
    expect(priceText({ priceFrom: false, consultationRequired: true })).toBe(
      'Price on consultation',
    );
    expect(priceText({ priceFrom: false, consultationRequired: false })).toBe('Price on request');
  });
});

describe('formatDuration', () => {
  it.each([
    [30, '30 min'],
    [60, '1 hr'],
    [90, '1 hr 30 min'],
    [120, '2 hr'],
  ])('%i minutes -> %s', (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected);
  });
});

describe('phone formatting', () => {
  it('shows Ghana numbers the local way and links the international way', () => {
    expect(formatLocalPhone('233540185528')).toBe('054 018 5528');
    expect(telHref('233540185528')).toBe('tel:+233540185528');
  });

  it('rejects numbers that are not Ghanaian mobiles', () => {
    expect(() => formatLocalPhone('0540185528')).toThrow();
    expect(() => formatLocalPhone('4479460000001')).toThrow();
  });
});

describe('splitDisplayName', () => {
  it('puts the last word in the italic accent', () => {
    expect(splitDisplayName('Swedish Full-Body Massage')).toEqual({
      lead: 'Swedish Full-Body',
      accent: 'Massage',
    });
  });

  it('handles single-word names', () => {
    expect(splitDisplayName('Waxing')).toEqual({ lead: '', accent: 'Waxing' });
  });
});
