// Journal + Pomodoro logic (browser-safe, exports disabled)

const LS_KEY = 'journalEntries_v1';
const SESSIONS_KEY = 'pomodoroSessions_v1';

function qs(id){ return document.getElementById(id); }
function genId(){ return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8); }

let entries = [];
let sessions = [];

function loadFromLocal(){
  try {
    const raw = localStorage.getItem(LS_KEY);
    entries = raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Failed to parse journal entries from localStorage', e);
    entries = [];
  }
  try {
    const rawS = localStorage.getItem(SESSIONS_KEY);
    sessions = rawS ? JSON.parse(rawS) : [];
  } catch(e) {
    sessions = [];
  }
}

function saveToLocal(){
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(entries));
  } catch(e){
    alert('Failed to save to localStorage. Possibly storage quota exceeded.');
    console.error(e);
  }
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch(e) {
    console.warn('Failed to save sessions');
  }
}

function escapeHtml(s = ''){
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function renderEntries(){
  const ul = qs('entries-list');
  if(!ul) return;
  ul.innerHTML = '';
  if(entries.length === 0){
    ul.innerHTML = '<li class="muted">No saved entries yet</li>';
    return;
  }
  entries.slice().reverse().forEach(entry => {
    const li = document.createElement('li');
    li.className = 'entry-item';
    li.innerHTML = `
      <div>
        <strong>${escapeHtml(entry.title || '(untitled)')}</strong>
        <span class="muted"> — ${new Date(entry.createdAt).toLocaleString()}</span>
        <div class="tags">${escapeHtml((entry.tags||[]).join(', '))}</div>
      </div>
      <div class="entry-controls">
        <button data-id="${entry.id}" class="load">Load</button>
        <button data-id="${entry.id}" class="delete danger">Delete</button>
      </div>
    `;
    ul.appendChild(li);
  });
}

function addEntry(title, body, tags){
  const entry = {
    id: genId(),
    title: title || '',
    content: body || '',
    tags: tags || [],
    createdAt: Date.now()
  };
  entries.push(entry);
  saveToLocal();
  renderEntries();
  return entry;
}

function deleteEntry(id){
  entries = entries.filter(e => e.id !== id);
  saveToLocal();
  renderEntries();
}

// UI wiring
function wireUI(){
  const saveBtn = qs('save-local');
  if(saveBtn){
    saveBtn.addEventListener('click', () => {
      const title = qs('entry-title') ? qs('entry-title').value.trim() : '';
      const tags = qs('entry-tags') ? qs('entry-tags').value.split(',').map(s => s.trim()).filter(Boolean) : [];
      const body = qs('entry-body') ? qs('entry-body').value : '';
      if(!body.trim() && !title){
        if(!confirm('Entry appears empty. Save anyway?')) return;
      }
      addEntry(title, body, tags);
      if(qs('entry-body')) qs('entry-body').value = '';
      if(qs('entry-title')) qs('entry-title').value = '';
      if(qs('entry-tags')) qs('entry-tags').value = '';
    });
  }

  const clearBtn = qs('clear-all');
  if(clearBtn){
    clearBtn.addEventListener('click', () => {
      if(!confirm('Clear all saved entries from localStorage? This cannot be undone.')) return;
      entries = [];
      saveToLocal();
      renderEntries();
    });
  }

  // Disable export buttons if present
  const exportEntryBtn = qs('export-entry');
  if(exportEntryBtn){
    exportEntryBtn.disabled = true;
    exportEntryBtn.title = 'Export disabled';
    exportEntryBtn.addEventListener('click', () => {
      alert('Export/download functions are disabled in this build.');
    });
  }
  const exportAllBtn = qs('export-all');
  if(exportAllBtn){
    exportAllBtn.disabled = true;
    exportAllBtn.title = 'Export disabled';
    exportAllBtn.addEventListener('click', () => {
      alert('Export/download functions are disabled in this build.');
    });
  }

  const entriesList = qs('entries-list');
  if(entriesList){
    entriesList.addEventListener('click', (ev) => {
      const target = ev.target;
      const id = target.dataset && target.dataset.id;
      if(!id) return;
      if(target.classList.contains('load')){
        const e = entries.find(x => x.id === id);
        if(e){
          if(qs('entry-title')) qs('entry-title').value = e.title;
          if(qs('entry-tags')) qs('entry-tags').value = (e.tags || []).join(', ');
          if(qs('entry-body')) qs('entry-body').value = e.content;
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else if(target.classList.contains('delete')){
        if(confirm('Do you want to delete this entry? This will permanently delete the entry, with no option to undo.')) deleteEntry(id);
      }
    });
  }

  // Timer wiring (same logic as before)
  let timer = null;
  let currentMode = 'work';
  let remaining = 25 * 60;
  let running = false;
  let cycleCount = 0;

  const clock = qs('timer-clock');
  const desc = qs('timer-desc');

  function setRemainingFromSettings(mode){
    const w = parseInt(qs('work-min')?.value) || 25;
    const s = parseInt(qs('short-min')?.value) || 5;
    const l = parseInt(qs('long-min')?.value) || 15;
    if(mode === 'work') return w * 60;
    if(mode === 'short') return s * 60;
    return l * 60;
  }

  function updateClock(){
    if(!clock) return;
    const mm = Math.floor(remaining / 60).toString().padStart(2,'0');
    const ss = (remaining % 60).toString().padStart(2,'0');
    clock.textContent = `${mm}:${ss}`;
    if(desc) desc.textContent = `${currentMode.toUpperCase()} — cycles: ${cycleCount}`;
  }

  function renderSessions(){
    const el = qs('sessions-list');
    if(!el) return;
    if(sessions.length === 0){
      el.innerHTML = '<div class="muted">No sessions yet</div>';
      return;
    }
    el.innerHTML = '';
    sessions.slice().reverse().forEach(s => {
      const row = document.createElement('div');
      row.className = 'session-row';
      row.innerHTML = `<strong>${new Date(s.when).toLocaleString()}</strong> — ${s.mode} (${s.lengthMin} min)
        <button data-id="${s.id}" class="export-session" disabled title="Export disabled">Export</button>`;
      el.appendChild(row);
    });
  }

  function tick(){
    if(remaining > 0){
      remaining--;
      updateClock();
    } else {
      navigator.vibrate?.(200);
      if(currentMode === 'work'){
        cycleCount++;
        sessions.push({
          id: genId(),
          when: Date.now(),
          mode: 'work',
          lengthMin: Math.round((setRemainingFromSettings('work')/60)),
        });
        saveToLocal();
        renderSessions();
      }
      if(currentMode === 'work'){
        currentMode = (cycleCount % 4 === 0) ? 'long' : 'short';
      } else {
        currentMode = 'work';
      }
      remaining = setRemainingFromSettings(currentMode);
      updateClock();
    }
  }

  const startBtn = qs('start-timer');
  const pauseBtn = qs('pause-timer');
  const resetBtn = qs('reset-timer');
  const attachBtn = qs('attach-current');
  const viewSessionsBtn = qs('view-sessions');

  if(startBtn){
    startBtn.addEventListener('click', () => {
      if(running) return;
      running = true;
      if(!timer) timer = setInterval(tick, 1000);
      updateClock();
      if(desc) desc.textContent = `Running (${currentMode})`;
    });
  }
  if(pauseBtn){
    pauseBtn.addEventListener('click', () => {
      running = false;
      if(timer){ clearInterval(timer); timer = null; }
      if(desc) desc.textContent = `Paused (${currentMode})`;
    });
  }
  if(resetBtn){
    resetBtn.addEventListener('click', () => {
      running = false;
      if(timer){ clearInterval(timer); timer = null; }
      currentMode = 'work';
      remaining = setRemainingFromSettings('work');
      cycleCount = 0;
      updateClock();
      if(desc) desc.textContent = 'Ready';
    });
  }

  if(attachBtn){
    attachBtn.addEventListener('click', () => {
      const title = qs('entry-title') ? qs('entry-title').value.trim() : '';
      const body = qs('entry-body') ? qs('entry-body').value : '';
      if(!body && !title){
        alert('No content in editor to attach.');
        return;
      }
      const session = sessions.length ? sessions[sessions.length - 1] : null;
      const note = {
        id: genId(),
        title: title || 'Attached note',
        content: body,
        createdAt: Date.now(),
        attachedToSession: session ? session.id : null
      };
      entries.push({
        id: note.id,
        title: note.title,
        content: note.content,
        tags: ['attached'],
        createdAt: note.createdAt
      });
      saveToLocal();
      renderEntries();
      alert('Attached current editor content to session and saved as an entry.');
      if(qs('entry-title')) qs('entry-title').value='';
      if(qs('entry-body')) qs('entry-body').value='';
      if(qs('entry-tags')) qs('entry-tags').value='';
    });
  }

  if(viewSessionsBtn){
    viewSessionsBtn.addEventListener('click', () => {
      const el = qs('sessions-list');
      if(!el) return;
      el.style.display = el.style.display === 'block' ? 'none' : 'block';
    });
  }

  // init timer display
  remaining = setRemainingFromSettings('work');
  updateClock();
  renderSessions();
}

// init
(function init(){
  loadFromLocal();
  renderEntries();
  wireUI();
})();