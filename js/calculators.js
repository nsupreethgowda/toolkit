// js/calculators.js
// Discovers calculators from parser modules and renders NIHSS as example.

import { getRegistry, getEnabledPackIds } from './rule-loader.js';

const calcList = document.getElementById('calc-list');
const outputEl = document.getElementById('output');
const statusEl = document.getElementById('status');

const calculators = [];   // [{ id, title, render(container), getResult() }]
let activeCalc = null;

// Load registry and mount calculators
document.addEventListener('DOMContentLoaded', async () => {
  status('Loading…');
  try {
    const reg = await getRegistry();
    const enabled = new Set(getEnabledPackIds());
    // NIHSS calculator (requires nihss-parser enabled or we still try to import)
    const nihssEntry = reg.find(x => x.id === 'nihss-parser');
    if (nihssEntry) {
      try {
        const mod = await import(`../rules/${nihssEntry.module}`);
        if (typeof mod.getNIHSSCalculatorSchema === 'function' &&
            typeof mod.computeNIHSSFromSelections === 'function') {
          calculators.push(makeNIHSS(mod));
        }
      } catch (e) {
        console.warn('NIHSS module load failed', e);
      }
    }
    // Future: Add other calculators here by scanning registry for kind === 'parser' with get*CalculatorSchema

    renderChooser();
  } catch (e) {
    console.error(e);
    calcList.textContent = 'Failed to load calculators.';
  } finally {
    status('Ready');
  }
});

// UI: list calculators, allow switching
function renderChooser() {
  calcList.innerHTML = '';
  if (!calculators.length) {
    calcList.textContent = 'No calculators available.';
    return;
  }
  const tabs = document.createElement('div');
  tabs.className = 'row';
  calculators.forEach((c, idx) => {
    const b = document.createElement('button');
    b.className = 'copy-btn';
    b.textContent = c.title;
    b.addEventListener('click', () => mountCalc(idx));
    tabs.appendChild(b);
  });
  calcList.appendChild(tabs);

  // first one by default
  mountCalc(0);
}

function mountCalc(index) {
  const holder = document.createElement('div');
  holder.className = 'calc-card';
  calcList.appendChild(holder);

  // clear previous card (keep tabs)
  Array.from(calcList.children).forEach((el, i) => { if (i > 0) calcList.removeChild(el); });

  activeCalc = calculators[index];
  activeCalc.render(holder);
  outputEl.textContent = '';
}

// NIHSS factory
function makeNIHSS(mod) {
  const schema = mod.getNIHSSCalculatorSchema();
  let state = {}; // { code: value }

  function render(container) {
    container.innerHTML = '';

    const title = document.createElement('h2'); title.textContent = schema.title;
    container.appendChild(title);

    const grid = document.createElement('div'); grid.className = 'grid';
    container.appendChild(grid);

    for (const item of schema.items) {
      const card = document.createElement('div');
      card.style = 'border:1px solid var(--border); border-radius:10px; padding:.75rem; background:var(--surface);';

      const h = document.createElement('h3'); h.textContent = `${item.code} — ${item.label}`;
      h.style = 'font-size:1rem; margin-bottom:.5rem;';
      card.appendChild(h);

      const group = document.createElement('div'); group.style = 'display:flex; flex-wrap:wrap; gap:.5rem;';
      for (const opt of item.options) {
        const btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.textContent = opt.label;
        btn.addEventListener('click', () => {
          state[item.code] = opt.value;
          // mark active
          Array.from(group.children).forEach(ch => ch.style.outline = '');
          btn.style.outline = '2px solid var(--brand)';
          computeAndRender();
        });
        group.appendChild(btn);
      }
      card.appendChild(group);
      grid.appendChild(card);
    }

    // clear selection button
    const row = document.createElement('div'); row.className = 'row'; row.style = 'margin-top:.75rem;';
    const clear = document.createElement('button'); clear.className = 'copy-btn'; clear.textContent = 'Clear selections';
    clear.addEventListener('click', () => { state = {}; computeAndRender(true); });
    row.appendChild(clear);
    container.appendChild(row);
  }

  function computeAndRender(reset=false) {
    const res = mod.computeNIHSSFromSelections(state);
    const lines = res.lines.join('\n');
    outputEl.textContent = lines;
    status(`Total = ${res.total}${res.un.length ? ` | UN: ${res.un.join(', ')}` : ''}`);
    if (reset) status('Cleared');
  }

  function getResult() {
    const res = mod.computeNIHSSFromSelections(state);
    return {
      text: res.lines.join('\n'),
      json: { calculator: 'NIHSS', total: res.total, un: res.un, selections: state }
    };
  }

  return { id: schema.id, title: schema.title, render, getResult };
}

// Export/Download
document.getElementById('export-text').addEventListener('click', () => {
  if (!activeCalc) return;
  const { text } = activeCalc.getResult();
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'calculator-output.txt'; a.click();
  URL.revokeObjectURL(url);
});
document.getElementById('export-json').addEventListener('click', () => {
  if (!activeCalc) return;
  const { json } = activeCalc.getResult();
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'calculator-output.json'; a.click();
  URL.revokeObjectURL(url);
});

function status(t){ statusEl.textContent = t; }
