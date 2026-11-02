/* Game persistence. games/<uid>/<id> = small metadata (listed/queried); gameContent/<uid>/<id> = rounds+questions (loaded only on edit/host). */
import * as F from './firebase-service.js';
export const gid=()=>'g'+Date.now().toString(36)+(Math.random()*1e3|0);
const KEY={draft:'drafts',published:'published',archived:'archived'},cl=o=>JSON.parse(JSON.stringify(o)),S=()=>`stats/${F.uid}/`;
const T0={p:'#a855f7',s:'#22d3ee',bg:'glow'},P0={correct:100,speed:0,pen:0,manual:100};
export function split(g){const c=cl(g);['title','topic','status','createdAt','updatedAt','ownerUid','_st','_bytes','_saved','bytes','gameId'].forEach(k=>delete c[k]);const description=c.sub||'';delete c.sub;return{c,description}}
export async function saveGame(id,g,status){const u=F.uid,t=F.now(),{c,description}=split(g),bytes=JSON.stringify(c).length;
  g.status=status||g.status||'draft';g.createdAt=g.createdAt||t;g.updatedAt=t;
  const m={ownerUid:u,title:String(g.title||'Untitled').slice(0,100),description:description.slice(0,300),topic:String(g.topic||'').slice(0,60),status:g.status,createdAt:g.createdAt,updatedAt:t,rounds:g.R.length,questions:g.Q.length,bytes};
  const x={[`games/${u}/${id}`]:m,[`gameContent/${u}/${id}`]:c};
  if(!g._saved){x[S()+'games']=F.inc(1);x[S()+KEY[g.status]]=F.inc(1);x[S()+'gBytes']=F.inc(bytes)}
  else{if(g._st&&g._st!==g.status){x[S()+KEY[g._st]]=F.inc(-1);x[S()+KEY[g.status]]=F.inc(1)}x[S()+'gBytes']=F.inc(bytes-(g._bytes||0))}
  await F.upd(x);g._st=g.status;g._bytes=bytes;g._saved=true;g.ownerUid=u}
export async function loadGame(id){const [m,c]=await Promise.all([F.get(`games/${F.uid}/${id}`),F.get(`gameContent/${F.uid}/${id}`)]);if(!m)return null;
  const g={...(c||{}),title:m.title,topic:m.topic||'',sub:m.description||'',status:m.status,createdAt:m.createdAt,updatedAt:m.updatedAt,ownerUid:m.ownerUid,_st:m.status,_bytes:m.bytes||0,_saved:true};
  g.R=g.R||[];g.Q=g.Q||[];g.pts=g.pts||{...P0};g.theme=g.theme||{...T0};return g}
export async function dupGame(id){const g=await loadGame(id),n=gid();['createdAt','_saved','_st','_bytes','ownerUid'].forEach(k=>delete g[k]);g.title+=' (copy)';await saveGame(n,g,'draft');return n}
export async function importGame(o){if(!o||!Array.isArray(o.R)||!Array.isArray(o.Q))throw new Error('Not a MINDSET ARENA game file');const g={...o,title:o.title||'Imported game'};['createdAt','_saved','_st','_bytes','ownerUid','status'].forEach(k=>delete g[k]);g.pts=g.pts||{...P0};g.theme=g.theme||{...T0};await saveGame(gid(),g,'draft')}
export const setStatus=async(id,m,st)=>{if(m.status===st)return;const t=F.now();await F.upd({[`games/${F.uid}/${id}/status`]:st,[`games/${F.uid}/${id}/updatedAt`]:t,[S()+KEY[m.status]]:F.inc(-1),[S()+KEY[st]]:F.inc(1)});m.status=st;m.updatedAt=t};
export const deleteGame=(id,m)=>F.upd({[`games/${F.uid}/${id}`]:null,[`gameContent/${F.uid}/${id}`]:null,[S()+'games']:F.inc(-1),[S()+KEY[m.status]]:F.inc(-1),[S()+'gBytes']:F.inc(-(m.bytes||0))});
/* manual cleanup only: the rules refuse to delete a room that is not final/closed */
export const deleteSession=(pin,s)=>F.upd({['rooms/'+pin]:null,[`sessionIdx/${F.uid}/${pin}`]:null,[S()+'sessions']:F.inc(-1),[S()+(s.status==='completed'?'sDone':'sExp')]:F.inc(-1),[S()+'sBytes']:F.inc(-(s.bytes||0))});
export async function recount(name){const [g,s]=await Promise.all([F.get('games/'+F.uid),F.get('sessionIdx/'+F.uid)]),st={name,games:0,published:0,drafts:0,archived:0,gBytes:0,sessions:0,sDone:0,sExp:0,sBytes:0};
  for(const m of Object.values(g||{})){st.games++;st[KEY[m.status]]++;st.gBytes+=m.bytes||0}for(const x of Object.values(s||{})){st.sessions++;if(x.status==='completed')st.sDone++;if(x.status==='expired')st.sExp++;st.sBytes+=x.bytes||0}
  await F.set('stats/'+F.uid,st);return st}
