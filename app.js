import * as F from './firebase-service.js';
const app=document.getElementById('app');let ready=null,lb=null;
const card=h=>app.innerHTML=`<div class="wrap one"><section class="card hero">${h}</section></div>`;
function logoutBtn(){if(lb)lb.remove();lb=document.createElement('button');lb.className='btn sm';lb.style.cssText='position:fixed;left:12px;bottom:12px;z-index:50;opacity:.85';
  const n=F.user&&(F.user.displayName||F.user.email)||'';lb.textContent='Log out'+(n?' ('+n.split(' ')[0]+')':'');
  lb.onclick=async()=>{if(!confirm('Log out? If a game room is running, close it first.'))return;await F.logout();location.href=location.pathname};document.body.appendChild(lb)}
async function startTrainer(){
  /* give each new trainer account the Mindset template once per browser; existing accounts are not re-seeded */
  const k='ma.seeded.'+F.uid;if(localStorage.getItem(k))localStorage.setItem('ma.seed','1');else localStorage.removeItem('ma.seed');localStorage.setItem(k,'1');
  logoutBtn();(await import('./trainer.js')).run(app)}
async function go(role,pin){
  if(!F.configured)return card('<h2>Firebase is not configured</h2><p class="lead">Open <b>firebase-config.js</b> and paste your Firebase web-app config (see README). Multiplayer cannot run without it.</p><a class="btn" href="local.html">Use single-screen mode instead</a>');
  try{await (ready||(ready=F.init()))}catch(e){ready=null;return card(`<h2>Could not connect</h2><p class="lead">${e.message}. Check firebase-config.js and the sign-in methods in Firebase Console.</p>`)}
  if(role==='host'){
    if(F.isTrainer())return startTrainer();
    return (await import('./auth.js')).show(app,startTrainer)}
  try{await F.ensureAnon()}catch(e){return card(`<h2>Could not join</h2><p class="lead">${e.message}. Make sure Anonymous sign-in is enabled in Firebase Console.</p>`)}
  (await import('./participant.js')).run(app,pin)}
window.Go=go;
const pin=new URLSearchParams(location.search).get('pin');
if(pin||localStorage.getItem('ma.p'))go('join',pin||'');
else if(localStorage.getItem('ma.h')||localStorage.getItem('ma.t'))go('host');
else card(`<h1 class="logo" style="font-size:2.4rem">MINDSET <b>ARENA</b></h1><p class="lead">Change Your Thinking. Change Your Game.</p><div class="row" style="justify-content:center"><button class="btn pri" onclick="Go('host')">HOST A GAME</button><button class="btn pri" onclick="Go('join','')">JOIN A GAME</button></div><p><a href="local.html" style="color:var(--m)">Single-screen mode (no Firebase)</a></p>`);
