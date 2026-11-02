import {init,configured} from './firebase-service.js';
const app=document.getElementById('app');let ready=null;
const card=h=>app.innerHTML=`<div class="wrap one"><section class="card hero">${h}</section></div>`;
async function go(role,pin){
  if(!configured)return card('<h2>Firebase is not configured</h2><p class="lead">Open <b>firebase-config.js</b> and paste your Firebase web-app config (see README). Multiplayer cannot run without it.</p><a class="btn" href="local.html">Use single-screen mode instead</a>');
  try{await (ready||(ready=init()))}catch(e){ready=null;return card(`<h2>Could not connect</h2><p class="lead">${e.message}. Check firebase-config.js and that Anonymous sign-in is enabled.</p>`)}
  const m=await import(role==='host'?'./trainer.js':'./participant.js');m.run(app,pin);
}
window.Go=go;
const pin=new URLSearchParams(location.search).get('pin');
if(pin||localStorage.getItem('ma.p'))go('join',pin||'');
else if(localStorage.getItem('ma.h'))go('host');
else card(`<h1 class="logo" style="font-size:2.4rem">MINDSET <b>ARENA</b></h1><p class="lead">Change Your Thinking. Change Your Game.</p><div class="row" style="justify-content:center"><button class="btn pri" onclick="Go('host')">HOST A GAME</button><button class="btn pri" onclick="Go('join','')">JOIN A GAME</button></div><p><a href="local.html" style="color:var(--m)">Single-screen mode (no Firebase)</a></p>`);
