/* PARTICIPANT MODE — mobile-first. Participants can only write their own player record, their team's single submission, and presence. */
import * as F from './firebase-service.js';
import {esc,qOf,tks,ranked,subs,players,boardH,anim,caseH,introH,explH,optsH,solH,kind,frac,GM,applyTheme,bannerH,ticker} from './game-engine.js';
let root,pin,room=null,sel=-1,draft='',lastQ='',lastKey='',nameV='',tsel=null,started=false,connected=true;
let ord=null,mt=null,perm=null;
const $=s=>document.querySelector(s),toast=m=>{const e=$('#toast');e.textContent=m;e.classList.add('on');setTimeout(()=>e.classList.remove('on'),2600)};
const msg=h=>root.innerHTML=`<div class="pw"><section class="card hero">${h}</section></div>`;

export async function run(r,p){root=r;pin=p||localStorage.getItem('ma.p');
  if(pin){const x=await F.get('rooms/'+pin).catch(()=>null);if(x&&x.status!=='closed'&&x.players&&x.players[F.uid])return enter(pin)}
  join(p||'')}
function join(p=''){root.innerHTML=`<div class="pw"><section class="card setup"><p class="kick">JOIN A GAME</p><h2>Enter Game PIN</h2><input id="pin" type="text" inputmode="numeric" maxlength="6" placeholder="6-digit PIN" value="${esc(p)}"><input id="nm" type="text" maxlength="20" placeholder="Your display name"><p id="err" class="err"></p><button class="btn pri" onclick="P.find()">Find game →</button></section></div>`}
async function find(){const p=$('#pin').value.trim(),n=$('#nm').value.trim(),e=m=>$('#err').textContent=m;
  if(!/^\d{6}$/.test(p))return e('Enter the 6-digit PIN.');if(!n)return e('Enter your name.');
  const x=await F.get('rooms/'+p).catch(()=>null);
  if(!x||x.status==='closed'||F.now()-x.created>864e5)return e('Game not found or closed.');
  if(x.status!=='lobby'||!x.cfg.regOpen)return e('Registration is closed for this game.');
  if(players(x).some(q=>q.n.toLowerCase()===n.toLowerCase()))return e('That name is already taken. Choose another.');
  pin=p;nameV=n;room=x;tsel=null;teamPick()}
function teamPick(err=''){const pl=players(room);root.innerHTML=`<div class="pw"><section class="card setup"><p class="kick">HI ${esc(nameV).toUpperCase()}</p><h2>Choose your team</h2><div class="chips">${tks(room).map(k=>{const t=room.cfg.teams[k];return `<button class="chip ${tsel===k?'on':''}" style="border-color:${t.c}" onclick="P.pickT('${k}')">${esc(t.n)} · ${pl.filter(x=>x.team===k).length}</button>`}).join('')}</div><p class="err">${err}</p><button class="btn pri" ${tsel?'':'disabled'} onclick="P.joinT()">JOIN TEAM</button></section></div>`}
async function joinT(){try{await F.set(`rooms/${pin}/players/${F.uid}`,{n:nameV,team:tsel,ts:F.now()});localStorage.setItem('ma.p',pin);enter(pin)}catch(e){teamPick('Could not join — registration may have just closed.')}}
function enter(p){pin=p;if(started)return;started=true;F.presence(p);F.onConn(c=>{connected=c;const e=$('#conn');if(e)e.hidden=c});F.watch('rooms/'+p,v=>{room=v;draw()});ticker(()=>room,F.now)}

function draw(){
  if(!room||room.status==='closed')return msg('<h2>Game closed</h2><p class="lead">The trainer ended this room.</p><button class="btn pri" onclick="P.leave()">Back</button>');
  const me=(room.players||{})[F.uid];
  if(!me)return msg('<h2>You are not in this game</h2><p class="lead">You may have been removed by the trainer.</p><button class="btn pri" onclick="P.leave()">Join again</button>');
  const st=room.st,key=st.qk+st.ph+room.status;
  if(document.activeElement&&document.activeElement.id==='rwt'&&key===lastKey)return;
  if(st.qk!==lastQ){sel=-1;draft='';ord=mt=perm=null;lastQ=st.qk}lastKey=key;
  applyTheme(GM(room).theme);const T=room.cfg.teams[me.team]||{n:'?',c:'#fff'},off=room.pres&&room.pres[room.host]===false;
  const body=room.status==='lobby'?lobbyV(me,T):room.status==='final'?finalV(me):liveV(me);
  root.innerHTML=`<div class="pw"><div id="conn" class="connbar" ${connected?'hidden':''}>Connection interrupted. Reconnecting...</div><header class="phead" style="border-color:${T.c}"><div><b>${esc(me.n)}</b><small>${esc(T.n)}${off?' · ⚠ trainer offline, game paused':''}</small></div><span class="sc" data-k="${me.team}">0</span></header>${body}${room.status==='lobby'?'':boardH(room,me.team)}</div>`;anim(root,room)}
function lobbyV(me,T){const pl=players(room),sw=room.cfg.switchOpen&&room.cfg.regOpen;
  return `<section class="card">${bannerH(GM(room))}<p class="kick">WAITING ROOM · PIN ${pin}</p><h2>Waiting for trainer…</h2><div class="expl"><div><small>YOUR TEAM — ${esc(T.n)}</small>${pl.filter(p=>p.team===me.team).map(p=>esc(p.n)+(p.id===F.uid?' (you)':'')).join(', ')}</div></div><div class="stats">${tks(room).map(k=>{const t=room.cfg.teams[k];return `<div style="border-left:5px solid ${t.c}"><small>${esc(t.n)}</small><b>${pl.filter(p=>p.team===k).length} players</b>${sw&&k!==me.team?`<br><button class="btn sm" onclick="P.sw('${k}')">Switch here</button>`:''}</div>`}).join('')}</div></section>`}
const shuf=n=>{const a=[...Array(n).keys()];for(let i=n-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}if(n>1&&a.every((v,i)=>v===i))[a[0],a[1]]=[a[1],a[0]];return a};
function inputH(q,sb){const k=kind(q);
 if(k==='text')return `<textarea id="rwt" maxlength="200" ${sb?'disabled':''} oninput="P.draft(this.value)" placeholder="Type your team's answer…">${esc(sb?sb.a:draft)}</textarea>`;
 if(k==='choice')return optsH(q,{sel:sb?sb.a:sel,click:sb?'':'P.pickO'});
 if(k==='rank'){ord=ord||shuf(q.o.length);const O=sb?Object.values(sb.a):ord;return `<div class="opts" style="grid-template-columns:1fr">${O.map((o,i)=>`<div class="opt"><b>${i+1}</b><span>${esc(q.o[o])}</span>${sb?'':`<button class="btn sm" aria-label="Move up" onclick="P.mv(${i},-1)">▲</button><button class="btn sm" aria-label="Move down" onclick="P.mv(${i},1)">▼</button>`}</div>`).join('')}</div>`}
 perm=perm||shuf(q.p.length);mt=mt||q.p.map(()=>-1);const M=sb?Object.values(sb.a):mt;
 return `<div class="expl">${q.p.map((p,i)=>`<div><small>${esc(p[0])}</small><select ${sb?'disabled':''} onchange="P.mt(${i},+this.value)"><option value="-1">Choose…</option>${perm.map(j=>`<option value="${j}" ${M[i]===j?'selected':''}>${esc(q.p[j][1])}</option>`).join('')}</select></div>`).join('')}</div>`}
function liveV(me){const q=qOf(room),st=room.st,sb=subs(room)[me.team],k=kind(q),tm='<div class="timer"><span class="tm">0:00</span></div>';
  if(st.ph==='intro')return introH(q);
  if(st.ph==='case')return `<section class="card">${caseH(q)}${tm}<p class="lead">Discuss with your team. ${k==='choice'?'Options appear when the trainer opens them.':'Answers open soon.'}</p></section>`;
  if(st.ph==='answer')return `<section class="card">${caseH(q)}${tm}${inputH(q,sb)}<div class="banner n">${sb?'🔒 Submitted · Answer locked'+(sb.n?' (by '+esc(sb.n)+')':''):'Not submitted'}</div>${sb?'':'<button class="btn pri" onclick="P.submit()">Submit team answer</button>'}</section>`;
  const f=sb?frac(q,sb.a):0;
  return `<section class="card">${caseH(q)}${k==='choice'?optsH(q,{reveal:true,mine:sb?sb.a:null}):solH(q)}<div class="banner ${!sb||k==='text'?'n':f===1?'ok':f>0?'n':'bad'}">${!sb?'⏳ Your team did not submit':k==='text'?'✍️ Submitted: '+esc(sb.a)+' — trainer awards points':f===1?'✅ Correct!':f>0?'🟡 Partly correct ('+Math.round(f*100)+'%)':'❌ Not this time'}</div>${explH(q)}</section>`}
function finalV(me){const rk=ranked(room),pos=rk.findIndex(t=>t.k===me.team)+1,ps=(g=>g.pass?(rk[pos-1].s>=g.pass?' · ✅ Passing score reached':' · Passing score: '+g.pass):'')(GM(room));return `<section class="card hero"><p class="kick">GAME OVER</p><div class="win">🏆 ${esc(rk[0].n)}</div><p class="lead">Your team finished #${pos}${ps}</p></section>${boardH(room,me.team)}<section class="card hero"><h2>What is one key takeaway you will apply after today?</h2></section>`}

async function submit(){const q=qOf(room),me=room.players[F.uid],k=kind(q);let a;
  if(k==='text')a=draft.trim().slice(0,200);else if(k==='choice')a=sel;else if(k==='rank')a=ord;else a=mt;
  if(k==='text'?!a:k==='choice'?a<0:k==='match'?(!a||a.includes(-1)):!a)return toast('Complete your answer first');
  try{await F.set(`rooms/${pin}/subs/${room.st.qk}/${me.team}`,{a,by:F.uid,n:me.n,ts:F.now()})}catch(e){toast('Your team already answered, or answers are closed.')}}
async function sw(k){const me=room.players[F.uid];try{await F.set(`rooms/${pin}/players/${F.uid}`,{n:me.n,team:k,ts:me.ts})}catch(e){toast('Team switching is closed.')}}
window.P={find,pickT:k=>{tsel=k;teamPick()},joinT,pickO:k=>{sel=k;draw()},mv:(i,d)=>{if(ord&&ord[i+d]!=null){[ord[i],ord[i+d]]=[ord[i+d],ord[i]];draw()}},mt:(i,v)=>{mt[i]=v},draft:v=>draft=v,submit,sw,leave:()=>{localStorage.removeItem('ma.p');location.href=location.pathname}};
