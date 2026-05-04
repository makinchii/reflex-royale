"use client";

import * as React from "react";

export type Theme = "tron" | "ares" | "clu" | "athena" | "aphrodite" | "poseidon" | "custom";

const ThemeContext = React.createContext<{ theme: Theme }>({ theme: "tron" });

export function ThemeProvider({ theme, children }: { theme: Theme; children: React.ReactNode }) {
  const value = React.useMemo(() => ({ theme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return React.useContext(ThemeContext);
}
