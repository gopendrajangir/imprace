/**
 * AkkiAi color system — dark + light. Neutrals build the app; accents signal
 * interview state. The structure and the state→accent mapping are identical
 * across modes; only the values shift.
 *
 *   Backgrounds → elevation. Dark: steps lighten. Light: steps stay near
 *                 white, so lean on `border` + shadow to show raised surfaces.
 *   Text        → 3 tones, not interchangeable.
 *   Accents     → each maps to one AppState. Light mode DEEPENS the same hues
 *                 so they hold contrast on white (pale accents wash out there).
 */
export interface Palette {
  bg: string;
  surface1: string;
  surface2: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  border: string;
  borderStrong: string;

  gold: string; // speaking / brand
  coral: string; // recording
  teal: string; // listening / send / success
  rose: string; // error / destructive
  slate: string; // idle / neutral

  noticeBg: string; // accent-tinted banner surface (pairs with gold text)

  onAccent: string; // dark ink for text/icons on a light fill
  onInverse: string; // light ink for text/icons on a dark fill

  captionBg: string;
}

export const darkPalette: Palette = {
  bg: '#12141C',
  surface1: '#1A1D28',
  surface2: '#232735',

  textPrimary: '#EDEEF2',
  textSecondary: '#8B90A0',
  textMuted: '#5B6172',

  border: '#242835',
  borderStrong: '#3A3F4E',

  gold: '#E8B86D',
  coral: '#E17B63',
  teal: '#6FBFA8',
  rose: '#C0596B',
  slate: '#5B6172',

  noticeBg: '#2A2320',

  onAccent: '#12141C',
  onInverse: '#EDEEF2',

  captionBg: 'rgba(0, 0, 0, 0.5)',
};

export const lightPalette: Palette = {
  bg: '#EEEFF2',
  surface1: '#F7F8FA',
  surface2: '#FFFFFF',

  textPrimary: '#1B1D24',
  textSecondary: '#565C6B',
  textMuted: '#8A8F9C',

  border: '#E4E6EB',
  borderStrong: '#CBCED7',

  gold: '#B9852B',
  coral: '#CF6047',
  teal: '#2F9E80',
  rose: '#AC4459',
  slate: '#5B6172',

  noticeBg: '#FBF1DF',

  onAccent: '#1B1D24',
  onInverse: '#FFFFFF',

  captionBg: 'rgba(255, 255, 255, 0.55)', // needs more opacity to stay legible on a bright bg
};

export const themes = { dark: darkPalette, light: lightPalette } as const;
export type ThemeMode = keyof typeof themes;

/** Back-compat default export surface (dark). */
export const palette = darkPalette;
