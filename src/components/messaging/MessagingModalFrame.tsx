import React from 'react';
import { Modal } from '@mairie360/lib-components/primitives';

export interface MessagingModalFrameProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  /** Actions row; the submit button targets the form through `form={formId}`. */
  footer: React.ReactNode;
  formId: string;
  className?: string;
  /** While a request is pending, the close button, Escape and the backdrop do nothing. */
  closeDisabled?: boolean;
  onClose: () => void;
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
}

/** The lib Modal around a messaging form (MAIR-608); like the lib ConfirmModal, a busy dialog ignores close requests. */
export const MessagingModalFrame = ({
  title,
  subtitle,
  children,
  footer,
  formId,
  className,
  closeDisabled = false,
  onClose,
  onSubmit,
}: MessagingModalFrameProps) => (
  <Modal
    open
    title={title}
    description={subtitle}
    size="m"
    closeLabel="Fermer"
    className={className}
    onClose={closeDisabled ? () => undefined : onClose}
    closeOnBackdrop={!closeDisabled}
    footer={footer}
  >
    <form id={formId} className="space-y-3" onSubmit={onSubmit}>
      {children}
    </form>
  </Modal>
);
