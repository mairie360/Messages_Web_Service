"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ShellInfo } from "./shell-info";

const ShellInfoContext = createContext<ShellInfo>({});

/** Hands the instance details read by the root layout to the client frame. */
export function ShellInfoProvider({ info, children }: { info: ShellInfo; children: ReactNode }) {
  return <ShellInfoContext.Provider value={info}>{children}</ShellInfoContext.Provider>;
}

export function useShellInfo(): ShellInfo {
  return useContext(ShellInfoContext);
}
