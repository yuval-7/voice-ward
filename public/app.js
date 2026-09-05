const transcript = document.querySelector('#transcript');
const statusEl = document.querySelector('#status');
const providerEl = document.querySelector('#provider');
const form = document.querySelector('#composer');
const prompt = document.querySelector('#prompt');
const interrupt = document.querySelector('#interrupt');
const mic = document.querySelector('#mic');

let generation = 0;
let activeController = null;
let activeAudio = null;
let recognition = null;

async function loadProvider() {
  try {
    const config = await fetch('/api/health', { cache: 'no-store' }).then(response => response.json());
    providerEl.textContent = config.provider;
    providerEl.title = `${config.modelId} / ${config.speaker} / ${config.lang} / ${config.audioFormat}`;
    setState(config.configured ? 'Ready - Rime configured' : 'Ready - add RIME_API_KEY for Rime audio');
  } catch { setState('Ready'); }
}

function add(role, text) {
  const item = document.createElement('div');
  item.className = `message ${role}`;
  item.textContent = `${role === 'user' ? 'You' : role === 'assistant' ? 'Voice Ward' : 'System'}: ${text}`;
  transcript.append(item); transcript.scrollTop = transcript.scrollHeight;
}
function setState(text, busy = false) { statusEl.textContent = text; interrupt.disabled = !busy; }
function stopPlayback() {
  if (activeAudio) { activeAudio.pause(); activeAudio.src = ''; activeAudio = null; }
  speechSynthesis.cancel();
}
function interruptActive(note = 'Previous response cancelled.') {
  generation += 1; // fencing token: all prior results become stale
  activeController?.abort(); activeController = null;
  stopPlayback(); setState('Interrupted');
  add('system', note);
}
function speak(result, requestGeneration) {
  if (requestGeneration !== generation) return;
  setState('Speaking', true);
  if (result.audioBase64) {
    activeAudio = new Audio(`data:audio/mpeg;base64,${result.audioBase64}`);
    activeAudio.onended = () => { if (requestGeneration === generation) { activeAudio = null; setState('Ready'); } };
    activeAudio.play().catch(() => { setState('Audio blocked - press Send again'); });
  } else {
    const utterance = new SpeechSynthesisUtterance(result.text);
    utterance.onend = () => { if (requestGeneration === generation) setState('Ready'); };
    speechSynthesis.speak(utterance);
  }
}
async function send(text) {
  if (!text.trim()) return;
  if (activeController || speechSynthesis.speaking || activeAudio) interruptActive('New instruction received; prior response cancelled.');
  const requestGeneration = ++generation;
  activeController = new AbortController();
  add('user', text); setState('Thinking', true);
  try {
    const response = await fetch('/api/respond', { method: 'POST', signal: activeController.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, generation: requestGeneration }) });
    const result = await response.json();
    if (requestGeneration !== generation) return;
    if (!response.ok) throw new Error(result.error || 'Voice service unavailable');
    activeController = null; providerEl.textContent = result.provider;
    add('assistant', result.text); speak(result, requestGeneration);
  } catch (error) {
    if (error.name !== 'AbortError' && requestGeneration === generation) { activeController = null; setState('Ready'); add('system', error.message); }
  }
}
form.addEventListener('submit', event => { event.preventDefault(); const text = prompt.value; prompt.value = ''; send(text); });
interrupt.addEventListener('click', () => interruptActive());
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (Recognition) {
  recognition = new Recognition(); recognition.continuous = false; recognition.interimResults = true;
  recognition.onstart = () => { mic.textContent = 'Listening...'; setState('Listening', true); };
  recognition.onresult = event => { prompt.value = [...event.results].map(r => r[0].transcript).join(''); };
  recognition.onend = () => { mic.textContent = 'Start listening'; if (!activeController && !speechSynthesis.speaking) setState('Ready'); };
  mic.addEventListener('click', () => { interruptActive('Barge-in detected. Listening for the revised instruction.'); recognition.start(); });
} else { mic.disabled = true; mic.textContent = 'Speech recognition unavailable'; }
loadProvider();
