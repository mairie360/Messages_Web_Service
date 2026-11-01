import { BffRequestError } from "@/clients/messageClient";
import { ATTACHMENTS_UNAVAILABLE_MESSAGE } from "./attachment-features";

// French wording of the 400 refusals of BFF_Message (zod validation of SendMessageBody, PostDirectMessagesBody and
// PostGroupsBody), keyed by the refused field of `error.details[].path` (`body.content`, `body.memberIds.1`…).
// Any other refusal keeps the BFF message (MAIR-512).

type Translation = (message: string) => string;

const formatCount = (value: string) => value.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

const writingRules = (subject: string): Translation => (message) => {
  if (/Must not contain < or >/.test(message)) return `${subject} ne doit pas contenir les caractères < ou >.`;
  const max = message.match(/at most (\d+) character|<=(\d+) characters/);
  if (max) return `${subject} dépasse ${formatCount(max[1] ?? max[2])} caractères.`;
  if (/at least 1 character|^Required$|control character|blank/i.test(message)) {
    return `${subject} est vide ou contient des caractères non autorisés.`;
  }
  return `${subject} : ${message}`;
};

const FIELD_TRANSLATIONS: Readonly<Record<string, Translation>> = {
  content: writingRules("Le message"),
  message: writingRules("Le message"),
  name: writingRules("Le nom du groupe"),
  description: writingRules("La description du groupe"),
  attachmentIds: () => ATTACHMENTS_UNAVAILABLE_MESSAGE,
  mentionIds: () => "Une mention ne correspond à aucun utilisateur connu. Retirez-la avant d’envoyer.",
  memberIds: () => "Un membre sélectionné ne correspond à aucun utilisateur connu.",
  recipientId: () => "Le destinataire ne correspond à aucun utilisateur connu.",
};

/** `body.memberIds.1` → `memberIds`; `body` → undefined. */
function refusedField(path?: string) {
  return path?.split(".").find((part) => part && part !== "body" && !/^\d+$/.test(part));
}

/**
 * Message shown for a failed write: the translated validation details of a BFF 400, otherwise the error's own
 * message (BFF message or local wording), otherwise `fallback`.
 */
export function describeBffError(error: unknown, fallback: string): string {
  if (error instanceof BffRequestError && error.status === 400 && error.details.length > 0) {
    const lines = error.details.map(({ path, message }) => {
      const field = refusedField(path);
      const translate = field ? FIELD_TRANSLATIONS[field] : undefined;
      if (translate) return translate(message);
      return field ? `${field} : ${message}` : message;
    });
    return [...new Set(lines)].join(" ");
  }
  return error instanceof Error ? error.message : fallback;
}
