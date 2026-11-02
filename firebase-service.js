/* Firebase wrapper: Email/Password auth for trainers, Anonymous auth for participants, Realtime Database helpers. */
import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {getAuth,onAuthStateChanged,signInAnonymously,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,sendPasswordResetEmail,updateProfile,GoogleAuthProvider,signInWithPopup,getAdditionalUserInfo} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import * as D from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import {firebaseConfig} from './firebase-config.js';
export const configured=!String(firebaseConfig.apiKey).startsWith('PASTE');
export let uid=null,user=null,offset=0,db,auth;
export async function init(){if(!configured)throw new Error('Firebase is not configured');const app=initializeApp(firebaseConfig);db=D.getDatabase(app);auth=getAuth(app);
  await new Promise(res=>{let f=1;onAuthStateChanged(auth,u=>{user=u;uid=u?u.uid:null;if(f){f=0;res()}})});
  D.onValue(D.ref(db,'.info/serverTimeOffset'),s=>offset=s.val()||0);return uid}
const R=p=>D.ref(db,p),set_=u=>{user=u;uid=u?u.uid:null};
export const isTrainer=()=>!!user&&!user.isAnonymous;
export async function ensureAnon(){if(!user)set_((await signInAnonymously(auth)).user)}
export async function signUp(name,email,pw){const c=await createUserWithEmailAndPassword(auth,email,pw);set_(c.user);await updateProfile(c.user,{displayName:name});await D.set(R('users/'+uid),{name,email,createdAt:now()})}
export async function login(email,pw){set_((await signInWithEmailAndPassword(auth,email,pw)).user)}
export async function googleLogin(){const c=await signInWithPopup(auth,new GoogleAuthProvider());set_(c.user);
  if(getAdditionalUserInfo(c)?.isNewUser)await D.set(R('users/'+uid),{name:c.user.displayName||'Trainer',email:c.user.email||'',createdAt:now()})}
export async function logout(){await signOut(auth);set_(null);localStorage.removeItem('ma.t');localStorage.removeItem('ma.h')}
export const reset=email=>sendPasswordResetEmail(auth,email);
export async function setName(n){await updateProfile(user,{displayName:n});await D.set(R(`users/${uid}/name`),n)}
export const now=()=>Date.now()+offset;
export const watch=(p,cb)=>D.onValue(R(p),s=>cb(s.val()));   /* returns an unsubscribe function */
export const get=async p=>(await D.get(R(p))).val();
export const set=(p,v)=>D.set(R(p),v);
export const del=p=>D.remove(R(p));
export const upd=u=>D.update(D.ref(db),u);
export const inc=D.increment;
/* newest-first page of children ordered by `key` (needs .indexOn in the rules); pass the last item's key value as `before` for the next page */
export async function page(p,key,n,before){const q=D.query(R(p),D.orderByChild(key),...(before!=null?[D.endBefore(before)]:[]),D.limitToLast(n)),o=[];(await D.get(q)).forEach(c=>{o.push([c.key,c.val()])});return o.reverse()}
export const onConn=cb=>D.onValue(R('.info/connected'),s=>cb(!!s.val()));
let pu=null;
export function presence(pin){if(pu)pu();const r=R(`rooms/${pin}/pres/${uid}`);pu=onConn(c=>{if(c){D.onDisconnect(r).set(false);D.set(r,true)}})}
