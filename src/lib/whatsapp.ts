export const MESSAGE_MAX_LENGTH = 1000;

const GREETING = 'Hi Body Gallery (from website)';

export type BookingIntent =
  | { kind: 'general' }
  | { kind: 'service'; name: string; detail?: string; consultation: boolean }
  | { kind: 'package'; name: string; price: string; items: string[]; notes?: string };

/**
 * Builds the pre-filled WhatsApp text. It only ever uses content values, never query
 * strings, so a crafted link can't put words in a visitor's mouth.
 */
export function bookingMessage(intent: BookingIntent): string {
  let message: string;
  switch (intent.kind) {
    case 'general':
      message = `${GREETING}, I'd like to book an appointment.`;
      break;
    case 'service': {
      const opener = intent.consultation
        ? "I'd like to book a consultation for:"
        : "I'd like to book:";
      const detail = intent.detail ? ` - ${intent.detail}` : '';
      message = `${GREETING}, ${opener}\nTreatment: ${intent.name}${detail}`;
      break;
    }
    case 'package': {
      const notes = intent.notes ? `\n${intent.notes}` : '';
      message = `${GREETING}, I'd like to book:\nPackage: ${intent.name} - ${intent.price} (${intent.items.join(', ')})${notes}`;
      break;
    }
  }
  if (message.length > MESSAGE_MAX_LENGTH) {
    throw new Error(
      `WhatsApp message is ${message.length} characters; the limit is ${MESSAGE_MAX_LENGTH}`,
    );
  }
  return message;
}

export function whatsappUrl(e164: string, message: string): string {
  if (!/^\d{11,15}$/.test(e164)) throw new Error(`Invalid WhatsApp number: ${e164}`);
  return `https://wa.me/${e164}?text=${encodeURIComponent(message)}`;
}
