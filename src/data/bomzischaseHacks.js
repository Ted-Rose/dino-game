/** Bomža medības — «haki» (īslaicīga aizsardzība) */

export const BOMZISCHASE_HACK_CHANGED = 'bomzischase-hacks-changed';
export const BOMZISCHASE_HACK_EVENT = 'bomzischase:use-hack';
/** Pieprasīt atdzīvināšanu pēc spēles beigām (1 haks). */
export const BOMZISCHASE_REVIVE_EVENT = 'bomzischase:revive';
/** Spēle atdzīvojusies — notīrīt game-over UI. */
export const BOMZISCHASE_REVIVED_EVENT = 'bomzischase-revived';

export const STORAGE_HACKS = 'bomzischase-hacks';

/** Naudas par 10 lietojumiem */
export const HACK_PACK_PRICE = 98;
export const HACK_PACK_AMOUNT = 10;

/** Cik sekundes ir «haka» efekts */
export const HACK_INVULN_SEC = 3.75;

export function loadHacks() {
  try {
    const n = Number(localStorage.getItem(STORAGE_HACKS) || '0');
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  } catch {
    return 0;
  }
}

export function saveHacks(n) {
  localStorage.setItem(STORAGE_HACKS, String(Math.max(0, Math.floor(n))));
}
