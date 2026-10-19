const crypto = require('node:crypto');
const ADMIN = process.env.NEWSLETTER_ADMIN_UID;
const BASE = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const dbHeaders = () => ({ apikey:KEY, Authorization:`Bearer ${KEY}`, 'Content-Type':'application/json' });
const db = async (path, opts={}) => { const r=await fetch(`${BASE}/rest/v1/${path}`,{...opts,headers:{...dbHeaders(),...(opts.headers||{})}});const raw=await r.text();if(!r.ok)throw Error(`Database ${r.status}: ${raw.slice(0,180)}`);if(!raw.trim())return [];try{return JSON.parse(raw)}catch{throw Error(`Risposta JSON Supabase non valida (HTTP ${r.status})`)} };
function escape(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function authorize(req){
 const match=/^Bearer\s+(.+)$/i.exec(req.headers.authorization||'');if(!match) return false;
 const r=await fetch(`${BASE}/auth/v1/user`,{headers:{apikey:KEY,Authorization:`Bearer ${match[1]}`}});
 if(!r.ok)return false;const user=await r.json();return user.id===ADMIN;
}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
 if(req.method!=='POST')return res.status(405).json({error:'Metodo non consentito'});
 if(!BASE||!KEY||!ADMIN||!process.env.RESEND_NEWSLETTER_API_KEY)return res.status(503).json({error:'Configurazione incompleta'});
 try{
  if(!await authorize(req))return res.status(403).json({error:'Accesso amministratore non autorizzato. Accedi nuovamente a BetStorm se il token è scaduto.'});
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
  if(body.action==='status'){
   const rows=await db('newsletter?select=id&confirmed=eq.true&unsubscribed=eq.false');
   return res.status(200).json({count:rows.length});
  }
  if(body.action!=='send')return res.status(400).json({error:'Azione non valida'});
  const {subject,message,campaignId}=body;
  if(typeof subject!=='string'||!subject.trim()||subject.length>180||typeof message!=='string'||!message.trim()||message.length>12000||typeof campaignId!=='string'||!/^[0-9a-f-]{36}$/i.test(campaignId))return res.status(400).json({error:'Campagna o contenuto non valido'});
  const recipients=await db('newsletter?select=id,email&confirmed=eq.true&unsubscribed=eq.false&limit=41');
  if(recipients.length>40)return res.status(400).json({error:'Limite di sicurezza: massimo 40 destinatari per campagna in questa prima versione.'});
  // Durable campaign record: a retry with the same ID cannot send twice.
  const campaign=await db('newsletter_campaigns?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify([{id:campaignId,subject:subject.trim(),message:message.trim()}])});
  if(campaign.length!==1)return res.status(409).json({error:'Questa campagna esiste già: invio duplicato bloccato'});
  let sent=0,failed=0;
  for(const recipient of recipients){
   const token=crypto.randomBytes(32).toString('hex');
   const deliveryPath=`newsletter_campaign_deliveries?campaign_id=eq.${encodeURIComponent(campaignId)}&newsletter_id=eq.${encodeURIComponent(recipient.id)}`;
   let deliveryCreated=false;
   let resendAccepted=false;
   try{
    // A unique campaign/recipient row must exist before any email is attempted.
    await db('newsletter_campaign_deliveries',{
     method:'POST',
     body:JSON.stringify({campaign_id:campaignId,newsletter_id:recipient.id,status:'pending'})
    });
    deliveryCreated=true;
    // Save the unsubscribe token before sending the email.
    await db('newsletter_unsubscribe_tokens',{
     method:'POST',
     body:JSON.stringify({newsletter_id:recipient.id,token_hash:sha(token)})
    });
    const url=`https://www.betstorm.it/api/newsletter-unsubscribe?token=${token}`;
    const html=`<div style="font-family:Arial,sans-serif;line-height:1.7;color:#17212b"><h2>${escape(subject)}</h2><div style="white-space:pre-wrap">${escape(message)}</div><hr><p style="font-size:12px">BetStorm · Contenuti informativi · 18+<br><a href="${url}">Disiscriviti dalla newsletter</a></p></div>`;
    // Mark as sending BEFORE contacting Resend. Never retry automatically.
    await db(deliveryPath,{
     method:'PATCH',
     body:JSON.stringify({status:'sending',attempts:1,updated_at:new Date().toISOString()})
    });
    const r=await fetch('https://api.resend.com/emails',{
     method:'POST',
     headers:{Authorization:`Bearer ${process.env.RESEND_NEWSLETTER_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`${campaignId}-${recipient.id}`},
     body:JSON.stringify({from:'BetStorm <newsletter@betstorm.it>',to:[recipient.email],subject:subject.trim(),html,text:`${message.trim()}\n\nBetStorm · 18+\nDisiscriviti: ${url}`})
    });
    const raw=await r.text();
    if(!r.ok)throw Error(`Resend ${r.status}: ${raw.slice(0,180)}`);
    resendAccepted=true;
    sent++;
    let resendId=null;
    try{resendId=JSON.parse(raw).id||null}catch{}
    try{
     await db(deliveryPath,{
      method:'PATCH',
      body:JSON.stringify({status:'sent',resend_email_id:resendId,sent_at:new Date().toISOString(),updated_at:new Date().toISOString()})
     });
    }catch(logError){
     // Resend accepted the email: do not count it as a failed send or resend it.
     console.error('[newsletter-admin] delivery log update failed',recipient.id,logError.message);
    }
   }catch(e){
    if(!resendAccepted)failed++;
    console.error('[newsletter-admin] send failed',recipient.id,e.message);
    if(deliveryCreated){
     try{
      await db(deliveryPath,{
       method:'PATCH',
       body:JSON.stringify({status:'failed',error_message:String(e.message).slice(0,500),updated_at:new Date().toISOString()})
      });
     }catch(logError){console.error('[newsletter-admin] failure log update failed',recipient.id,logError.message)}
    }
   }
  }
  await db(`newsletter_campaigns?id=eq.${encodeURIComponent(campaignId)}`,{method:'PATCH',body:JSON.stringify({sent,failed,completed_at:new Date().toISOString()})});
  return res.status(200).json({sent,failed});
 }catch(e){console.error('[newsletter-admin]',e.message);return res.status(503).json({error:'Operazione non riuscita. Controlla i log Vercel.'})}
};
