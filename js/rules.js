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
