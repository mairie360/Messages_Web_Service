export default function LoadingMessages() {
  return <section aria-busy="true" aria-label="Chargement de la messagerie" style={{ padding: '2rem' }}>
    <p role="status" aria-live="polite">Chargement de la messagerie…</p>
    <div aria-hidden="true" style={{ display: 'grid', gap: '1rem' }}>{[0, 1, 2].map(row => <div key={row} style={{ height: '6rem', borderRadius: '1rem', background: 'var(--mairie-surface-raised)' }} />)}</div>
  </section>;
}
