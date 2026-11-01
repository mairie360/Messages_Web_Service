import { messageClient } from "@/clients/messageClient";
import type { UploadAttachmentResponse } from "@/clients/messageClient";

// Frontend bridge for the attachment operations. No route is guessed: a capability exists only once the
// published BFF_Message contract really serves it.
export interface AttachmentFeaturePort {
  /** Future authorized download operation. */
  download?: (attachmentId: string, conversationId: string, signal: AbortSignal) => Promise<{ blob: Blob; fileName: string }>;
  /**
   * Uploads the files of a draft before its message is sent. Absent while BFF_Message answers 503 to
   * `POST /attachments` and refuses any non-empty `attachmentIds` (MAIR-512).
   */
  upload?: (files: File[]) => Promise<UploadAttachmentResponse>;
}

/** Default port of the page: neither download nor upload is available yet. */
export const pendingAttachmentPort: AttachmentFeaturePort = {};

/**
 * Port to give `useMessagingController` once BFF_Message stores attachments: uploads through the published
 * operation (`messageClient.uploadAttachments`). Not used by the page while the BFF answers 503.
 */
export const messageAttachmentPort: AttachmentFeaturePort = {
  upload: (files) => messageClient.uploadAttachments(files),
};

export const ATTACHMENTS_UNAVAILABLE_MESSAGE =
  'Les pièces jointes ne sont pas encore disponibles. Retirez-les du brouillon pour envoyer votre message.';

/** Uploads the draft files through the port, or refuses before any network call when uploads are unavailable. */
export function uploadDraftAttachments(port: AttachmentFeaturePort, files: File[]) {
  if (!port.upload) throw new Error(ATTACHMENTS_UNAVAILABLE_MESSAGE);
  return port.upload(files);
}

export async function receiveAttachment(port: AttachmentFeaturePort, attachmentId: string, conversationId: string, signal: AbortSignal) {
  if (!port.download) throw new Error('Le téléchargement sécurisé des pièces jointes n’est pas encore disponible. Le fichier reste associé au message.');
  const file = await port.download(attachmentId, conversationId, signal);
  if (signal.aborted) throw new Error('Le téléchargement a été annulé.');
  if (!file || !(file.blob instanceof Blob) || !file.blob.size || !file.fileName?.trim()) throw new Error('Le fichier reçu est vide ou incomplet. Réessayez.');
  return file;
}
