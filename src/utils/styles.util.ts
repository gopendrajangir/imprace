import { darkPalette, Palette } from '@/constants';
import { StyleSheet } from 'react-native';

export const themedStylesFactory = <T extends StyleSheet.NamedStyles<T>>(
  cb: (t: Palette) => T,
) => {
  return cb;
};

// ---- Contrast helpers (WCAG relative luminance) ----
const channel = (c: number): number => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

const luminance = (hex: string): number => {
  const h = hex.replace('#', '');
  const r = channel(parseInt(h.slice(0, 2), 16));
  const g = channel(parseInt(h.slice(2, 4), 16));
  const b = channel(parseInt(h.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string): number => {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
};

/**
 * Readable ink for text/icons on top of a solid `fill`. Picks whichever of the
 * palette's two inks (dark `onAccent` / light `onInverse`) has more contrast —
 * correct in both modes without a per-color table. Defaults to dark palette.
 */
export const readableOn = (fill: string, p: Palette = darkPalette): string =>
  contrast(fill, p.onAccent) >= contrast(fill, p.onInverse)
    ? p.onAccent
    : p.onInverse;

// ---- Opacity helper ----
/**
 * Returns `hex` as an rgba() string at the given alpha (0–1).
 * Works with 6-digit hex colors (e.g. from the palette above).
 */
export const withOpacity = (hex: string, alpha: number): string => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
