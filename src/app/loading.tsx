import { Skeleton } from "@mairie360/lib-components/primitives";

export default function LoadingMessages() {
  return <section aria-busy="true" aria-label="Chargement de la messagerie" style={{ padding: '2rem' }}>
    <p role="status" aria-live="polite">Chargement de la messagerie…</p>
    <div className="grid gap-4">{[0, 1, 2].map(row => <Skeleton key={row} className="h-24" />)}</div>
  </section>;
}
