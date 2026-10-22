import { describe, expect, it } from 'vitest';
import { formatTime, openStatus, zonedClock, type WeeklyHours } from './hours';

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

// Accra is UTC+0 all year, so these UTC instants are also Accra wall-clock times.
// 2026-10-21 is a Wednesday; 2026-10-25 is a Sunday.
const at = (iso: string) => new Date(iso);

describe('zonedClock', () => {
  it('reads the wall clock in Accra, not the device time zone', () => {
    expect(zonedClock(at('2026-10-21T08:30:00Z'), TZ)).toEqual({
      weekday: 'wed',
      isoDate: '2026-10-21',
      minutes: 8 * 60 + 30,
    });
  });

  it('gives the Accra day for a visitor whose clock is in another zone', () => {
    // 23:30 in Accra on Saturday is already Sunday in Tokyo.
    expect(zonedClock(at('2026-10-24T23:30:00Z'), TZ).weekday).toBe('sat');
  });
});

describe('openStatus', () => {
  it('is open during weekday hours', () => {
    expect(openStatus(HOURS, at('2026-10-21T10:00:00Z'), TZ)).toEqual({
      open: true,
      closesAt: '19:00',
    });
  });

  it('is closed at closing time exactly', () => {
    expect(openStatus(HOURS, at('2026-10-21T19:00:00Z'), TZ).open).toBe(false);
  });

  it('says it opens later today before opening', () => {
    expect(openStatus(HOURS, at('2026-10-21T07:15:00Z'), TZ)).toEqual({
      open: false,
      next: { day: 'wed', opensAt: '09:00', isToday: true },
    });
  });

  it('points to tomorrow after closing', () => {
    expect(openStatus(HOURS, at('2026-10-21T20:00:00Z'), TZ)).toEqual({
      open: false,
      next: { day: 'thu', opensAt: '09:00', isToday: false },
    });
  });

  it('uses the shorter Sunday hours', () => {
    expect(openStatus(HOURS, at('2026-10-25T11:00:00Z'), TZ)).toEqual({
      open: false,
      next: { day: 'sun', opensAt: '12:00', isToday: true },
    });
    expect(openStatus(HOURS, at('2026-10-25T17:59:00Z'), TZ).open).toBe(true);
    expect(openStatus(HOURS, at('2026-10-25T18:30:00Z'), TZ)).toEqual({
      open: false,
      next: { day: 'mon', opensAt: '09:00', isToday: false },
    });
  });

  it('respects a holiday closure and gives its reason', () => {
    const status = openStatus(HOURS, at('2026-12-25T10:00:00Z'), TZ, [
      { date: '2026-12-25', note: 'Closed for Christmas' },
    ]);
    expect(status).toEqual({
      open: false,
      reason: 'Closed for Christmas',
      next: { day: 'sat', opensAt: '09:00', isToday: false },
    });
  });

  it('skips days that are closed every week', () => {
    const noSunday: WeeklyHours = { ...HOURS, sun: null };
    expect(openStatus(noSunday, at('2026-10-24T20:00:00Z'), TZ)).toEqual({
      open: false,
      next: { day: 'mon', opensAt: '09:00', isToday: false },
    });
  });
});

describe('formatTime', () => {
  it.each([
    ['09:00', '9am'],
    ['12:00', '12pm'],
    ['18:00', '6pm'],
    ['19:30', '7:30pm'],
    ['00:00', '12am'],
  ])('%s -> %s', (input, expected) => {
    expect(formatTime(input)).toBe(expected);
  });
});
