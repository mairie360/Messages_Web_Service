import type { Tone } from "@mairie360/lib-components/theme";
import type { MessageStreamState } from "@/lib/message-stream";

/** Label and tone of each reception state (MAIR-860, Figma F2 · Réception automatique). */
export const RECEPTION_STATES: Record<MessageStreamState, { label: string; tone: Tone }> = {
  connected: { label: "Réception automatique active.", tone: "success" },
  polling: { label: "Actualisation automatique active.", tone: "info" },
  connecting: { label: "Connexion à la réception automatique…", tone: "neutral" },
  offline: { label: "Réception automatique retardée.", tone: "warning" },
};
