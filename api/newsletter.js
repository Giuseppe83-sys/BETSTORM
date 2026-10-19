const crypto = require('node:crypto');
const BASE = 'https://betstorm.it';
const hash = token => crypto.createHash('sha256').update(token).digest('hex');
const token = () => crypto.randomBytes(32).toString('hex');
const escapeHtml = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const page = (title,message) => `<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} — BetStorm</title><body style="background:#08130e;color:#e9f8ed;font:16px system-ui;text-align:center;padding:12vh 20px"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><a style="color:#00e676" href="${BASE}">Torna a BetStorm</a></body></html>`;
const reply = (res,status,title,message) => res.status(status).setHeader('Content-Type','text/html; charset=utf-8').send(page(title,message));
const json = (res,status,body) => res.status(status).setHeader('Cache-Control','no-store').json(body);
async function db(path, opts={}) {
 const url=process.env.SUPABASE_URL || 'https://zvftggieqlxujjtotvwg.supabase.co';
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key) throw Error('Missing SUPABASE_SERVICE_ROLE_KEY');
 const response=await fetch(`${url}/rest/v1/${path}`,{...opts,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',...(opts.headers||{})}});
 const body=await response.text();
 if(!response.ok) throw Error(`Supabase ${response.status}: ${body.slice(0,250)}`);
 return body ? JSON.parse(body) : null;
}
module.exports=async function handler(req,res){
 try {
  if(req.method==='POST'){
   const email=String(req.body?.email||'').trim().toLowerCase();
   if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||req.body?.consent!==true) return json(res,400,{error:'Inserisci una email valida e accetta il consenso.'});
   const rows=await db(`newsletter?email=eq.${encodeURIComponent(email)}&select=id,confirmed,unsubscribed&limit=1`);
   // Generic response prevents revealing existing subscriptions.
   const generic={message:'Se l’indirizzo può essere iscritto, riceverai un link di conferma via email.'};
   if(rows?.[0]?.confirmed && !rows[0].unsubscribed) return json(res,200,generic);
   const raw=token(), now=new Date().toISOString(), expiry=new Date(Date.now()+24*3600*1000).toISOString();
   const fields={email,confirmed:false,confirmed_at:null,unsubscribed:false,unsubscribed_at:null,consent_at:now,confirmation_token_hash:hash(raw),confirmation_expires_at:expiry};
   if(rows?.length) await db(`newsletter?id=eq.${encodeURIComponent(rows[0].id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(fields)});
   else await db('newsletter',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(fields)});
   const key=process.env.RESEND_NEWSLETTER_API_KEY;
   if(!key) throw Error('Missing RESEND_NEWSLETTER_API_KEY');
   const link=`${BASE}/api/newsletter?action=confirm&token=${raw}`;
   const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from:'BetStorm <newsletter@betstorm.it>',to:[email],subject:'Conferma la tua iscrizione a BetStorm',html:`<p>Hai richiesto l'iscrizione alla newsletter BetStorm.</p><p><a href="${link}">Conferma la tua iscrizione</a></p><p>Il link scade dopo 24 ore. Se non hai fatto questa richiesta, ignora questa email.</p>`})});
   if(!r.ok) throw Error(`Resend ${r.status}: ${(await r.text()).slice(0,250)}`);
   return json(res,200,generic);
  }
  if(req.method==='GET'){
   const action=String(req.query?.action||'');
   const raw=String(req.query?.token||'');
   if(!['confirm','unsubscribe'].includes(action)||!/^[a-f0-9]{64}$/.test(raw)) return reply(res,400,'Link non valido','Il link non è valido.');
   const field=action==='confirm'?'confirmation_token_hash':'unsubscribe_token_hash';
   const rows=await db(`newsletter?${field}=eq.${hash(raw)}&select=id,confirmed,unsubscribed,confirmation_expires_at&limit=1`);
   const row=rows?.[0];
   if(!row) return reply(res,400,'Link non valido','Il link è scaduto o è già stato utilizzato.');
   if(action==='confirm'){
    if(!row.confirmation_expires_at || Date.parse(row.confirmation_expires_at)<Date.now()) return reply(res,400,'Link scaduto','Ripeti l’iscrizione dalla homepage per ricevere un nuovo link.');
    const unsub=token();
    await db(`newsletter?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({confirmed:true,confirmed_at:new Date().toISOString(),confirmation_token_hash:null,confirmation_expires_at:null,unsubscribe_token_hash:hash(unsub)})});
    // The unsubscribe link must be stored in the email sent in future newsletter campaigns; it cannot be reconstructed from its hash.
    // A stable unsubscribe link is emailed now to the subscriber.
    const emailRows=await db(`newsletter?id=eq.${encodeURIComponent(row.id)}&select=email&limit=1`);
    const email=emailRows?.[0]?.email;
    if(email){
     const link=`${BASE}/api/newsletter?action=unsubscribe&token=${unsub}`;
     const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_NEWSLETTER_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:'BetStorm <newsletter@betstorm.it>',to:[email],subject:'Iscrizione BetStorm confermata',html:`<p>La tua iscrizione alla newsletter BetStorm è confermata.</p><p>Conserva questo messaggio per <a href="${link}">annullare l’iscrizione</a> quando vuoi.</p>`})});
     if(!r.ok) console.error('Welcome email error',r.status);
    }
    return reply(res,200,'Iscrizione confermata','Grazie! La tua email è stata confermata.');
   }
   await db(`newsletter?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({unsubscribed:true,unsubscribed_at:new Date().toISOString(),unsubscribe_token_hash:null})});
   return reply(res,200,'Disiscrizione completata','Non riceverai più la newsletter BetStorm.');
  }
  res.setHeader('Allow','GET, POST');return json(res,405,{error:'Metodo non consentito'});
 } catch(err){console.error('Newsletter endpoint',err);if(req.method==='GET')return reply(res,500,'Errore temporaneo','Riprova più tardi.');return json(res,500,{error:'Servizio temporaneamente non disponibile. Riprova più tardi.'});}
};
