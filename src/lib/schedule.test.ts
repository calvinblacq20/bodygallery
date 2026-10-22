import { describe, expect, it } from 'vitest';
import type { WeeklyHours } from './hours';
import { upcomingDays, windowsForHours } from './schedule';

const HOURS: WeeklyHours = {
  mon: { open: '09:00', close: '19:00' },
  tue: { open: '09:00', close: '19:00' },
  wed: { open: '09:00', close: '19:00' },
  thu: { open: '09:00', close: '19:00' },
  fri: { open: '09:00', close: '19:00' },
  sat: { open: '09:00', close: '19:00' },
  sun: { open: '12:00', close: '18:00' },
};
const TZ = 'Africa/Accra';
// 2026-10-21 is a Wednesday. Accra is UTC+0, so UTC instants read as Accra wall-clock time.
const at = (iso: string) => new Date(iso);

describe('windowsForHours', () => {
  it('splits a full weekday into morning, afternoon and evening', () => {
    expect(windowsForHours({ open: '09:00', close: '19:00' }).map((w) => w.label)).toEqual([
      'Morning (9am–12pm)',
      'Afternoon (12–4pm)',
      'Evening (4–7pm)',
    ]);
  });

  it('gives Sunday an afternoon and an evening', () => {
    expect(windowsForHours({ open: '12:00', close: '18:00' }).map((w) => w.label)).toEqual([
      'Afternoon (12–4pm)',
      'Evening (4–6pm)',
    ]);
  });

  it('drops slivers shorter than an hour', () => {
    expect(windowsForHours({ open: '11:30', close: '16:30' }).map((w) => w.id)).toEqual([
      'afternoon',
    ]);
  });
});

describe('upcomingDays', () => {
  it('starts today with only the windows that are still bookable', () => {
    const [today] = upcomingDays(HOURS, at('2026-10-21T13:30:00Z'), TZ);
    expect(today?.chip).toBe('Today');
    expect(today?.date).toBe('Wed 21 Oct');
    // Afternoon ends at 4pm, more than an hour away; morning is gone.
    expect(today?.windows.map((w) => w.id)).toEqual(['afternoon', 'evening']);
  });

  it('drops a window that ends within the next hour', () => {
    const [today] = upcomingDays(HOURS, at('2026-10-21T15:15:00Z'), TZ);
    expect(today?.windows.map((w) => w.id)).toEqual(['evening']);
  });

  it('skips today entirely once nothing is left', () => {
    const days = upcomingDays(HOURS, at('2026-10-21T18:30:00Z'), TZ);
    expect(days[0]?.chip).toBe('Tomorrow');
    expect(days[0]?.date).toBe('Thu 22 Oct');
  });

  it('labels later days with their date and spans two weeks', () => {
    const days = upcomingDays(HOURS, at('2026-10-21T08:00:00Z'), TZ);
    expect(days).toHaveLength(14);
    expect(days[2]?.chip).toBe('Fri 23 Oct');
    expect(days.at(-1)?.iso).toBe('2026-11-03');
  });

  it('skips closed weekdays and holiday closures', () => {
    const noSunday: WeeklyHours = { ...HOURS, sun: null };
    const days = upcomingDays(noSunday, at('2026-10-21T08:00:00Z'), TZ, [
      { date: '2026-10-23', note: 'Closed for a training day' },
    ]);
    const isos = days.map((d) => d.iso);
    expect(isos).not.toContain('2026-10-23');
    expect(isos).not.toContain('2026-10-25');
  });

  it('offers only Sundays for the Sunday Special', () => {
    const days = upcomingDays(HOURS, at('2026-10-21T08:00:00Z'), TZ, [], { onlyDays: ['sun'] });
    expect(days.map((d) => d.iso)).toEqual(['2026-10-25', '2026-11-01']);
    expect(days.every((d) => d.windows[0]?.label === 'Afternoon (12–4pm)')).toBe(true);
  });

  it('crosses month and year ends cleanly', () => {
    const days = upcomingDays(HOURS, at('2026-12-30T08:00:00Z'), TZ, [], { span: 4 });
    expect(days.map((d) => d.iso)).toEqual([
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
    ]);
  });
});
