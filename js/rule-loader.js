// js/rule-loader.js
const LS_ENABLED = 'ctxRulePacksEnabled'; // array of pack IDs enabled by user

export async function getRegistry() {
  const res = await fetch('./rules/index.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('Failed to load rules index');
  return await res.json();
}

export function getEnabledPackIds() {
  try {
    const raw = localStorage.getItem(LS_ENABLED);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function setEnabledPackIds(ids) {
  localStorage.setItem(LS_ENABLED, JSON.stringify(ids || []));
}

export async function loadEnabledPacks() {
  const all = await getRegistry();
  const enabled = new Set(getEnabledPackIds());

  const chosen = all.filter(p => enabled.has(p.id));
  const packs = [];
  for (const p of chosen) {
    const res = await fetch(`./rules/${p.path}`, { cache: 'no-cache' });
    if (!res.ok) continue;
    packs.push(await res.json());
  }
  return mergePacks(packs);
}

export function mergePacks(packs) {
  const merged = { replacements: [], post: [], sectionizers: [] };
  for (const p of packs) {
    if (Array.isArray(p.replacements)) merged.replacements.push(...p.replacements);
    if (Array.isArray(p.post))         merged.post.push(...p.post);
    if (Array.isArray(p.sectionizers)) merged.sectionizers.push(...p.sectionizers);
  }
  return merged;
}

// Add to js/rule-loader.js
export async function loadEnabledParsers() {
  const all = await getRegistry();
  const enabled = new Set(getEnabledPackIds());
  const chosen = all.filter(p => p.kind === 'parser' && enabled.has(p.id));
  const mods = [];
  for (const p of chosen) {
    try {
      const mod = await import(`../rules/${p.module}`); // ESM import
      mods.push({ id: p.id, label: p.label, ...mod });
    } catch (e) {
      console.warn('Parser load failed', p, e);
    }
  }
  return mods;
}

export async function loadEnabledPacks() {
  const all = await getRegistry();
  const enabled = new Set(getEnabledPackIds());
  const chosen = all.filter(p => (!p.kind || p.kind === 'pack') && enabled.has(p.id));
  const packs = [];
  for (const p of chosen) {
    const res = await fetch(`./rules/${p.path}`, { cache: 'no-cache' });
    if (!res.ok) continue;
    packs.push(await res.json());
  }
  return mergePacks(packs);
}
