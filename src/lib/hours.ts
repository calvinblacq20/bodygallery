import { WEEKDAYS, type Weekday } from './weekdays';

export type WeeklyHours = Record<Weekday, { open: string; close: string } | null>;
export interface Closure {
  date: string;
  note: string;
}

export type OpenStatus =
  | { open: true; closesAt: string }
  | { open: false; reason?: string; next?: { day: Weekday; opensAt: string; isToday: boolean } };

const WEEKDAY_BY_SHORT: Record<string, Weekday> = {
  Mon: 'mon',
  Tue: 'tue',
  Wed: 'wed',
  Thu: 'thu',
  Fri: 'fri',
  Sat: 'sat',
  Sun: 'sun',
};

/** Wall-clock day, ISO date and minutes past midnight in the business's time zone. */
export function zonedClock(at: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  const weekday = WEEKDAY_BY_SHORT[get('weekday')];
  if (!weekday) throw new Error(`Unrecognised weekday from Intl: ${get('weekday')}`);
  return {
    weekday,
    isoDate: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

const toMinutes = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export function openStatus(
  hours: WeeklyHours,
  at: Date,
  timeZone: string,
  closures: Closure[] = [],
): OpenStatus {
  const now = zonedClock(at, timeZone);
  const closure = closures.find((c) => c.date === now.isoDate);
  const today = closure ? null : hours[now.weekday];

  if (today && now.minutes >= toMinutes(today.open) && now.minutes < toMinutes(today.close)) {
    return { open: true, closesAt: today.close };
  }

  const reason = closure?.note;
  if (today && now.minutes < toMinutes(today.open)) {
    return {
      open: false,
      ...(reason ? { reason } : {}),
      next: { day: now.weekday, opensAt: today.open, isToday: true },
    };
  }

  // Look ahead up to a week. Closures are only known for exact dates, so later days use weekly hours.
  const start = WEEKDAYS.indexOf(now.weekday);
  for (let offset = 1; offset <= 7; offset++) {
    const day = WEEKDAYS[(start + offset) % 7] as Weekday;
    const slot = hours[day];
    if (slot)
      return {
        open: false,
        ...(reason ? { reason } : {}),
        next: { day, opensAt: slot.open, isToday: false },
      };
  }
  return { open: false, ...(reason ? { reason } : {}) };
}

/** "19:00" -> "7pm", "12:30" -> "12:30pm" */
export function formatTime(hhmm: string): string {
  const total = toMinutes(hhmm);
  const h = Math.floor(total / 60);
  const m = total % 60;
  const suffix = h < 12 ? 'am' : 'pm';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12}${suffix}` : `${hour12}:${String(m).padStart(2, '0')}${suffix}`;
}
