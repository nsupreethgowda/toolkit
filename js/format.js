// js/format.js
// Context-aware formatter with support for local flags (format-flags.js)
// and external, taggable rule packs loaded/merged by rule-loader.js.

import { loadRules as loadLocalFlags } from './format-flags.js';

/**
 * Reformat text using:
 * 1) Local toggle flags (trim, sentence case, etc.)
 * 2) Merged rule packs (replacements → post ops → sectionizers)
 *
 * @param {string} input - raw transcript text
 * @param {object} [mergedPack] - { replacements[], post[], sectionizers[] }
 * @returns {string} formatted text with \n\n between blocks
 */
export function reformatText(input, mergedPack) {
  const flags = loadLocalFlags();
  let text = String(input || '');

  // ---- Base normalizers (flags) ----
  if (flags.trimWhitespace)   text = text.trim();
  if (flags.normalizeSpaces)  text = text.replace(/\s+/g, ' ');
  if (flags.removeFillers)    text = removeFillers(text);
  if (flags.numbersAsDigits)  text = wordsToNumbers(text);
  if (flags.smartPunctuation) text = smartPunct(text);
  if (flags.sentenceCase)     text = toSentenceCase(text);

  // ---- Rule-pack replacements (ordered) ----
  if (mergedPack?.replacements?.length) {
    for (const r of mergedPack.replacements) {
      try {
        const re = new RegExp(r.pattern, r.flags || 'g');
        text = text.replace(re, r.replacement);
      } catch { /* ignore bad patterns */ }
    }
  }

  // ---- Paragraphization ----
  let blocks = toParagraphs(text);

  // ---- Rule-pack post operations ----
  if (mergedPack?.post?.length) {
    for (const step of mergedPack.post) {
      switch (step.op) {
        case 'smartPunct':
          blocks = blocks.map(smartPunct);
          break;
        case 'removeFillers':
          blocks = blocks.map(removeFillers);
          break;
        case 'numbersAsDigits':
          blocks = blocks.map(t => wordsToNumbers(t, step.max || 10));
          break;
        case 'bulletize':
          blocks = bulletize(blocks, step.minItems || 3);
          break;
        default:
          // unknown op: ignore
          break;
      }
    }
  }

  // ---- Sectionizers ----
  // Prefer the first pack-provided sectionizer that yields structure;
  // else fall back to legacy flag sectionizers (if enabled).
  let sectionized = false;
  if (mergedPack?.sectionizers?.length) {
    for (const def of mergedPack.sectionizers) {
      const out = genericSectionize(blocks, def);
      if (out) { blocks = out; sectionized = true; break; }
    }
  }
  if (!sectionized) {
    if (flags.sectionizeSOAP) {
      blocks = soapSectionize(blocks);
    } else if (flags.sectionizeStrokeNote) {
      blocks = strokeSectionize(blocks);
    }
  }

  // ---- Final touches ----
  if (flags.bulletizeLists) blocks = bulletize(blocks, 3);
  if (flags.redactPHI)      blocks = blocks.map(redactPHI);

  return blocks.join('\n\n');
}

/* ===================== Helpers (deterministic, fast) ===================== */

function removeFillers(s) {
  return s
    .replace(/\b(uh|um|erm|hmm)\b/gi, '')
    .replace(/\b(you know|i mean|like)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function wordsToNumbers(s) {
  const map = { zero:0, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10 };
  return s.replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten)\b/gi,
                   m => String(map[m.toLowerCase()]));
}

function smartPunct(s) {
  s = s.replace(/\s+([,.;:!?])/g, '$1');     // no space before punctuation
  s = s.replace(/([,.;:!?])(?!\s)/g, '$1 '); // ensure space after punctuation
  s = s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'"); // curly → straight quotes
  s = s.replace(/ ?— ?/g, ' — ');            // normalize em dash spacing
  return s.replace(/\s{2,}/g, ' ').trim();
}

function toSentenceCase(s) {
  const parts = s.split(/(?<=[.!?])\s+/);
  return parts.map(p => p ? p.charAt(0).toUpperCase() + p.slice(1) : p).join(' ');
}

/**
 * Respect existing double newlines; otherwise group ~3 sentences per paragraph.
 */
function toParagraphs(s) {
  if (s.includes('\n\n')) {
    return s.split(/\n{2,}/).map(x => x.trim()).filter(Boolean);
  }
  const sentences = s.split(/(?<=[.!?])\s+/).filter(Boolean);
  const out = [];
  for (let i = 0; i < sentences.length; i += 3) {
    out.push(sentences.slice(i, i + 3).join(' '));
  }
  return out;
}

/**
 * If a block looks like multiple items separated by line breaks or semicolons,
 * render as bullets (•). Only applies when at least minItems are detected.
 */
function bulletize(blocks, minItems = 3) {
  return blocks.map(b => {
    const lines = b.split(/;\s+|\s*\n\s*/).map(x => x.trim()).filter(Boolean);
    return (lines.length >= minItems) ? lines.map(x => `• ${x}`).join('\n') : b;
  });
}

function redactPHI(b) {
  b = b.replace(/\b(my name is|i am)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/gi, '[REDACTED NAME]');
  b = b.replace(/\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[REDACTED PHONE]');
  b = b.replace(/\b(MRN|medical record number)\s*[:#]?\s*\w+\b/gi, '[REDACTED MRN]');
  return b;
}

/* --------- Sectionizers --------- */

function genericSectionize(blocks, def) {
  if (!def?.sections?.length) return null;

  const text = blocks.join(' ');
  const cues = def.sections.map(s => [
    s.title,
    new RegExp(`\\b(${(s.cues || []).map(escapeRe).join('|')})\\b`, 'i')
  ]);

  let cur = def.sections[0].title;
  const out = {}; for (const [title] of cues) out[title] = [];

  for (const para of toParagraphs(text)) {
    const hit = cues.find(([_, re]) => re.test(para));
    if (hit) cur = hit[0];
    out[cur].push(para);
  }

  const assembled = [];
  for (const [title] of cues) {
    if (out[title]?.length) assembled.push(`${title}:\n${out[title].join('\n')}`);
  }
  return assembled.length ? assembled : null;
}

function soapSectionize(blocks) {
  return genericSectionize(blocks, {
    sections: [
      { title: 'Subjective', cues: ['patient reports','history','complains','states','denies'] },
      { title: 'Objective',  cues: ['vitals','exam','neurologic exam','findings','imaging','labs'] },
      { title: 'Assessment', cues: ['assessment','impression','diagnosis'] },
      { title: 'Plan',       cues: ['plan','recommend','treat','start','continue','follow up'] }
    ]
  }) || blocks;
}

function strokeSectionize(blocks) {
  return genericSectionize(blocks, {
    sections: [
      { title: 'Presentation',   cues: ['lkw','last known well','onset','presentation','symptoms'] },
      { title: 'Vitals & Exam',  cues: ['vitals','nihss','exam','neurologic exam','deficits'] },
      { title: 'Imaging',        cues: ['ct','angiography','mri','flair','tici','aspects','occlusion'] },
      { title: 'Treatment',      cues: ['ivt','tpa','tenecteplase','mt','thrombectomy','antiplatelet','anticoagulation'] },
      { title: 'Plan',           cues: ['plan','recommend','admit','neuro icu','follow up'] }
    ]
  }) || blocks;
}

/* --------- Utility --------- */
function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
