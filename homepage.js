/* ============================================================
   BetStorm Homepage — homepage.js
   Supabase auth check + UI interactions
   ============================================================ */

// --- Supabase config (riusa config del progetto) ---
const SUPABASE_URL = 'https://zvftggieqlxujjtotvwg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2ZnRnZ2llcWx4dWpqdG90dndnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0OTQ3NjIsImV4cCI6MjA4NzA3MDc2Mn0.ZatmSARBUZpibKPTBNhpXj0c07Thzu8RvT4NjMR6lxg';

let sbClient = null;
let currentUser = null;

// --- Init Supabase ---
async function initAuth() {
  try {
    const { createClient } = window.supabase;
    sbClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { session } } = await sbClient.auth.getSession();
    if (session?.user) {
      currentUser = session.user;
      updateCTAs(true);
    }
    sbClient.auth.onAuthStateChange((_event, session) => { currentUser = session?.user || null; updateCTAs(!!currentUser); });
  } catch (e) {
    console.warn('Supabase init:', e.message);
  }
}

// --- Update CTAs based on auth state ---
function updateCTAs(loggedIn) {
  document.querySelectorAll('[data-auth-cta]').forEach(el => {
    el.textContent = loggedIn ? 'Vai alla Dashboard' : 'Accedi';
    el.href = loggedIn ? '/dashboard.html' : '#betstorm-accesso';
  });
  document.querySelectorAll('[data-auth-hide]').forEach(el => {
    el.style.display = loggedIn ? 'none' : '';
  });
}

// Il form viene creato da JS: homepage.html e homepage.css restano invariati.
function setupAuthModal() {
  const style = document.createElement('style');
  style.textContent = `
    #bs-auth-modal[hidden]{display:none!important}
    #bs-auth-modal{position:fixed;inset:0;z-index:20000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.82)}
    #bs-auth-panel{width:100%;max-width:420px;max-height:95vh;overflow:auto;box-sizing:border-box;background:#101820;color:#fff;border:1px solid #334354;border-radius:16px;padding:28px;box-shadow:0 20px 65px rgba(0,0,0,.6)}
    #bs-auth-panel h2{font-family:Syne,sans-serif;margin:0 0 10px;font-size:1.45rem}
    #bs-auth-panel label{display:block;margin:14px 0 6px;font-size:.85rem}
    #bs-auth-panel input{width:100%;box-sizing:border-box;background:#0a1018;color:white;border:1px solid #43536a;border-radius:8px;padding:12px;font-size:1rem}
    #bs-auth-panel button{cursor:pointer}
    .bs-auth-primary{width:100%;background:#00d87c;border:0;border-radius:9px;padding:12px;margin-top:18px;font-weight:800;color:#06130e}
    .bs-auth-link{border:0;background:none;color:#00e676;padding:8px 3px;text-decoration:underline}
    #bs-auth-msg{margin-top:12px;font-size:.87rem;line-height:1.5;min-height:20px}
    #bs-auth-close{float:right;background:none;border:0;color:#fff;font-size:1.6rem}
  `;
  document.head.appendChild(style);
  const modal = document.createElement('div');
  modal.id = 'bs-auth-modal'; modal.hidden = true;
  modal.innerHTML = `<div id="bs-auth-panel" role="dialog" aria-modal="true" aria-labelledby="bs-auth-title">
    <button type="button" id="bs-auth-close" aria-label="Chiudi">×</button>
    <h2 id="bs-auth-title">Accedi a BetStorm</h2>
    <p id="bs-auth-description" style="color:#a8b7c9;font-size:.88rem">Entra con il tuo account.</p>
    <form id="bs-auth-form">
      <label for="bs-auth-email">Email</label><input id="bs-auth-email" type="email" autocomplete="email" required maxlength="254"/>
      <div id="bs-auth-password-row"><label for="bs-auth-password">Password</label><input id="bs-auth-password" type="password" autocomplete="current-password" required minlength="6"/></div>
      <button class="bs-auth-primary" id="bs-auth-submit" type="submit">Accedi</button>
    </form>
    <div id="bs-auth-msg" role="status" aria-live="polite"></div>
    <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:10px">
      <button class="bs-auth-link" id="bs-auth-switch" type="button">Crea un account</button>
      <button class="bs-auth-link" id="bs-auth-reset" type="button">Password dimenticata?</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  let mode = 'login';
  let lastFocus = null;
  const title = modal.querySelector('#bs-auth-title');
  const desc = modal.querySelector('#bs-auth-description');
  const msg = modal.querySelector('#bs-auth-msg');
  const passwordRow = modal.querySelector('#bs-auth-password-row');
  const password = modal.querySelector('#bs-auth-password');
  const submit = modal.querySelector('#bs-auth-submit');
  const switchBtn = modal.querySelector('#bs-auth-switch');
  const resetBtn = modal.querySelector('#bs-auth-reset');
  function setMode(next) {
    mode = next;
    title.textContent = next === 'signup' ? 'Crea un account BetStorm' : next === 'reset' ? 'Recupera la password' : 'Accedi a BetStorm';
    desc.textContent = next === 'signup' ? 'Registrazione gratuita. Potrebbe essere richiesta la conferma via email.' : next === 'reset' ? 'Ti invieremo un link per reimpostare la password.' : 'Entra con il tuo account.';
    passwordRow.hidden = next === 'reset';
    password.required = next !== 'reset';
    password.autocomplete = next === 'signup' ? 'new-password' : 'current-password';
    submit.textContent = next === 'signup' ? 'Registrati' : next === 'reset' ? 'Invia link di recupero' : 'Accedi';
    switchBtn.textContent = next === 'login' ? 'Crea un account' : 'Torna ad Accedi';
    resetBtn.hidden = next !== 'login';
    msg.textContent = '';
  }
  function openModal() {
    lastFocus = document.activeElement;
    setMode('login'); modal.hidden = false;
    document.body.style.overflow = 'hidden';
    modal.querySelector('#bs-auth-email').focus();
  }
  function closeModal() {
    modal.hidden = true; document.body.style.overflow = '';
    if (lastFocus?.isConnected) lastFocus.focus();
  }
  document.addEventListener('click', e => {
    const link = e.target.closest('a[data-auth-cta]');
    if (link && !currentUser) { e.preventDefault(); openModal(); }
  });
  modal.querySelector('#bs-auth-close').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });
  switchBtn.addEventListener('click', () => setMode(mode === 'login' ? 'signup' : 'login'));
  resetBtn.addEventListener('click', () => setMode('reset'));
  modal.querySelector('#bs-auth-form').addEventListener('submit', async e => {
    e.preventDefault();
    if (!sbClient) { msg.textContent = 'Servizio di accesso non disponibile. Ricarica la pagina.'; return; }
    const email = modal.querySelector('#bs-auth-email').value.trim();
    const pass = password.value;
    submit.disabled = true; msg.textContent = 'Attendere...';
    try {
      if (mode === 'signup') {
        const { data, error } = await sbClient.auth.signUp({ email, password: pass, options: { emailRedirectTo: 'https://www.betstorm.it/' } });
        if (error) throw error;
        if (data.session) { window.location.assign('/dashboard.html'); return; }
        msg.textContent = 'Se previsto, controlla la casella email e conferma la registrazione. Poi torna qui per accedere.';
      } else if (mode === 'reset') {
        const { error } = await sbClient.auth.resetPasswordForEmail(email, { redirectTo: 'https://www.betstorm.it/' });
        if (error) throw error;
        msg.textContent = 'Se l’indirizzo è registrato, riceverai un’email con le istruzioni.';
      } else {
        const { data, error } = await sbClient.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        if (!data.session) throw new Error('Sessione non disponibile. Verifica la conferma email.');
        window.location.assign('/dashboard.html');
      }
    } catch (err) {
      msg.textContent = err?.message || 'Operazione non riuscita. Riprova.';
    } finally { submit.disabled = false; }
  });
}

// --- Scroll reveal ---
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('hp-reveal--visible'); revealObs.unobserve(e.target); }
  });
}, { threshold: 0.1 });
document.querySelectorAll('.hp-reveal').forEach(el => revealObs.observe(el));

// --- Smooth scroll ---
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

// --- Outbound tracking ---
document.querySelectorAll('[data-outbound]').forEach(link => {
  link.addEventListener('click', () => {
    const label = link.dataset.outbound || link.href;
    if (typeof gtag === 'function') gtag('event', 'outbound_click', { event_label: label });
  });
});

// --- Init ---
setupAuthModal();
if (window.supabase) initAuth();
