/* TRAINER MODE — the only client that writes st/sc/rv/aw/cfg. Enforced server-side: only rooms/$pin/host may write those paths (database.rules.json). */
import * as F from './firebase-service.js';
import {COL,esc,list,qOf,tks,players,subs,ranked,left,scoreReveal,boardH,anim,caseH,introH,explH,optsH,solH,kind,frac,GM,ansT,applyTheme,bannerH,builtin,newGame,gameIssues,finalize,ticker} from './game-engine.js';
import * as BD from './builder.js';
let root,pin,room=null,connected=true,started=false,HG=null,LIB={},autoQ='';
const cd={n:4,names:['Team Alpha','Team Beta','Team Gamma','Team Delta','Team Epsilon','Team Zeta'],col:[...COL],rounds:4,disc:90,ans:45,sw:true};
const $=s=>document.querySelector(s),B=()=>`rooms/${pin}/`;

export async function run(r){root=r;const p=localStorage.getItem('ma.h');
  if(p){const x=await F.get('rooms/'+p).catch(()=>null);if(x&&x.host===F.uid&&x.status!=='closed')return open(p)}
  localStorage.removeItem('ma.h');library()}
const norm=g=>{g=JSON.parse(JSON.stringify(g));g.R=g.R||[];g.Q=g.Q||[];g.pts=g.pts||{correct:100,speed:0,pen:0,manual:100};g.theme=g.theme||{p:'#a855f7',s:'#22d3ee',bg:'glow'};return g};
const gid=()=>'g'+Date.now().toString(36)+(Math.random()*1e3|0),exitB=(a,g)=>a==='host'?setup(g):library();
async function library(){root.innerHTML='<div class="wrap one"><section class="card hero"><h2>Loading your games…</h2></section></div>';applyTheme();
  let L=await F.get('games/'+F.uid).catch(()=>null);
  if(!L&&!localStorage.getItem('ma.seed')){const b=builtin();b.status='published';b.updated=F.now();await F.set('games/'+F.uid+'/mindset',b).catch(()=>{});localStorage.setItem('ma.seed','1');L=await F.get('games/'+F.uid).catch(()=>null)}
  LIB=L||{};const ids=Object.keys(LIB).sort((a,b)=>(LIB[b].updated||0)-(LIB[a].updated||0));
  root.innerHTML=`<div class="wrap one"><section class="card"><p class="kick">TRAINER</p><h1>My <span class="grad">Games</span></h1><div class="row"><button class="btn pri" onclick="H.newG()">＋ New game</button><button class="btn" onclick="H.seed()">＋ Add Mindset template</button></div><div class="tcols">${ids.map(id=>{const g=LIB[id];return `<div class="tcol" style="border-color:${esc((g.theme||{}).p||'#a855f7')}"><h3>${esc(g.title)}</h3><small>${esc(g.topic||'')} · ${(g.R||[]).length} rounds · ${(g.Q||[]).length} questions · ${g.status==='published'?'✅ Published':'📝 Draft'}</small><div class="row"><button class="btn sm pri" onclick="H.hostG('${id}')">Host</button><button class="btn sm" onclick="H.editG('${id}')">Edit</button><button class="btn sm" onclick="H.dupG('${id}')">Duplicate</button><button class="btn sm dng" onclick="H.delG('${id}')">Delete</button></div></div>`}).join('')||'<p class="lead">No games yet. Create one or add the Mindset template.</p>'}</div></section></div>`}
const newG=()=>BD.open(root,gid(),newGame(),exitB),editG=id=>BD.open(root,id,norm(LIB[id]),exitB);
async function dupG(id){const g=norm(LIB[id]);g.title+=' (copy)';g.status='draft';g.updated=F.now();await F.set('games/'+F.uid+'/'+gid(),g);library()}
async function delG(id){if(confirm('Delete "'+LIB[id].title+'"? This cannot be undone.')){await F.del('games/'+F.uid+'/'+id);library()}}
async function seed(){const b=builtin();b.status='published';b.updated=F.now();await F.set('games/'+F.uid+'/'+gid(),b);library()}
function hostG(id){const g=norm(LIB[id]),e=gameIssues(g);if(e.length)return alert('Fix these first:\n'+e.slice(0,6).join('\n'));setup(g)}
function setup(g){HG=g;applyTheme(g.theme);const seg=(k,a)=>`<div class="seg">${a.map(n=>`<button class="${cd[k]===n?'on':''}" onclick="H.cfg('${k}',${n})">${n}</button>`).join('')}</div>`;
  root.innerHTML=`<div class="wrap one"><section class="card setup"><p class="kick">HOST A SESSION</p><h1>${esc(g.title)}</h1><p class="lead">${g.R.length} rounds · ${g.Q.length} questions</p><div class="grid2"><div><label>Number of teams</label>${seg('n',[2,3,4,5,6])}<label>Team names &amp; colours</label>${Array.from({length:cd.n},(_,i)=>`<div class="row2"><input type="color" aria-label="Colour" value="${cd.col[i]}" oninput="H.col(${i},this.value)"><input type="text" maxlength="24" value="${esc(cd.names[i])}" oninput="H.nm(${i},this.value)"></div>`).join('')}</div><div><label>Discussion timer (s)</label><input type="number" min="10" max="600" value="${cd.disc}" oninput="cd_set('disc',this.value)"><label class="chk"><input type="checkbox" ${cd.sw?'checked':''} onchange="H.cfg('sw',this.checked,1)"> Allow team switching in the waiting room</label></div></div><div class="row"><button class="btn" onclick="H.lib()">← My Games</button><button class="btn pri" onclick="H.create()">Create game room →</button></div></section></div>`}
window.cd_set=(k,v)=>cd[k]=Math.max(10,+v||60);
async function create(){const snap=finalize(HG);let p;for(let i=0;i<8;i++){p=String(100000+Math.random()*900000|0);if(!(await F.get('rooms/'+p).catch(()=>1)))break}
  const teams={},sc={};for(let i=0;i<cd.n;i++){teams['t'+i]={n:(cd.names[i]||'').trim()||'Team '+(i+1),c:cd.col[i]};sc['t'+i]={s:0,ok:0,tot:0,done:0}}
  try{await F.set('rooms/'+p,{host:F.uid,status:'lobby',created:F.now(),game:snap,cfg:{teams,rounds:snap.R.length,disc:cd.disc,ans:snap.time||45,regOpen:true,switchOpen:cd.sw},st:{qi:0,qk:'q0',ph:'lobby',tm:{run:false,left:cd.disc}},sc});localStorage.setItem('ma.h',p);open(p)}catch(e){alert('Could not create room: '+e.message)}}
function open(p){pin=p;if(started)return;started=true;F.presence(p);F.onConn(c=>{connected=c;const e=$('#conn');if(e)e.hidden=c});F.watch('rooms/'+p,v=>{room=v;draw()});ticker(()=>room,F.now)}
const bar=()=>`<div id="conn" class="connbar" ${connected?'hidden':''}>Connection interrupted. Reconnecting...</div>`;
function draw(){if(!room||room.status==='closed'){localStorage.removeItem('ma.h');return root.innerHTML='<div class="wrap one"><section class="card hero"><h2>Room closed</h2><button class="btn pri" onclick="location.href=location.pathname">Home</button></section></div>'}
  applyTheme(GM(room).theme);if(room.status==='lobby')lobby();else live()}
function lobby(){const pl=players(room),url=location.origin+location.pathname+'?pin='+pin;let qr='';try{const g=qrcode(0,'M');g.addData(url);g.make();qr=g.createSvgTag(5,2)}catch(e){}
  root.innerHTML=`<div class="wrap one">${bar()}<section class="card">${bannerH(GM(room))}<div class="lob"><div class="qr">${qr||'QR unavailable'}</div><div><p class="kick">GAME PIN</p><p class="pin">${pin}</p><p class="lead">Join at <b>${esc(url)}</b></p><div class="row"><label class="chk"><input type="checkbox" ${room.cfg.regOpen?'checked':''} onchange="H.tg('regOpen',this.checked)"> Registration open</label><label class="chk"><input type="checkbox" ${room.cfg.switchOpen?'checked':''} onchange="H.tg('switchOpen',this.checked)"> Team switching</label></div></div></div>
<p class="kick" style="margin-top:18px">${pl.length} PLAYER${pl.length===1?'':'S'} IN THE WAITING ROOM</p><div class="tcols">${tks(room).map(k=>{const t=room.cfg.teams[k],m=pl.filter(p=>p.team===k);return `<div class="tcol" style="border-color:${t.c}"><h3 style="color:${t.c}">${esc(t.n)} · ${m.length}</h3>${m.map(p=>`<div class="mem"><span class="dot ${room.pres&&room.pres[p.id]?'on':''}"></span>${esc(p.n)}<select aria-label="Move ${esc(p.n)}" onchange="H.mv('${p.id}',this.value)">${tks(room).map(j=>`<option value="${j}" ${j===k?'selected':''}>${esc(room.cfg.teams[j].n)}</option>`).join('')}</select><button class="btn sm dng" aria-label="Remove" onclick="H.kick('${p.id}')">✕</button></div>`).join('')||'<small>No players yet</small>'}</div>`}).join('')}</div>
<div class="row"><button class="btn pri" ${pl.length?'':'disabled'} onclick="H.start()">START GAME →</button><button class="btn dng" onclick="H.close()">Close room</button></div></section></div>`}
function live(){const st=room.st,fin=room.status==='final',q=fin?null:qOf(room),ph=st.ph,L=list(room),last=st.qi===L.length-1,S=subs(room),aw=((room.aw||{})[st.qk])||{},g=GM(room),k0=q?kind(q):'';
  const nl={intro:'Start round →',case:k0==='choice'?'Show options →':'Open answers →',answer:'Reveal answer →',reveal:last?'Finish game 🏁':'Next →'}[ph];
  const tm='<div class="timer"><span class="tm">0:00</span><button class="btn tbtn" onclick="H.tt()">▶ Start</button></div>';
  const sol=!q||ph==='intro'||ph==='case'?'':k0==='choice'?optsH(q,{reveal:ph==='reveal'}):ph==='reveal'?solH(q):'';
  let stage;if(fin)stage=`<section class="card hero"><p class="kick">GAME OVER</p><div class="win">🏆 ${esc(ranked(room)[0].n)}</div><p class="lead">Participants see the same results. Use the closing reflection.</p><div class="row" style="justify-content:center"><button class="btn dng" onclick="H.close()">Close room</button></div></section>`;
  else if(ph==='intro')stage=introH(q);else stage=`<section class="card">${caseH(q)}${sol}${tm}${ph==='reveal'?explH(q):''}</section>`;
  const P0=q?(q.pts??(k0==='text'?g.pts.manual:g.pts.correct)):0,ex=g.pts.extras||[];
  const awb=(k,key,p,l)=>`<button class="btn sm" ${aw[k+'_'+key]?'disabled':''} onclick="H.aw('${k}','${key}',${p})">+${p} ${l}</button>`;
  const awd=k=>(k0==='text'?awb(k,'full',P0,'Full')+awb(k,'half',Math.round(P0/2),'Half'):'')+ex.map(e=>awb(k,e[0],e[1],esc(e[2]))).join('');
  const sd=s=>!s?'Not submitted':k0==='text'?'“'+esc(s.a)+'”':k0==='choice'?'Answered '+'ABCDEF'[s.a]:'Submitted'+(ph==='reveal'?' · '+Math.round(frac(q,s.a)*100)+'%':'');
  const subsP=fin?'':`<section class="card"><h3>TEAM SUBMISSIONS</h3>${tks(room).map(k=>{const t=room.cfg.teams[k],s=S[k];return `<div class="sub" style="border-color:${t.c}"><b>${esc(t.n)}</b><br><small>${sd(s)}${s&&s.n?' · '+esc(s.n):''}</small>${s&&ph==='answer'?`<br><button class="btn sm" onclick="H.rs('${k}')">Reset submission</button>`:''}${ph==='reveal'?'<br>'+awd(k):''}</div>`}).join('')}<label>Manual points</label><select id="mt">${tks(room).map(k=>`<option value="${k}">${esc(room.cfg.teams[k].n)}</option>`).join('')}</select><input id="ma" type="number" value="25"><div class="row"><button class="btn sm" onclick="H.man(1)">＋ Add</button><button class="btn sm" onclick="H.man(-1)">− Deduct</button></div></section>`;
  const keep=$('#mt')?[$('#mt').value,$('#ma').value]:null;
  root.innerHTML=`<div class="dash">${bar()}<header class="top"><div class="logo">${esc(g.title)}</div><div class="prog">PIN ${pin} · ${players(room).length} players${fin?'':' · Round '+(q.r+1)+' · Q '+(st.qi+1)+'/'+L.length}</div>${fin?'':`<div class="ctl"><button class="btn sm" onclick="H.go(${st.qi-1})">⏮ Prev</button><button class="btn sm" onclick="H.go(${st.qi+1})">⏭ Skip</button><button class="btn sm dng" onclick="H.end()">End game</button></div>`}</header><main>${stage}${fin?'':`<div class="row"><button class="btn pri" onclick="H.next()">${nl}</button></div>`}</main><aside>${boardH(room,null)}${subsP}</aside></div>`;
  if(keep&&$('#mt')){$('#mt').value=keep[0];$('#ma').value=keep[1]}anim(root,room);
  if(ph==='answer'&&q&&q.rvm==='auto'&&tks(room).every(k=>S[k])&&autoQ!==st.qk){autoQ=st.qk;setTimeout(reveal,700)}}

/* ---------- host actions ---------- */
const stSet=(ph,l,t0)=>F.upd({[B()+'st/ph']:ph,[B()+'st/tm']:{run:false,left:l},...(t0?{[B()+'st/t0']:F.now()}:{})});
function go(i){if(i<0)return;const L=list(room);if(i>=L.length)return end();const intro=i===0||L[i].r!==L[i-1].r,ph=(room.rv&&room.rv['q'+i])?'reveal':intro?'intro':'case';F.set(B()+'st',{qi:i,qk:'q'+i,ph,tm:{run:false,left:room.cfg.disc}})}
function reveal(){const qk=room.st.qk,u={};u[B()+'st/ph']='reveal';u[B()+'st/tm']={run:false,left:0};
  if(!(room.rv&&room.rv[qk])){u[B()+'rv/'+qk]=true;const r=scoreReveal(room);for(const k in r)for(const f of ['s','ok','tot','done'])u[B()+`sc/${k}/${f}`]=F.inc(r[k][f])}F.upd(u)}
function next(){const ph=room.st.ph;if(ph==='intro')stSet('case',room.cfg.disc);else if(ph==='case')stSet('answer',ansT(room,qOf(room)),1);else if(ph==='answer')reveal();else go(room.st.qi+1)}
function tt(){const t=room.st.tm,l=left(room,F.now());if(t.run)F.set(B()+'st/tm',{run:false,left:l});else{const x=l>0?l:(room.st.ph==='answer'?ansT(room,qOf(room)):room.cfg.disc);F.set(B()+'st/tm',{run:true,left:x,end:F.now()+x*1000})}}
const end=()=>confirm('End the game and show final results to everyone?')&&F.upd({[B()+'status']:'final',[B()+'st/ph']:'final'});
window.H={lib:()=>library(),newG,editG,dupG,delG,hostG,seed,cfg:(k,v,s)=>{cd[k]=v;if(!s)setup(HG)},col:(i,v)=>cd.col[i]=v,nm:(i,v)=>cd.names[i]=v,create,
  tg:(k,v)=>F.set(B()+'cfg/'+k,v),kick:id=>confirm('Remove this player?')&&F.del(B()+'players/'+id),mv:(id,k)=>F.set(B()+`players/${id}/team`,k),
  start:()=>confirm('Start the game? Teams will be locked.')&&F.upd({[B()+'status']:'live',[B()+'cfg/regOpen']:false,[B()+'st']:{qi:0,qk:'q0',ph:'intro',tm:{run:false,left:room.cfg.disc}}}),
  go,next,tt,end,rs:k=>F.del(B()+`subs/${room.st.qk}/${k}`),
  aw:(k,key,p)=>((room.aw||{})[room.st.qk]||{})[k+'_'+key]?0:F.upd({[B()+`aw/${room.st.qk}/${k}_${key}`]:true,[B()+`sc/${k}/s`]:F.inc(p)}),
  man:s=>F.upd({[B()+`sc/${$('#mt').value}/s`]:F.inc(s*Math.abs(+$('#ma').value||0))}),
  close:()=>confirm('Close this room for everyone?')&&F.set(B()+'status','closed')};
