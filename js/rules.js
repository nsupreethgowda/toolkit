import { loadRules, saveRules } from './format.js';

function id(x){ return document.getElementById(x); }

function bind(idStr, key) {
  const el = id(idStr);
  el.addEventListener('change', () => {
    const rules = loadRules();
    rules[key] = el.type === 'checkbox' ? el.checked : el.value;
    saveRules(rules);
    flashSaved();
  });
}

function flashSaved() {
  const n = id('saved');
  n.style.opacity = '1';
  setTimeout(() => n.style.opacity = '0', 900);
}

function hydrate() {
  const r = loadRules();
  for (const [k,v] of Object.entries(r)) {
    const el = id(k);
    if (!el) continue;
    if (el.type === 'checkbox') el.checked = !!v;
    else el.value = v;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  hydrate();

  // general
  bind('trimWhitespace','trimWhitespace');
  bind('normalizeSpaces','normalizeSpaces');
  bind('sentenceCase','sentenceCase');
  bind('removeFillers','removeFillers');
  bind('smartPunctuation','smartPunctuation');
  bind('numbersAsDigits','numbersAsDigits');
  bind('bulletizeLists','bulletizeLists');

  // medical
  bind('expandAbbrev','expandAbbrev');
  bind('sectionizeSOAP','sectionizeSOAP');
  bind('sectionizeStrokeNote','sectionizeStrokeNote');
  bind('redactPHI','redactPHI');

  id('reset').addEventListener('click', () => {
    localStorage.removeItem('ctxRules');
    hydrate();
    flashSaved();
  });
});

// add at the top with your other imports
import { getRegistry, getEnabledPackIds, setEnabledPackIds } from './rule-loader.js';

// inside DOMContentLoaded, after hydrate() and checkbox binds:
renderPacks();

// ---- packs UI ----
async function renderPacks() {
  const container = document.getElementById('packs');
  container.innerHTML = 'Loading…';

  try {
    const registry = await getRegistry();
    const enabled = new Set(getEnabledPackIds());

    const frag = document.createDocumentFragment();
    registry.forEach(item => {
      const row = document.createElement('div');
      row.className = 'row';
      row.style = 'align-items:flex-start;';

      const left = document.createElement('div');
      left.innerHTML = `<strong>${item.label}</strong><br><span class="muted">${item.description}</span><br><small class="muted">Tags: ${item.tags.join(', ')}</small>`;

      const right = document.createElement('div');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = enabled.has(item.id);
      cb.addEventListener('change', () => {
        const ids = getEnabledPackIds();
        const set = new Set(ids);
        if (cb.checked) set.add(item.id); else set.delete(item.id);
        setEnabledPackIds([...set]);
        flashSaved();
      });
      right.appendChild(cb);

      row.appendChild(left);
      row.appendChild(right);
      frag.appendChild(row);
    });

    container.innerHTML = '';
    container.appendChild(frag);
  } catch (e) {
    container.textContent = 'Failed to load rule packs.';
    console.error(e);
  }
}
