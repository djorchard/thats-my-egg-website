const form = document.querySelector('#playtest-form');
const usernameField = document.querySelector('#roblox-username');
const submit = document.querySelector('#signup-submit');
const status = document.querySelector('#signup-status');
const verification = document.querySelector('#playtest-verification');
let config;
let token = '';
let widget;
let pending = false;

function message(text, error = false) {
  status.textContent = text;
  status.classList.toggle('is-error', error);
}
function resetVerification() {
  token = '';
  if (widget !== undefined && window.turnstile) window.turnstile.reset(widget);
}
function loadTurnstile(sitekey) {
  return new Promise((resolve, reject) => {
    const deadline = setTimeout(() => reject(new Error('Verification unavailable')), 12000);
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => {
      clearTimeout(deadline);
      try {
        widget = window.turnstile.render(verification, {
          sitekey,
          action: 'playtest',
          theme: 'dark',
          size: 'flexible',
          callback: value => { token = value; if (!pending) message(''); },
          'expired-callback': () => { token = ''; },
          'error-callback': () => { token = ''; message('Verification could not load. Please refresh the page and try again.', true); }
        });
        resolve();
      } catch (error) { reject(error); }
    };
    script.onerror = () => { clearTimeout(deadline); reject(new Error('Verification unavailable')); };
    document.head.append(script);
  });
}
const ready = (async () => {
  try {
    const response = await fetch(new URL('./playtest-config.json', import.meta.url), {cache: 'no-store', signal: AbortSignal.timeout(10000)});
    if (!response.ok) throw new Error('Signup configuration unavailable');
    config = await response.json();
    const endpoint = new URL(config.apiBaseUrl);
    if (endpoint.protocol !== 'https:' || !config.turnstileSiteKey) throw new Error('Signup is not configured');
    config.apiBaseUrl = endpoint.href.replace(/\/$/, '');
    await loadTurnstile(config.turnstileSiteKey);
    return true;
  } catch (error) {
    message('Playtester signup is temporarily unavailable. Please try again later.', true);
    return false;
  }
})();

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (pending) return;
  const username = usernameField.value.trim();
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
    usernameField.setAttribute('aria-invalid', 'true');
    message('Enter your Roblox username using 3 to 20 letters, numbers, or underscores.', true);
    usernameField.focus();
    return;
  }
  usernameField.removeAttribute('aria-invalid');
  if (!(await ready) || pending) return;
  if (!token) { message('Please complete the verification, then join the list.', true); return; }
  pending = true;
  submit.disabled = true;
  form.setAttribute('aria-busy', 'true');
  message('Adding you to the list...');
  try {
    const response = await fetch(`${config.apiBaseUrl}/signup`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({username, token}),
      signal: AbortSignal.timeout(20000)
    });
    const result = await response.json().catch(() => null);
    if ((response.status !== 200 && response.status !== 201) || result?.saved !== true) {
      const safeError = typeof result?.error === 'string' && result.error.length <= 250 ? result.error : 'We could not save your signup. Please try again.';
      message(safeError, true);
      resetVerification();
      return;
    }
    document.querySelector('#signup-account').textContent = `Roblox username: ${result.username || username}`;
    document.querySelector('#signup-content').hidden = true;
    const success = document.querySelector('#signup-success');
    success.hidden = false;
    success.focus();
  } catch (error) {
    message('We could not confirm your signup. Your username is still here. Please try again.', true);
    resetVerification();
  } finally {
    pending = false;
    submit.disabled = false;
    form.removeAttribute('aria-busy');
  }
});
usernameField.addEventListener('input', () => usernameField.removeAttribute('aria-invalid'));
