// @Arch[StatusBadgeCh8UWCA7]
import{c as s,j as e,C as l,a as y,b as g,d as w,K as f,B as j}from"./index-D_kso_BN.js";/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z=s("AlertTriangle",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z",key:"c3ski4"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v=s("Clock",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polyline",{points:"12 6 12 12 16 14",key:"68esgv"}]]);/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C=s("Cpu",[["rect",{x:"4",y:"4",width:"16",height:"16",rx:"2",key:"1vbyd7"}],["rect",{x:"9",y:"9",width:"6",height:"6",key:"o3kz5p"}],["path",{d:"M15 2v2",key:"13l42r"}],["path",{d:"M15 20v2",key:"15mkzm"}],["path",{d:"M2 15h2",key:"1gxd5l"}],["path",{d:"M2 9h2",key:"1bbxkp"}],["path",{d:"M20 15h2",key:"19e6y8"}],["path",{d:"M20 9h2",key:"19tzq7"}],["path",{d:"M9 2v2",key:"165o2o"}],["path",{d:"M9 20v2",key:"i2bqo8"}]]);/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N=s("Crown",[["path",{d:"m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14",key:"zkxr6b"}]]);/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const o=s("Layers",[["path",{d:"m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z",key:"8b97xw"}],["path",{d:"m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65",key:"dd6zsq"}],["path",{d:"m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65",key:"ep9fru"}]]),A=({status:a,label:p,type:c="status",variant:u="active",customColor:h,shape:k="md"})=>{const d=p||a||"Active",r=a?a.toLowerCase()==="suspended"?"suspended":"active":u,i=h||(c==="tier"?(t=>{const n=t.toLowerCase();return n.includes("pro")?"purple":n.includes("dev")?"amber":n.includes("ent")?"emerald":"sky"})(d):void 0),x=()=>{if(i)switch(i){case"sky":return"bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30";case"amber":return"bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";case"emerald":return"bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";case"rose":return"bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";case"indigo":return"bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30";case"purple":default:return"bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"}switch(r){case"active":return"bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";case"suspended":case"expired":return"bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";case"pending":return"bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";default:return"bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"}},m=()=>{switch(c){case"company":return e.jsx(j,{className:"w-3 h-3 shrink-0"});case"license":return e.jsx(f,{className:"w-3 h-3 shrink-0"});case"user":return e.jsx(w,{className:"w-3 h-3 shrink-0"});case"security":return e.jsx(g,{className:"w-3 h-3 shrink-0"});case"tier":{const t=d.toLowerCase();return t.includes("ent")?e.jsx(N,{className:"w-3 h-3 shrink-0 text-emerald-400"}):t.includes("dev")?e.jsx(C,{className:"w-3 h-3 shrink-0 text-amber-400"}):t.includes("pro")?e.jsx(o,{className:"w-3 h-3 shrink-0 text-purple-400"}):e.jsx(o,{className:"w-3 h-3 shrink-0 text-sky-400"})}case"status":default:return r==="active"?e.jsx(l,{className:"w-3 h-3 shrink-0"}):r==="suspended"||r==="expired"?e.jsx(y,{className:"w-3 h-3 shrink-0"}):r==="pending"?e.jsx(v,{className:"w-3 h-3 shrink-0"}):e.jsx(l,{className:"w-3 h-3 shrink-0"})}},b=k==="full"?"rounded-full":"rounded-md";return e.jsxs("span",{className:`px-2.5 py-1 ${b} text-[10px] font-bold uppercase border flex items-center gap-1 w-fit ${x()}`,children:[m(),e.jsx("span",{children:d})]})};export{z as A,v as C,o as L,A as S,N as a,C as b};
