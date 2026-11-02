/* Thin wrapper around the Firebase modular SDK (Realtime Database + anonymous Auth). */
import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {getAuth,signInAnonymously} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import * as D from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import {firebaseConfig} from './firebase-config.js';
export const configured=!String(firebaseConfig.apiKey).startsWith('PASTE');
export let uid=null,offset=0,db;
export async function init(){if(!configured)throw new Error('Firebase is not configured');const app=initializeApp(firebaseConfig);db=D.getDatabase(app);const c=await signInAnonymously(getAuth(app));uid=c.user.uid;D.onValue(D.ref(db,'.info/serverTimeOffset'),s=>offset=s.val()||0);return uid}
const R=p=>D.ref(db,p);
export const now=()=>Date.now()+offset;
export const watch=(p,cb)=>D.onValue(R(p),s=>cb(s.val()));
export const get=async p=>(await D.get(R(p))).val();
export const set=(p,v)=>D.set(R(p),v);
export const del=p=>D.remove(R(p));
export const upd=u=>D.update(D.ref(db),u);
export const inc=D.increment;
export const onConn=cb=>D.onValue(R('.info/connected'),s=>cb(!!s.val()));
export function presence(pin){const r=R(`rooms/${pin}/pres/${uid}`);onConn(c=>{if(c){D.onDisconnect(r).set(false);D.set(r,true)}})}
