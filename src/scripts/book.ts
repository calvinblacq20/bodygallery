import type { Closure, WeeklyHours } from '../lib/hours';
import { upcomingDays, type DayOption } from '../lib/schedule';
import type { Weekday } from '../lib/weekdays';
import { bookingMessage, whatsappUrl, type BookingIntent } from '../lib/whatsapp';

const form = document.querySelector<HTMLFormElement>('#booking');
if (form) initBookingForm(form);

function initBookingForm(form: HTMLFormElement) {
  const need = <T extends Element>(selector: string) => {
    const el = form.querySelector<T>(selector);
    if (!el) throw new Error(`Booking form is missing ${selector}`);
    return el;
  };
  const select = need<HTMLSelectElement>('#bk-treatment');
  const chooseSet = need<HTMLFieldSetElement>('#bk-choose');
  const chooseOptions = need<HTMLElement>('[data-choose-options]');
  const chooseCount = need<HTMLElement>('[data-choose-count]');
  const daysBox = need<HTMLElement>('#bk-days');
  const daysHint = need<HTMLElement>('[data-days-hint]');
  const timesBox = need<HTMLElement>('#bk-times');
  const nameInput = need<HTMLInputElement>('#bk-name');
  const noteInput = need<HTMLTextAreaElement>('#bk-note');
  const preview = need<HTMLElement>('[data-preview]');
  const copyButton = need<HTMLButtonElement>('[data-copy]');
  const copyStatus = need<HTMLElement>('[data-copy-status]');

  const { whatsapp = '', hours = '{}', closures = '[]', tz = 'Africa/Accra' } = form.dataset;
  const weekly = JSON.parse(hours) as WeeklyHours;
  const closed = JSON.parse(closures) as Closure[];
  let days: DayOption[] = [];

  const selectedOption = () => (select.value ? select.selectedOptions[0] : undefined);
  const checked = (name: string) =>
    [...form.querySelectorAll<HTMLInputElement>(`input[name="${name}"]:checked`)].map(
      (i) => i.value,
    );
  const chooseLimit = () => Number(selectedOption()?.dataset.choose || 0);

  const chip = (type: 'radio' | 'checkbox', name: string, value: string, label: string) => {
    const wrapper = document.createElement('label');
    wrapper.className = 'chip';
    const input = document.createElement('input');
    input.type = type;
    input.name = name;
    input.value = value;
    const text = document.createElement('span');
    text.textContent = label;
    wrapper.append(input, text);
    return wrapper;
  };
  const restore = (name: string, values: string[]) => {
    form.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`).forEach((input) => {
      input.checked = values.includes(input.value);
    });
  };

  // --- Errors, shown next to the field they belong to ---
  const fields = {
    treatment: { error: 'bk-treatment-error', control: () => select },
    choose: { error: 'bk-choose-error', control: () => chooseSet.querySelector('input') },
    day: { error: 'bk-day-error', control: () => daysBox.querySelector('input') },
    time: { error: 'bk-time-error', control: () => timesBox.querySelector('input') },
    name: { error: 'bk-name-error', control: () => nameInput },
  } as const;
  type Field = keyof typeof fields;

  const setError = (field: Field, message: string) => {
    const el = document.getElementById(fields[field].error);
    if (el) {
      el.textContent = message;
      el.hidden = !message;
    }
    const control = fields[field].control();
    if (control instanceof HTMLSelectElement || control instanceof HTMLInputElement) {
      if (message) control.setAttribute('aria-invalid', 'true');
      else control.removeAttribute('aria-invalid');
    }
  };

  const problems = (): Partial<Record<Field, string>> => {
    const found: Partial<Record<Field, string>> = {};
    if (!selectedOption()) found.treatment = 'Choose a treatment or package.';
    const limit = chooseLimit();
    if (limit && checked('choose').length !== limit) found.choose = `Pick ${limit} treatments.`;
    if (days.length > 0 && checked('day').length === 0) found.day = 'Pick a day.';
    if (checked('day').length > 0 && checked('time').length === 0) found.time = 'Pick a time.';
    if (!nameInput.value.trim()) found.name = 'Add your name so we know who to expect.';
    return found;
  };

  // --- Rendering ---
  const renderChoose = () => {
    const option = selectedOption();
    const limit = chooseLimit();
    setError('choose', '');
    if (!option || !limit) {
      chooseSet.hidden = true;
      chooseOptions.replaceChildren();
      return;
    }
    const items = JSON.parse(option.dataset.items || '[]') as string[];
    chooseCount.textContent = String(limit);
    chooseOptions.replaceChildren(
      ...items.map((label) => chip('checkbox', 'choose', label, label)),
    );
    chooseSet.hidden = false;
  };

  const renderTimes = () => {
    const day = days.find((d) => d.iso === checked('day')[0]);
    const previous = checked('time');
    if (!day) {
      const hint = document.createElement('p');
      hint.className = 'field-hint mt-0';
      hint.textContent = 'Pick a day first.';
      timesBox.replaceChildren(hint);
      return;
    }
    timesBox.replaceChildren(...day.windows.map((w) => chip('radio', 'time', w.id, w.label)));
    restore('time', previous);
  };

  const renderDays = () => {
    const option = selectedOption();
    const onlyDays = JSON.parse(option?.dataset.days || '[]') as Weekday[];
    const previous = checked('day');
    days = upcomingDays(weekly, new Date(), tz, closed, onlyDays.length ? { onlyDays } : {});
    daysBox.replaceChildren(...days.map((d) => chip('radio', 'day', d.iso, d.chip)));
    restore('day', previous);
    daysHint.textContent =
      days.length === 0
        ? 'No open days in the next two weeks. Message us on WhatsApp and we will find a time.'
        : (option?.dataset.notes ?? '');
    renderTimes();
  };

  // --- The message, built only from known option data plus what the visitor typed ---
  const intent = (): BookingIntent => {
    const option = selectedOption();
    if (!option) return { kind: 'general' };
    const d = option.dataset;
    if (d.kind === 'service') {
      return {
        kind: 'service',
        name: d.name ?? '',
        consultation: d.consultation === 'true',
        ...(d.detail ? { detail: d.detail } : {}),
      };
    }
    const picks = checked('choose');
    const items = chooseLimit() && picks.length ? picks : (JSON.parse(d.items || '[]') as string[]);
    return {
      kind: 'package',
      name: d.name ?? '',
      price: d.price ?? '',
      items,
      ...(d.notes ? { notes: d.notes } : {}),
    };
  };

  const message = () => {
    const day = days.find((d) => d.iso === checked('day')[0]);
    const window = day?.windows.find((w) => w.id === checked('time')[0]);
    return bookingMessage(intent(), {
      day: day?.date,
      time: window?.label,
      name: nameInput.value,
      note: noteInput.value,
    });
  };
  const updatePreview = () => {
    preview.textContent = message();
  };

  // --- Wiring ---
  select.addEventListener('change', () => {
    setError('treatment', '');
    renderChoose();
    renderDays();
    updatePreview();
  });
  select.addEventListener('blur', () => {
    if (!selectedOption()) setError('treatment', 'Choose a treatment or package.');
  });

  chooseOptions.addEventListener('change', (event) => {
    const input = event.target as HTMLInputElement;
    const limit = chooseLimit();
    if (input.checked && checked('choose').length > limit) {
      input.checked = false;
      setError('choose', `You can pick ${limit}. Untick one to swap it.`);
    } else {
      setError('choose', '');
    }
    updatePreview();
  });

  daysBox.addEventListener('change', () => {
    setError('day', '');
    renderTimes();
    updatePreview();
  });
  timesBox.addEventListener('change', () => {
    setError('time', '');
    updatePreview();
  });

  nameInput.addEventListener('input', () => {
    if (nameInput.value.trim()) setError('name', '');
    updatePreview();
  });
  nameInput.addEventListener('blur', () => {
    if (!nameInput.value.trim()) setError('name', 'Add your name so we know who to expect.');
  });
  noteInput.addEventListener('input', updatePreview);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const found = problems();
    (Object.keys(fields) as Field[]).forEach((field) => setError(field, found[field] ?? ''));
    const first = (Object.keys(fields) as Field[]).find((field) => found[field]);
    if (first) {
      const control = fields[first].control();
      if (control instanceof HTMLElement) control.focus();
      return;
    }
    window.location.href = whatsappUrl(whatsapp, message());
  });

  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(message());
      copyStatus.textContent = 'Copied. Paste it into WhatsApp or a text message.';
    } catch {
      copyStatus.textContent =
        'Copying is blocked here. Press and hold the message above to copy it.';
    }
  });

  // Pre-select from ?service= or ?package=, but only if it names a real option.
  const params = new URLSearchParams(window.location.search);
  const wanted = params.get('service')
    ? `service:${params.get('service')}`
    : params.get('package')
      ? `package:${params.get('package')}`
      : '';
  if (wanted && [...select.options].some((o) => o.value === wanted)) select.value = wanted;

  form.hidden = false;
  renderChoose();
  renderDays();
  updatePreview();
}
