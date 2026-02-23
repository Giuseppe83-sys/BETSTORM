// ============================================================
// BETSTORM — Cookie Banner GDPR
// Aggiungere in index.html prima di </body>:
// <script src="cookie-banner.js"></script>
// ============================================================

(function() {
  const COOKIE_KEY = 'betstorm_cookie_consent';

  // Se già accettato non mostrare
  if (localStorage.getItem(COOKIE_KEY)) return;

  const style = document.createElement('style');
  style.textContent = `
    #cookie-banner {
      position: fixed;
      bottom: 24px;
      left: 24px;
      right: 24px;
      max-width: 560px;
      background: #111820;
      border: 1px solid rgba(0,230,118,.2);
      border-radius: 16px;
      padding: 24px 28px;
      z-index: 9998;
      box-shadow: 0 20px 60px rgba(0,0,0,.6);
      animation: slideUpCookie .4s cubic-bezier(.34,1.56,.64,1);
      font-family: 'DM Sans', sans-serif;
    }
    @keyframes slideUpCookie {
      from { opacity:0; transform:translateY(40px); }
      to   { opacity:1; transform:translateY(0); }
    }
    #cookie-banner.hide {
      animation: slideDownCookie .3s ease forwards;
    }
    @keyframes slideDownCookie {
      to { opacity:0; transform:translateY(40px); }
    }
    #cookie-banner h4 {
      font-family: 'Syne', sans-serif;
      font-size: 1rem;
      font-weight: 700;
      color: #e8edf5;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    #cookie-banner p {
      font-size: .82rem;
      color: #6b7a8d;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    #cookie-banner a {
      color: #00e676;
      text-decoration: none;
    }
    .cookie-btns {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .cookie-accept {
      flex: 2;
      padding: 10px 20px;
      background: linear-gradient(135deg, #00e676, #00c853);
      color: #070a0f;
      border: none;
      border-radius: 8px;
      font-family: 'Syne', sans-serif;
      font-weight: 700;
      font-size: .875rem;
      cursor: pointer;
      transition: all .2s;
    }
    .cookie-accept:hover { transform: translateY(-1px); box-shadow: 0 0 20px rgba(0,230,118,.4); }
    .cookie-reject {
      flex: 1;
      padding: 10px 16px;
      background: transparent;
      color: #6b7a8d;
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 8px;
      font-family: 'DM Sans', sans-serif;
      font-size: .875rem;
      cursor: pointer;
      transition: all .2s;
    }
    .cookie-reject:hover { border-color: rgba(255,255,255,.2); color: #e8edf5; }
    .cookie-settings {
      flex: 1;
      padding: 10px 16px;
      background: transparent;
      color: #6b7a8d;
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 8px;
      font-family: 'DM Sans', sans-serif;
      font-size: .875rem;
      cursor: pointer;
      transition: all .2s;
    }
    .cookie-settings:hover { border-color: #00e676; color: #00e676; }
  `;
  document.head.appendChild(style);

  const banner = document.createElement('div');
  banner.id = 'cookie-banner';
  banner.innerHTML = `
    <h4>🍪 Utilizziamo i cookie</h4>
    <p>
      BetStorm usa cookie tecnici e analitici (Google Analytics) per migliorare la tua esperienza.
      Puoi accettare tutti i cookie o solo quelli necessari.
      Leggi la nostra <a href="/privacy-policy.html">Privacy Policy</a> e la <a href="/cookie-policy.html">Cookie Policy</a>.
    </p>
    <div class="cookie-btns">
      <button class="cookie-accept" id="cookie-accept">✅ Accetta tutti</button>
      <button class="cookie-settings" id="cookie-settings">⚙️ Preferenze</button>
      <button class="cookie-reject" id="cookie-reject">Solo necessari</button>
    </div>
  `;
  document.body.appendChild(banner);

  function closeBanner(accepted) {
    localStorage.setItem(COOKIE_KEY, accepted ? 'all' : 'necessary');
    banner.classList.add('hide');
    setTimeout(() => banner.remove(), 400);

    // Se rifiutati disabilita GA
    if (!accepted && window.gtag) {
      window['ga-disable-G-ZD36ZG3X5N'] = true;
    }
  }

  document.getElementById('cookie-accept').onclick = () => closeBanner(true);
  document.getElementById('cookie-reject').onclick  = () => closeBanner(false);
  document.getElementById('cookie-settings').onclick = () => {
    // Semplice toggle — in futuro si può espandere
    closeBanner(false);
  };
})();
