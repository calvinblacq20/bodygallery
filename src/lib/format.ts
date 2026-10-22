const ghsNumber = new Intl.NumberFormat('en-GH', { maximumFractionDigits: 0 });

/** 250 -> "GH₵250", 1200 -> "GH₵1,200". Prices are whole cedis. */
export function formatGHS(amount: number): string {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`Price must be a positive whole number of cedis, got ${amount}`);
  }
  return `GH₵${ghsNumber.format(amount)}`;
}

export interface Priced {
  priceGHS?: number | undefined;
  priceFrom: boolean;
  consultationRequired: boolean;
}

/** The only place price wording is decided, so a missing price can never read as a guess. */
export function priceText(item: Priced): string {
  if (item.priceGHS === undefined) {
    return item.consultationRequired ? 'Price on consultation' : 'Price on request';
  }
  const price = formatGHS(item.priceGHS);
  return item.priceFrom ? `From ${price}` : price;
}

/** 30 -> "30 min", 60 -> "1 hr", 90 -> "1 hr 30 min" */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

/** "233540185528" -> "054 018 5528" (how Ghanaians write mobile numbers) */
export function formatLocalPhone(e164: string): string {
  const match = /^233(\d{2})(\d{3})(\d{4})$/.exec(e164);
  if (!match) throw new Error(`Expected a Ghana number like 233XXXXXXXXX, got ${e164}`);
  const [, network, middle, last] = match;
  return `0${network} ${middle} ${last}`;
}

export function telHref(e164: string): string {
  return `tel:+${e164}`;
}

/** "Swedish Full-Body Massage" -> { lead: "Swedish Full-Body", accent: "Massage" } */
export function splitDisplayName(name: string): { lead: string; accent: string } {
  const at = name.lastIndexOf(' ');
  if (at === -1) return { lead: '', accent: name };
  return { lead: name.slice(0, at), accent: name.slice(at + 1) };
}
