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
const motion = document.querySelector('.motion');
let still = matchMedia('(prefers-reduced-motion: reduce)').matches;
function updateMotion() {
  document.body.classList.toggle('no-motion', still);
  if (motion) { motion.setAttribute('aria-pressed', String(still)); motion.textContent = still ? 'Bewegung aus' : 'Bewegung an'; }
}
updateMotion();
if (motion) motion.addEventListener('click', () => { still = !still; updateMotion(); });
let audio;
const sound = document.querySelector('.sound');
async function stopSound() {
  const previous = audio; audio = null;
  if (previous && previous.state !== 'closed') await previous.close();
  if (sound) { sound.textContent = '♬ Klang aus'; sound.setAttribute('aria-pressed', 'false'); }
}
if (sound) sound.addEventListener('click', async () => {
  if (audio) { await stopSound(); return; }
  try {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) throw Error();
    audio = new Context(); await audio.resume();
    if (!audio) return;
    const gain = audio.createGain(); gain.gain.value = .018; gain.connect(audio.destination);
    [110, 164.81, 220].forEach(f => {
      const oscillator = audio.createOscillator(); oscillator.type = 'sine'; oscillator.frequency.value = f;
      oscillator.connect(gain); oscillator.start();
    });
    sound.textContent = '♬ Klang an'; sound.setAttribute('aria-pressed', 'true');
  } catch { await stopSound(); sound.textContent = 'Klang nicht verfügbar'; }
});
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
