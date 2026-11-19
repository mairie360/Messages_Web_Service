'use client';

import { Card, ErrorAlert, PageTitle, RetryButton, Skeleton, Text } from "@mairie360/lib-components/primitives";

type MessagesBootstrapStateProps = {
  loading: boolean;
  /** Message of the refused first read; only shown once loading is over. */
  error?: string | null;
  onRetry: () => void;
};

/** Loading / unavailable state of the messaging start (MAIR-847, Figma brick MessagesBootstrapState). */
export function MessagesBootstrapState({ loading, error, onRetry }: MessagesBootstrapStateProps) {
  return (
    <Card
      aria-labelledby="messages-bootstrap-title"
      aria-busy={loading}
      className="messages-bootstrap-state flex min-h-0 flex-col gap-4 overflow-y-auto p-6"
    >
      <PageTitle id="messages-bootstrap-title">
        {loading ? "Chargement de la messagerie" : "Messagerie indisponible"}
      </PageTitle>
      {error ? <ErrorAlert title={error} /> : null}
      <Text as="p" tone="muted" role="status">
        {loading
          ? "Les conversations sont en cours de chargement."
          : "Les conversations n’ont pas pu être chargées. Vous pouvez réessayer."}
      </Text>
      {loading && <Skeleton className="h-64" />}
      <div>
        <RetryButton
          loading={loading}
          label={loading ? "Chargement en cours…" : undefined}
          onClick={onRetry}
        />
      </div>
    </Card>
  );
}
