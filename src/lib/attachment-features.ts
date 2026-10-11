// Frontend bridge for the future authorized download operation. No route is guessed.
export interface AttachmentFeaturePort {
  download?: (attachmentId: string, conversationId: string, signal: AbortSignal) => Promise<{ blob: Blob; fileName: string }>;
}
export const pendingAttachmentPort: AttachmentFeaturePort = {};

export async function receiveAttachment(port: AttachmentFeaturePort, attachmentId: string, conversationId: string, signal: AbortSignal) {
  if (!port.download) throw new Error('Le téléchargement sécurisé des pièces jointes n’est pas encore disponible. Le fichier reste associé au message.');
  const file = await port.download(attachmentId, conversationId, signal);
  if (signal.aborted) throw new Error('Le téléchargement a été annulé.');
  if (!file || !(file.blob instanceof Blob) || !file.blob.size || !file.fileName?.trim()) throw new Error('Le fichier reçu est vide ou incomplet. Réessayez.');
  return file;
}
