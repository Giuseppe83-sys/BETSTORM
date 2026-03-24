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
  } catch (e) {
    console.warn('Supabase init:', e.message);
  }
}

// --- Update CTAs based on auth state ---
function updateCTAs(loggedIn) {
  document.querySelectorAll('[data-auth-cta]').forEach(el => {
    if (loggedIn) {
      el.textContent = 'Vai alla Dashboard';
      el.href = '/dashboard.html';
      el.onclick = null;
    }
  });
  // Hide register buttons, show dashboard
  document.querySelectorAll('[data-auth-hide]').forEach(el => {
    if (loggedIn) el.style.display = 'none';
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
if (window.supabase) initAuth();
