# 🌪️ BetStorm v2 — Guida Completa Setup

## 📁 Struttura del progetto

```
betstorm/
├── index.html              ← Sito completo (frontend)
├── teams.js                ← Database squadre (Serie A, PL, La Liga, CL)
├── vercel.json             ← Config Vercel (routing, headers)
├── package.json            ← Dipendenze Node (Stripe, Supabase)
├── robots.txt              ← SEO
├── sitemap.xml             ← SEO sitemap
├── .gitignore
├── api/
│   ├── create-checkout.js  ← Serverless: crea sessione Stripe
│   └── stripe-webhook.js   ← Serverless: gestisce eventi Stripe
└── README.md
```

---

## 🔧 STEP 1 — Supabase (Database + Auth)

1. Vai su **supabase.com** → crea progetto gratuito
2. Vai su **SQL Editor** → incolla tutto il contenuto di `supabase-schema.sql` → esegui
3. Vai su **Settings → API** e copia:
   - `Project URL` → es. `https://abcdef.supabase.co`
   - `anon public key` → es. `eyJhbGci...`
4. In `index.html` sostituisci le righe:
   ```js
   const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
   const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
   ```
5. In Supabase → **Authentication → URL Configuration** imposta:
   - Site URL: `https://betstorm.com`
   - Redirect URLs: `https://betstorm.com/*`

---

## 💳 STEP 2 — Stripe (Pagamenti)

1. Vai su **stripe.com** → accedi al tuo account
2. Vai su **Products** → crea 4 prodotti con prezzi ricorrenti:

| Prodotto | Tipo | Prezzo | Copia il Price ID |
|----------|------|--------|-------------------|
| BetStorm Pro | Mensile | €9.99/mese | `price_xxx` |
| BetStorm Pro | Annuale | €83.88/anno | `price_xxx` |
| BetStorm Elite | Mensile | €24.99/mese | `price_xxx` |
| BetStorm Elite | Annuale | €209.88/anno | `price_xxx` |

3. In Stripe → **Webhooks** → aggiungi endpoint:
   - URL: `https://betstorm.com/api/stripe-webhook`
   - Eventi: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
   - Copia il **Webhook Secret**: `whsec_...`

---

## 🚀 STEP 3 — Vercel (Deploy)

1. Vai su **vercel.com** → Import Git Repository → seleziona `betstorm`
2. Framework: **Other**
3. Prima di deployare, vai su **Environment Variables** e aggiungi:

| Nome variabile | Valore |
|----------------|--------|
| `STRIPE_SECRET_KEY` | `sk_live_...` (o `sk_test_...` per test) |
| `STRIPE_PRICE_PRO` | `price_...` |
| `STRIPE_PRICE_PRO_ANNUAL` | `price_...` |
| `STRIPE_PRICE_ELITE` | `price_...` |
| `STRIPE_PRICE_ELITE_ANNUAL` | `price_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |
| `SUPABASE_URL` | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | `eyJ...` (service_role key) |
| `NEXT_PUBLIC_SITE_URL` | `https://betstorm.com` |

4. Clicca **Deploy** ✅

---

## 🌐 STEP 4 — Dominio

1. In Vercel → **Settings → Domains** → aggiungi `betstorm.com`
2. Vercel ti dà 2 record DNS → aggiungili su Namecheap/GoDaddy
3. Attendi 10-30 minuti → HTTPS attivo automaticamente 🔒

---

## ✅ Test finale

- [ ] Registra un account su `betstorm.com`
- [ ] Verifica che arrivi email di conferma
- [ ] Clicca "Attiva Pro" → verifica redirect a Stripe
- [ ] Usa card test Stripe: `4242 4242 4242 4242`
- [ ] Verifica che in Supabase il piano venga aggiornato a `pro`
- [ ] Testa il tool analisi con squadre reali

---

## 🔄 Aggiornamenti futuri

Ogni volta che modifichi un file su GitHub → Vercel ri-deploya **automaticamente** in 20 secondi.

---

## ⚠️ Disclaimer legale

BetStorm è una piattaforma di analisi statistica a scopo informativo.
Il gioco d'azzardo è vietato ai minori di 18 anni. Gioca responsabilmente.

---
© 2025 BetStorm
