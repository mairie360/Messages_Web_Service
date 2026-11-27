import { getInstanceTimeZone } from '@mairie360/lib-components/shared';
import type { MessagingConversation, MessagingMessage } from "./messaging-state";

const frenchTimestamp = () => new Intl.DateTimeFormat("fr-FR", {
  timeZone: getInstanceTimeZone(),
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const isoTimestamp = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/;
const legacyTime = /^([01]?\d|2[0-3])\s*h\s*([0-5]\d)$/;

/** The instant of a valid ISO timestamp, or `null` for an absent, unknown or impossible one. */
export function parseMessageInstant(value: string | undefined): Date | null {
  const iso = value ? isoTimestamp.exec(value) : null;
  if (!iso) return null;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = iso;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  // Date.parse normalizes dates such as February 30; keep invalid input unchanged.
  if (!daysInMonth || day < 1 || day > daysInMonth || Number(hourText) > 23 ||
      Number(minuteText) > 59 || Number(secondText ?? 0) > 59) return null;

  const date = new Date(value!);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Display-only conversion: never infer a date from an absent or unknown label. */
export function formatMessageTimestamp(value: string | undefined): string | undefined {
  if (!value) return value;

  const time = legacyTime.exec(value);
  if (time) return `${time[1]}:${time[2]}`;

  const date = parseMessageInstant(value);
  return date ? frenchTimestamp().format(date) : value;
}

const zoned = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: getInstanceTimeZone(), ...options });

/** Calendar day of an instant in the instance time zone (`2026-11-27`), to compare days. */
const dayKey = (date: Date) => zoned({ year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

/** Time of a message (`14:05`) in the instance time zone; an unknown label goes through `formatMessageTimestamp`. */
export function formatMessageTime(value: string | undefined): string | undefined {
  const date = parseMessageInstant(value);
  return date ? zoned({ hour: "2-digit", minute: "2-digit" }).format(date) : formatMessageTimestamp(value);
}

/**
 * Day of a message as the thread separators and the conversation list name it: « Aujourd’hui », « Hier », then
 * « 28 oct. » (with the year when it is not the current one). `undefined` for an unknown timestamp.
 */
export function formatMessageDay(value: string | undefined, now: Date = new Date()): string | undefined {
  const date = parseMessageInstant(value);
  if (!date) return undefined;
  const day = dayKey(date);
  if (day === dayKey(now)) return "Aujourd’hui";
  if (day === dayKey(new Date(now.getTime() - 86_400_000))) return "Hier";
  const sameYear = zoned({ year: "numeric" }).format(date) === zoned({ year: "numeric" }).format(now);
  return zoned({ day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) }).format(date);
}

/** Time of the last message in the list: the hour today, the day otherwise (« Hier », « 28 oct. »). */
export function formatConversationTimestamp(value: string | undefined, now: Date = new Date()): string | undefined {
  const day = formatMessageDay(value, now);
  if (!day) return formatMessageTimestamp(value);
  return day === "Aujourd’hui" ? formatMessageTime(value) : day;
}

export function presentConversationTimestamps(conversations: MessagingConversation[], now: Date = new Date()) {
  return conversations.map((conversation) => ({
    ...conversation,
    lastMessageAt: formatConversationTimestamp(conversation.lastMessageAt, now),
  }));
}

/** The time next to the author, and the day the thread separators group the messages by. */
export function presentMessageTimestamps(messages: MessagingMessage[], now: Date = new Date()) {
  return messages.map((message) => {
    const dayLabel = formatMessageDay(message.sentAt, now);
    return {
      ...message,
      sentAt: formatMessageTime(message.sentAt),
      ...(dayLabel ? { dayLabel } : {}),
    };
  });
}
