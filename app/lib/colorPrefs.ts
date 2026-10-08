// The colour choice, stored in this browser (krp-core's assembly/pieceColors has the palette).
import { COLOR_MODES, DEFAULT_COLOR_PREFS, isPieceColorKey, type ColorMode, type ColorPrefs } from '../../krp-core/src/assembly/pieceColors.js';

const STORAGE_KEY = 'polyhedraverse:colors:v1';

export function loadColorPrefs(): ColorPrefs {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<ColorPrefs> | null;
    if (v && COLOR_MODES.includes(v.mode as ColorMode) && isPieceColorKey(v.pick)) return { mode: v.mode as ColorMode, pick: v.pick };
  } catch { /* missing/corrupt -- defaults */ }
  return DEFAULT_COLOR_PREFS;
}

export function saveColorPrefs(prefs: ColorPrefs) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch { /* best-effort */ }
}
