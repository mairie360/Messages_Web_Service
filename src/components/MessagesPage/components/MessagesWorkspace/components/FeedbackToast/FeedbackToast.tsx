'use client';

import { useEffect } from "react";
import { useToast } from "@mairie360/lib-components/primitives";

type FeedbackToastProps = {
  /** Confirmation of the last action (« Message direct créé. »…). */
  feedback: string | null;
  dismissFeedback: () => void;
};

/**
 * Hands each confirmation to the lib ToastProvider (MAIR-865): the toast floats bottom right above the
 * footer, without moving the module, for 5 s and without a title. Renders nothing itself.
 */
export function FeedbackToast({ feedback, dismissFeedback }: FeedbackToastProps) {
  const toast = useToast();
  useEffect(() => {
    if (!feedback) return;
    toast.success(feedback);
    dismissFeedback();
  }, [feedback, dismissFeedback, toast]);
  return null;
}
