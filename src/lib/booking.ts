import type { PackageData } from '../content/schemas';
import { formatDuration, formatGHS, priceText, type Priced } from './format';
import { bookingMessage, whatsappUrl } from './whatsapp';

export interface BookableService extends Priced {
  name: string;
  durationMin?: number | undefined;
}

export function generalBookingUrl(e164: string): string {
  return whatsappUrl(e164, bookingMessage({ kind: 'general' }));
}

export function serviceBookingUrl(e164: string, service: BookableService): string {
  const detail = [
    service.durationMin ? formatDuration(service.durationMin) : undefined,
    service.priceGHS !== undefined ? priceText(service) : undefined,
  ]
    .filter(Boolean)
    .join(' - ');
  return whatsappUrl(
    e164,
    bookingMessage({
      kind: 'service',
      name: service.name,
      consultation: service.consultationRequired,
      ...(detail ? { detail } : {}),
    }),
  );
}

export function packageBookingUrl(e164: string, pkg: PackageData): string {
  const items =
    pkg.kind === 'fixed'
      ? pkg.includes.map((i) => i.label)
      : [`choose any ${pkg.choose.count}: ${pkg.choose.from.map((i) => i.label).join(', ')}`];
  return whatsappUrl(
    e164,
    bookingMessage({
      kind: 'package',
      name: pkg.name,
      price: formatGHS(pkg.priceGHS),
      items,
      ...(pkg.notes ? { notes: pkg.notes } : {}),
    }),
  );
}
