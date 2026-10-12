'use strict';
const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('nav');
if (menu && nav) {
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('open', open);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('open')) {
      nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); menu.focus();
    }
  });
}
const motionButtons = [...document.querySelectorAll('.motion')];
let still = matchMedia('(prefers-reduced-motion: reduce)').matches;
function updateMotion() {
  document.body.classList.toggle('no-motion', still);
  motionButtons.forEach(button => { button.setAttribute('aria-pressed', String(still)); button.textContent = still ? 'Bewegung aus' : 'Bewegung an'; });
}
updateMotion();
motionButtons.forEach(button => button.addEventListener('click', () => { still = !still; document.body.classList.toggle('motion-opt-in', !still); updateMotion(); }));
let audio;
let startingSound = false;
const audioTimers = new Set();
const soundButtons = [...document.querySelectorAll('.sound')];
function updateSound(active, unavailable = false) {
  soundButtons.forEach(button => {
    button.setAttribute('aria-pressed', String(active));
    button.textContent = unavailable ? 'Klang nicht verfügbar' : button.classList.contains('hero-sound') ? (active ? '♬ Atmosphäre ausschalten' : '♬ Atmosphäre einschalten') : (active ? '♬ Klang an' : '♬ Klang aus');
  });
}
async function stopSound() {
  const previous = audio; audio = null;
  audioTimers.forEach(clearTimeout); audioTimers.clear();
  updateSound(false);
  if (previous && previous.state !== 'closed') await previous.close();
}
function scheduleSound(context, callback, min, max) {
  const timer = setTimeout(() => {
    audioTimers.delete(timer);
    if (audio !== context || context.state !== 'running') return;
    callback(); scheduleSound(context, callback, min, max);
  }, (min + Math.random() * (max - min)) * 1000);
  audioTimers.add(timer);
}
function playForestTone(context, destination, type) {
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const filter = context.createBiquadFilter();
  oscillator.type = type === 'wood' ? 'sawtooth' : 'sine';
  filter.type = 'lowpass'; filter.frequency.value = type === 'wood' ? 550 : 800;
  const length = type === 'wood' ? 2.8 : 1.7;
  oscillator.frequency.setValueAtTime(type === 'wood' ? 115 : 430, now);
  oscillator.frequency.exponentialRampToValueAtTime(type === 'wood' ? 48 : 330, now + length);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(type === 'wood' ? .12 : .09, now + .35);
  gain.gain.exponentialRampToValueAtTime(.0001, now + length);
  oscillator.connect(filter); filter.connect(gain); gain.connect(destination);
  oscillator.start(now); oscillator.stop(now + length + .1);
  oscillator.onended = () => { oscillator.disconnect(); filter.disconnect(); gain.disconnect(); };
}
soundButtons.forEach(button => button.addEventListener('click', async () => {
  if (startingSound) return;
  if (audio) { await stopSound(); return; }
  startingSound = true;
  soundButtons.forEach(item => { item.disabled = true; });
  try {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) throw Error('Audio unavailable');
    const context = new Context(); audio = context;
    await context.resume();
    if (audio !== context || document.hidden) { await stopSound(); return; }
    const master = context.createGain();
    master.gain.setValueAtTime(0, context.currentTime);
    master.gain.linearRampToValueAtTime(.16, context.currentTime + 2);
    master.connect(context.destination);
    const buffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate);
    const data = buffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < data.length; i++) {
      brown = (brown + .02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = brown * 3.5;
    }
    // Smooth the loop boundary so the wind has no click every four seconds.
    for (let i = 0; i < 256; i++) {
      const at = data.length - 256 + i; const mix = i / 255;
      data[at] = data[at] * (1 - mix) + data[0] * mix;
    }
    const wind = context.createBufferSource(); wind.buffer = buffer; wind.loop = true;
    const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 900;
    const windGain = context.createGain(); windGain.gain.value = .65;
    wind.connect(filter); filter.connect(windGain); windGain.connect(master); wind.start();
    const breeze = context.createOscillator(); breeze.frequency.value = .045;
    const modulation = context.createGain(); modulation.gain.value = .22;
    breeze.connect(modulation); modulation.connect(windGain.gain); breeze.start();
    scheduleSound(context, () => playForestTone(context, master, 'wood'), 8, 22);
    scheduleSound(context, () => playForestTone(context, master, 'owl'), 17, 38);
    updateSound(true);
  } catch {
    await stopSound(); updateSound(false, true);
  } finally {
    startingSound = false;
    soundButtons.forEach(item => { item.disabled = false; });
  }
}));
document.addEventListener('visibilitychange', () => { if (document.hidden && audio) stopSound(); });
window.addEventListener('pagehide', () => { if (audio) stopSound(); });

// Use a native HTTPS POST so Formspree can display its own spam checks and errors.
// There is deliberately no frontend success message claiming receipt.
document.querySelectorAll('[data-form]').forEach(form => {
  const personal = form.querySelector('.personal');
  const button = form.querySelector('[type=submit]');
  const status = form.querySelector('.form-status');
  const config = window.SAMHAIN_CONFIG || {};
  const endpoint = config[form.dataset.form + 'Endpoint'];
  const valid = typeof endpoint === 'string' && /^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(endpoint) && config.privacyReady === true;
  function updateIdentity() {
    const selected = form.querySelector('[name=nachrichtentyp]:checked');
    const show = selected && selected.value === 'persoenlich';
    if (!personal) return;
    personal.hidden = !show;
    personal.querySelectorAll('input').forEach(input => { input.disabled = !show; if (!show) input.value = ''; });
  }
  updateIdentity();
  form.querySelectorAll('[name=nachrichtentyp]').forEach(radio => radio.addEventListener('change', updateIdentity));
  if (valid) {
    form.action = endpoint; form.method = 'post'; button.disabled = false;
    status.textContent = 'Beim Absenden wechselst du zu Formspree. Dort wird die Nachricht übermittelt und gegebenenfalls eine Spamprüfung angezeigt.';
  } else {
    button.disabled = true;
    status.textContent = 'Der Nachrichtenempfang ist noch nicht freigeschaltet. Es wird nichts gesendet.';
  }
  let pending = false;
  form.addEventListener('submit', event => {
    if (!valid || pending || !form.reportValidity()) { event.preventDefault(); return; }
    const trap = form.querySelector('[name=_gotcha]');
    if (trap && trap.value) { event.preventDefault(); status.textContent = 'Die Nachricht konnte nicht gesendet werden. Bitte versuche es erneut.'; return; }
    updateIdentity(); pending = true;
    status.textContent = 'Die Nachricht wird an Formspree übermittelt …';
    // The actual response, CAPTCHA and submission confirmation belong to Formspree.
  });
  window.addEventListener('pageshow', () => { pending = false; button.disabled = !valid; updateIdentity(); });
});
