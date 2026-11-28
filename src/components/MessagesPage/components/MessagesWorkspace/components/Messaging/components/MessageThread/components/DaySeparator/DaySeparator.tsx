import { Text } from '@mairie360/lib-components/primitives';

/** Day the following messages were written (« Aujourd’hui », « Hier », « 28 oct. »), centred in the thread. */
export const DaySeparator = ({ label }: { label: string }) => (
  <div className="flex justify-center" data-day-separator="">
    <Text
      as="span"
      size="xs"
      weight="semibold"
      tone="muted"
      className="rounded-full border border-[var(--mairie-border)] bg-[var(--mairie-surface)] px-2.5 py-0.5"
    >
      {label}
    </Text>
  </div>
);
