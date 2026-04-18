/** Bomža medības — «haki» un to veidi */

export const BOMZISCHASE_HACK_CHANGED = 'bomzischase-hacks-changed';
export const BOMZISCHASE_HACK_EVENT = 'bomzischase:use-hack';
/** Pieprasīt atdzīvināšanu pēc spēles beigām (1 haks). */
export const BOMZISCHASE_REVIVE_EVENT = 'bomzischase:revive';
/** Spēle atdzīvojusies — notīrīt game-over UI. */
export const BOMZISCHASE_REVIVED_EVENT = 'bomzischase-revived';

export const STORAGE_HACKS = 'bomzischase-hacks';
export const STORAGE_HACK_KIND = 'bomzischase-hack-kind';

/** Naudas par 10 lietojumiem */
export const HACK_PACK_PRICE = 98;
export const HACK_PACK_AMOUNT = 10;

/** Kārtība UI un īsinājumi tastatūrā (1–7) */
export const HACK_KIND_ORDER = [
  'shield',
  'pulse',
  'bounce',
  'star',
  'bolt',
  'brick',
  'surge',
];

/**
 * @typedef {{ id: string, label: string, hint: string, invulnSec: number, bomziKick: number, vyBoost: number }} HackDef
 */

/** @type {Record<string, HackDef>} */
export const HACK_DEFS = {
  shield: {
    id: 'shield',
    label: 'Vairogs',
    hint: 'Neparāvi un atgrūž bomzi — līdzsvarots.',
    invulnSec: 3.75,
    bomziKick: 12,
    vyBoost: 0,
  },
  pulse: {
    id: 'pulse',
    label: 'Vilnis',
    hint: 'Īpaši stiprs trieciens bombim, īsāka aizsardzība.',
    invulnSec: 2.65,
    bomziKick: 19,
    vyBoost: 0,
  },
  bounce: {
    id: 'bounce',
    label: 'Superlēciens',
    hint: 'Spēcīgs grūdiens augšup + īsa aizsardzība.',
    invulnSec: 1.25,
    bomziKick: 8,
    vyBoost: 11,
  },
  star: {
    id: 'star',
    label: 'Zvaigzne',
    hint: 'Ilga neaizskaramība, vājāks atgrūdiens.',
    invulnSec: 4.85,
    bomziKick: 9,
    vyBoost: 0,
  },
  bolt: {
    id: 'bolt',
    label: 'Zibens',
    hint: 'Visstiprākais «augšup» grūdiens — ļoti īsa aizsardzība.',
    invulnSec: 1.05,
    bomziKick: 11,
    vyBoost: 14,
  },
  brick: {
    id: 'brick',
    label: 'Mūris',
    hint: 'Ļoti gara neaizskaramība; bomzi tikai nedaudz atkāpjas.',
    invulnSec: 6.5,
    bomziKick: 4,
    vyBoost: 0,
  },
  surge: {
    id: 'surge',
    label: 'Krāšņums',
    hint: 'Vislielākais trieciens bombim; vidēji īsa aizsardzība.',
    invulnSec: 2.05,
    bomziKick: 24,
    vyBoost: 0,
  },
};

/** Saderība ar vecāku kodu */
export const HACK_INVULN_SEC = HACK_DEFS.shield.invulnSec;

export function getHackDef(kind) {
  return HACK_DEFS[kind] || HACK_DEFS.shield;
}

export function normalizeHackKind(kind) {
  return HACK_DEFS[kind] ? kind : 'shield';
}

export function loadSelectedHackKind() {
  try {
    const k = localStorage.getItem(STORAGE_HACK_KIND) || 'shield';
    return HACK_DEFS[k] ? k : 'shield';
  } catch {
    return 'shield';
  }
}

export function saveSelectedHackKind(kind) {
  if (HACK_DEFS[kind]) localStorage.setItem(STORAGE_HACK_KIND, kind);
}

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
