import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { darkPalette, themes, type Palette, type ThemeMode } from '@/constants';

/** What the user picked: an explicit mode, or follow the OS. */
type ThemePref = ThemeMode | 'system';

interface ThemeControl {
  mode: ThemeMode; // resolved 'light' | 'dark'
  pref: ThemePref; // the user's choice
  setPref: (p: ThemePref) => void;
}

const PaletteContext = createContext<Palette>(darkPalette);
const ControlContext = createContext<ThemeControl>({
  mode: 'dark',
  pref: 'system',
  setPref: () => {},
});

export const ThemeProvider = ({
  children,
  initialPref = 'system',
}: {
  children: React.ReactNode;
  initialPref?: ThemePref;
}) => {
  const system = useColorScheme(); // 'light' | 'dark' | null
  const [pref, setPref] = useState<ThemePref>(initialPref);

  // Dark-first: fall back to dark when the OS value is unknown.
  const mode: ThemeMode =
    pref === 'system' ? (system === 'light' ? 'light' : 'dark') : pref;

  const palette = themes[mode];

  const control = useMemo<ThemeControl>(
    () => ({ mode, pref, setPref }),
    [mode, pref],
  );

  return (
    <ControlContext.Provider value={control}>
      <PaletteContext.Provider value={palette}>
        {children}
      </PaletteContext.Provider>
    </ControlContext.Provider>
  );
};

/** The active palette. Use for inline colors and readableOn(). */
export const useTheme = (): Palette => useContext(PaletteContext);

/** The resolved mode + a setter, for a theme toggle in settings. */
export const useThemeMode = (): ThemeControl => useContext(ControlContext);

/**
 * Memoized themed styles. Pass a MODULE-SCOPE factory (stable identity) so the
 * StyleSheet is rebuilt only when the theme changes, not on every render.
 *
 *   const styles = useThemedStyles(makeStyles);
 */
export function useThemedStyles<T>(factory: (t: Palette) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [theme, factory]);
}
