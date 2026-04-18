/** Bomža medības — avatāru krāsas un cenas (naudiņās) */

export const STORAGE_WALLET = 'bomzischase-wallet';
export const STORAGE_OWNED = 'bomzischase-owned';
export const STORAGE_EQUIP = 'bomzischase-equipped';
export const STORAGE_CUSTOM_APPEARANCE = 'bomzischase-custom-appearance';

/** Brīvi krāsotas kombinācijas ID (nav bodē kā atsevišķa karte) */
export const CUSTOM_SKIN_ID = 'custom';

const DEFAULT_CUSTOM = {
  shirt: 0x1e6ef2,
  pants: 0x243a52,
  skin: 0xf5c89a,
};

/** @typedef {{ id: string, name: string, price: number, shirt: number, pants: number, skin: number }} BomziSkin */

/** @type {BomziSkin[]} */
export const SKINS = [
  {
    id: 'classic',
    name: 'Klasika',
    price: 0,
    shirt: 0x1e6ef2,
    pants: 0x243a52,
    skin: 0xf5c89a,
  },
  {
    id: 'crimson',
    name: 'Ķirzaka',
    price: 80,
    shirt: 0xe63946,
    pants: 0x1d3557,
    skin: 0xffcdb2,
  },
  {
    id: 'forest',
    name: 'Meža zaļš',
    price: 120,
    shirt: 0x2d6a4f,
    pants: 0x344e41,
    skin: 0xd4a574,
  },
  {
    id: 'sunset',
    name: 'Saulriets',
    price: 150,
    shirt: 0xf77f00,
    pants: 0x023047,
    skin: 0xffe8d6,
  },
  {
    id: 'violet',
    name: 'Vijolīte',
    price: 200,
    shirt: 0x7b2cbf,
    pants: 0x240046,
    skin: 0xe0aaff,
  },
  {
    id: 'gold',
    name: 'Zelta',
    price: 350,
    shirt: 0xffd700,
    pants: 0x5c4033,
    skin: 0xffe4c4,
  },
];

export function getSkin(id) {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}

export function loadWallet() {
  try {
    const n = Number(localStorage.getItem(STORAGE_WALLET) || '0');
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  } catch {
    return 0;
  }
}

export function saveWallet(n) {
  localStorage.setItem(STORAGE_WALLET, String(Math.max(0, Math.floor(n))));
}

export function loadOwned() {
  try {
    const raw = localStorage.getItem(STORAGE_OWNED);
    const parsed = raw ? JSON.parse(raw) : ['classic'];
    return Array.isArray(parsed) && parsed.length ? parsed : ['classic'];
  } catch {
    return ['classic'];
  }
}

export function saveOwned(ids) {
  localStorage.setItem(STORAGE_OWNED, JSON.stringify(ids));
}

export function loadEquipped() {
  try {
    const id = localStorage.getItem(STORAGE_EQUIP) || 'classic';
    if (id === CUSTOM_SKIN_ID) return CUSTOM_SKIN_ID;
    return getSkin(id).id;
  } catch {
    return 'classic';
  }
}

export function saveEquipped(id) {
  localStorage.setItem(
    STORAGE_EQUIP,
    id === CUSTOM_SKIN_ID ? CUSTOM_SKIN_ID : getSkin(id).id,
  );
}

export function clampHexColor(n) {
  const x = typeof n === 'number' ? n : parseInt(String(n).replace('#', ''), 16);
  if (!Number.isFinite(x)) return 0x808080;
  return Math.min(0xffffff, Math.max(0, Math.floor(x)));
}

export function loadCustomAppearance() {
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_APPEARANCE);
    if (!raw) return { ...DEFAULT_CUSTOM };
    const j = JSON.parse(raw);
    return {
      shirt: clampHexColor(j.shirt),
      pants: clampHexColor(j.pants),
      skin: clampHexColor(j.skin),
    };
  } catch {
    return { ...DEFAULT_CUSTOM };
  }
}

export function saveCustomAppearance(colors) {
  localStorage.setItem(
    STORAGE_CUSTOM_APPEARANCE,
    JSON.stringify({
      shirt: clampHexColor(colors.shirt),
      pants: clampHexColor(colors.pants),
      skin: clampHexColor(colors.skin),
    }),
  );
}

/** Pilns izskats spēlei (bodīša presets vai savās krāsās). */
export function resolveAppearance(equippedId, customCols) {
  if (equippedId === CUSTOM_SKIN_ID) {
    const c = customCols ?? loadCustomAppearance();
    return {
      id: CUSTOM_SKIN_ID,
      name: 'Mana krāsa',
      price: 0,
      shirt: c.shirt,
      pants: c.pants,
      skin: c.skin,
    };
  }
  return getSkin(equippedId);
}
