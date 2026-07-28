// @Arch[licenseUtilsD6wob2_Z]
var i=(e,r,a)=>new Promise((p,s)=>{var h=t=>{try{n(a.next(t))}catch(c){s(c)}},u=t=>{try{n(a.throw(t))}catch(c){s(c)}},n=t=>t.done?p(t.value):Promise.resolve(t.value).then(h,u);n((a=a.apply(e,r)).next())});import{c as o}from"./index-D_kso_BN.js";/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l=o("Check",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]);/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=o("ExternalLink",[["path",{d:"M15 3h6v6",key:"1q9fwt"}],["path",{d:"M10 14 21 3",key:"gplh6r"}],["path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",key:"a6xqqp"}]]),y=e=>{if(!e)return"";const r=e.trim();return r.toUpperCase().startsWith("MASS-")?"MASS-••••••••••••••••••••••••••••":r.length>5?r.substring(0,5)+"••••••••••••••••••••••••":"MASS-••••••••••••••••••••••••••••"},f=e=>i(void 0,null,function*(){try{return yield navigator.clipboard.writeText(e),!0}catch(r){return!1}});export{l as C,m as E,f as c,y as m};
