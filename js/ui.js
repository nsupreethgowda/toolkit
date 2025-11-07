// Theme helpers
export function setThemeFromStorage(root) {
  const saved = localStorage.getItem('theme');
  root.setAttribute('data-theme', (saved === 'dark' || saved === 'light') ? saved : 'light');
  updateThemeColorMeta(root);
}
export function toggleThemeLabel(btn, root) {
  const isDark = root.getAttribute('data-theme') === 'dark';
  btn.textContent = isDark ? 'Switch to Light' : 'Switch to Dark';
}
export function toggleTheme(btn, root) {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeColorMeta(root);
  toggleThemeLabel(btn, root);
}
function updateThemeColorMeta(root) {
  const isDark = root.getAttribute('data-theme') === 'dark';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#0b1220' : '#0f766e');
}

// Spinner + status
export function setStatus(text) {
  document.getElementById('voice-status').textContent = text;
}
export function showSpinner(text='') {
  const sp = document.getElementById('spinner');
  const st = document.getElementById('spinner-text');
  sp.classList.add('show'); sp.setAttribute('aria-hidden', 'false');
  st.textContent = text;
}
export function hideSpinner() {
  const sp = document.getElementById('spinner');
  const st = document.getElementById('spinner-text');
  sp.classList.remove('show'); sp.setAttribute('aria-hidden', 'true');
  st.textContent = '';
}

// Transcript as paragraphs (3 sentences/paragraph)
export function renderTranscript(text) {
  const target = document.getElementById('transcript');
  target.innerHTML = '';
  if (!text) return;
  const sentences = text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).filter(Boolean);
  const groupSize = 3;
  for (let i = 0; i < sentences.length; i += groupSize) {
    const p = document.createElement('p');
    p.textContent = sentences.slice(i, i + groupSize).join(' ');
    target.appendChild(p);
  }
}

// Recording timer
const timerTextEl = () => document.getElementById('timer-text');
const timerRow = () => document.getElementById('rec-row');
let timerId = null; let startMs = 0;

export const timer = {
  start() {
    startMs = Date.now();
    timerRow().classList.add('recording');
    update();
    timerId = setInterval(update, 1000);
  },
  stop() {
    if (timerId) clearInterval(timerId);
    timerId = null;
    timerTextEl().textContent = '00:00';
    timerRow().classList.remove('recording');
  }
};

function update() {
  const elapsed = Math.max(0, Date.now() - startMs);
  const s = Math.floor(elapsed / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  timerTextEl().textContent = `${mm}:${ss}`;
}
