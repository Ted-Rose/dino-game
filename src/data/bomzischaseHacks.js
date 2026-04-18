/** Bomža medības — «haki» (īslaicīga aizsardzība) */

export const BOMZISCHASE_HACK_CHANGED = 'bomzischase-hacks-changed';
export const BOMZISCHASE_HACK_EVENT = 'bomzischase:use-hack';

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
