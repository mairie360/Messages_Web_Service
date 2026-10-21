"use client";

/** Mobile only: toggles between the conversation list and the open thread. */
export function MobileConversationSwitch({
  showConversationList,
  onToggle,
}: {
  showConversationList: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="messages-pane-switch"
      aria-pressed={showConversationList}
      onClick={onToggle}
    >
      {showConversationList ? "Retour à la conversation" : "Voir les conversations"}
    </button>
  );
}
