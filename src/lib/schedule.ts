import { formatTime, zonedClock, type Closure, type WeeklyHours } from './hours';
import type { Weekday } from './weekdays';

export interface TimeWindow {
  id: 'morning' | 'afternoon' | 'evening';
  /** e.g. "Afternoon (12–4pm)" */
  label: string;
  from: string;
  to: string;
}

export interface DayOption {
  iso: string;
  weekday: Weekday;
  /** Short chip text: "Today", "Tomorrow" or "Sat 25 Oct" */
  chip: string;
  /** Always the real date, for the message: "Sat 25 Oct" */
  date: string;
  windows: TimeWindow[];
}

const toMinutes = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const toHHMM = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** "09:00"–"12:00" -> "9am–12pm"; "12:00"–"16:00" -> "12–4pm" */
function formatRange(from: string, to: string): string {
  const a = formatTime(from);
  const b = formatTime(to);
  const suffix = (t: string) => t.slice(-2);
  return suffix(a) === suffix(b) ? `${a.slice(0, -2)}–${b}` : `${a}–${b}`;
}

const NOON = 12 * 60;
const FOUR_PM = 16 * 60;

/**
 * Splits a day's opening hours into Morning (until 12pm), Afternoon (12–4pm) and Evening
 * (from 4pm), dropping any part shorter than an hour. Derived from the hours, so the two
 * can never disagree.
 */
export function windowsForHours(slot: { open: string; close: string }): TimeWindow[] {
  const open = toMinutes(slot.open);
  const close = toMinutes(slot.close);
  const parts = [
    { id: 'morning', name: 'Morning', from: open, to: Math.min(close, NOON) },
    {
      id: 'afternoon',
      name: 'Afternoon',
      from: Math.max(open, NOON),
      to: Math.min(close, FOUR_PM),
    },
    { id: 'evening', name: 'Evening', from: Math.max(open, FOUR_PM), to: close },
  ] as const;
  return parts
    .filter((p) => p.to - p.from >= 60)
    .map((p) => {
      const from = toHHMM(p.from);
      const to = toHHMM(p.to);
      return { id: p.id, label: `${p.name} (${formatRange(from, to)})`, from, to };
    });
}

const WEEKDAY_BY_UTC_DAY: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const dateLabel = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

export interface UpcomingDaysOptions {
  /** Calendar days to look ahead, including today. */
  span?: number;
  /** Restrict to these weekdays (e.g. the Sunday Special). */
  onlyDays?: Weekday[];
  /** A window is offered today only if it ends at least this many minutes from now. */
  leadMinutes?: number;
}

/** Bookable days from today, in the business's time zone, each with its open windows. */
export function upcomingDays(
  hours: WeeklyHours,
  now: Date,
  timeZone: string,
  closures: Closure[] = [],
  { span = 14, onlyDays, leadMinutes = 60 }: UpcomingDaysOptions = {},
): DayOption[] {
  const today = zonedClock(now, timeZone);
  const [y = 0, m = 1, d = 1] = today.isoDate.split('-').map(Number);
  const closed = new Set(closures.map((c) => c.date));
  const days: DayOption[] = [];

  for (let offset = 0; offset < span; offset++) {
    // Date-only arithmetic in UTC: the calendar day is what matters, not the instant.
    const date = new Date(Date.UTC(y, m - 1, d + offset));
    const iso = date.toISOString().slice(0, 10);
    const weekday = WEEKDAY_BY_UTC_DAY[date.getUTCDay()] as Weekday;
    const slot = hours[weekday];
    if (!slot || closed.has(iso)) continue;
    if (onlyDays && !onlyDays.includes(weekday)) continue;

    let windows = windowsForHours(slot);
    if (offset === 0) {
      windows = windows.filter((w) => toMinutes(w.to) - today.minutes >= leadMinutes);
    }
    if (windows.length === 0) continue;

    const label = dateLabel.format(date).replace(',', '');
    days.push({
      iso,
      weekday,
      chip: offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : label,
      date: label,
      windows,
    });
  }
  return days;
}
