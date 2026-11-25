import { useEffect, useState } from 'react';

/**
 * False during the server render and the hydration pass, true once React has hydrated the tree
 * (effects only run in the browser, after hydration).
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  return hydrated;
}
