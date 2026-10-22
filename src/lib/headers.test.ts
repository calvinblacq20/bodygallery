import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { JS_FLAG_SCRIPT } from './inline-scripts';

interface VercelConfig {
  trailingSlash?: boolean;
  headers: { source: string; headers: { key: string; value: string }[] }[];
}
const config = JSON.parse(
  readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'),
) as VercelConfig;
const sitewide = config.headers.find((h) => h.source === '/(.*)')?.headers ?? [];
const header = (name: string) => sitewide.find((h) => h.key === name)?.value;

describe('security headers', () => {
  it('allow-lists the exact inline script by hash', () => {
    const hash = createHash('sha256').update(JS_FLAG_SCRIPT).digest('base64');
    expect(header('Content-Security-Policy-Report-Only')).toContain(`'sha256-${hash}'`);
  });

  it('never allows inline or eval scripts wholesale', () => {
    const csp = header('Content-Security-Policy-Report-Only') ?? '';
    const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src')) ?? '';
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it('allows frames only from Google Maps (the tap-to-load map on /visit)', () => {
    const csp = header('Content-Security-Policy-Report-Only') ?? '';
    const frameSrc = csp.split(';').find((d) => d.trim().startsWith('frame-src')) ?? '';
    expect(frameSrc.trim().split(/\s+/).slice(1).sort()).toEqual([
      'https://maps.google.com',
      'https://www.google.com',
    ]);
  });

  it.each([
    ['X-Content-Type-Options', 'nosniff'],
    ['X-Frame-Options', 'DENY'],
    ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ])('sends %s', (name, value) => {
    expect(header(name)).toBe(value);
  });

  it('sends HSTS for at least a year', () => {
    const maxAge = Number(/max-age=(\d+)/.exec(header('Strict-Transport-Security') ?? '')?.[1]);
    expect(maxAge).toBeGreaterThanOrEqual(31536000);
  });

  it('keeps the pre-launch site out of search engines', () => {
    expect(header('X-Robots-Tag')).toBe('noindex, nofollow');
  });

  it('serves pages without a trailing slash, matching canonical URLs', () => {
    expect(config.trailingSlash).toBe(false);
  });
});
