import type { MessagingConversation, MessagingMessage } from "./messaging-state";

const frenchTimestamp = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const isoTimestamp = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/;
const legacyTime = /^([01]?\d|2[0-3])\s*h\s*([0-5]\d)$/;

/** Display-only conversion: never infer a date from an absent or unknown label. */
export function formatMessageTimestamp(value: string | undefined): string | undefined {
  if (!value) return value;

  const time = legacyTime.exec(value);
  if (time) return `${time[1]}:${time[2]}`;

  const iso = isoTimestamp.exec(value);
  if (!iso) return value;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = iso;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  // Date.parse normalizes dates such as February 30; keep invalid input unchanged.
  if (!daysInMonth || day < 1 || day > daysInMonth || Number(hourText) > 23 ||
      Number(minuteText) > 59 || Number(secondText ?? 0) > 59) return value;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : frenchTimestamp.format(date);
}

export function presentConversationTimestamps(conversations: MessagingConversation[]) {
  return conversations.map((conversation) => ({
    ...conversation,
    lastMessageAt: formatMessageTimestamp(conversation.lastMessageAt),
  }));
}

export function presentMessageTimestamps(messages: MessagingMessage[]) {
  return messages.map((message) => ({
    ...message,
    sentAt: formatMessageTimestamp(message.sentAt),
  }));
}
