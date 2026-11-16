
import "./beta.css";
import {listSaves,getScoutingWorkspaceState} from "./data/storage/local-database";
import {FM24_ROLES} from "./analytics/fm24-role-catalog";
import {FM24_PHILOSOPHY_TEMPLATES} from "./analytics/fm24-scoring";
const desk=document.querySelector("#desk");
const E=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const val=s=>E(s==null||["","-","—"].includes(String(s).trim())?"Not supplied":s);
const roles=FM24_ROLES.map(x=>[x.id,x.name+" · "+x.dutyName]);
const cb=FM24_ROLES.find(r=>r.slots.includes("D-C")&&r.name==="Central Defender"&&r.dutyName==="Defend")?.id||"";
const roleLabel=id=>roles.find(x=>x[0]===id)?.[1]||"No role selected";
const A=(url,label,cls="button")=>'<a class="'+cls+'" href="'+E(url)+'">'+E(label)+'</a>';
const h=(k,label)=>'<p class="eyebrow">'+E(k)+'</p><h1>'+E(label)+'</h1>';
const score=v=>v==null?"Not scored":E(v)+" / 100";
const field=(name,label,list,q)=>'<label>'+E(label)+'<select aria-label="'+E(label)+'" name="'+name+'">'+list.map(([v,t])=>'<option value="'+E(v)+'"'+(String(v)===(q[name]??"")?' selected':'')+'>'+E(t)+'</option>').join("")+'</select></label>';
const input=(k,label,q,type="number")=>'<label>'+E(label)+'<input name="'+k+'" type="'+type+'" '+(type==="number"?'min="0" step="any"':'')+' value="'+E(q[k]??"")+'"></label>';
const path=(view,q={})=>view+".html"+(Object.keys(q).length?"?"+new URLSearchParams(q):"");
const stages=["","Watching","Scouted","Bid","Signed","Rejected"];
const selectedTab=q=>["role-fit","stats","notes"].includes(q.tab)?q.tab:"summary";
const searchQ=q=>Object.fromEntries(Object.entries(q).filter(([k])=>!["uid","lens","tab","other","compareName","philosophy","backY"].includes(k)));
const moneyText=p=>p["Transfer Value"];
const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
let saves=[], career,season,worker, requestId=0, navId=0, lastContext="", team={}, promiseCache=new Map();
function query(){return Object.fromEntries(new URLSearchParams(location.search));}
function context(q){return {...q,career:career.save.id,season:season.id};}
function locationView(){return location.pathname.split("/").pop()?.replace(".html","")||"index";}
function navigate(url,replace=false){history[replace?"replaceState":"pushState"]({}, "", url);void render(true);}
function notes(){try{return JSON.parse(localStorage.getItem("moneyball-beta:decisions:"+career.save.id)||"{}");}catch{return {};}}
function decision(uid){return notes()[uid]||{};}
function saveDecision(uid,patch){const all=notes();all[uid]={...all[uid],...patch};localStorage.setItem("moneyball-beta:decisions:"+career.save.id,JSON.stringify(all));}
function request(view,q){
  if(!worker){
    worker=new Worker(new URL("./beta.worker.js",import.meta.url),{type:"module"});
    worker.onmessage=e=>{const p=promiseCache.get(e.data.id);if(!p)return;promiseCache.delete(e.data.id);e.data.error?p.reject(Error(e.data.error)):p.resolve(e.data.data);};
    worker.onerror=()=>{for(const p of promiseCache.values())p.reject(Error("The season worker stopped. Try a smaller season or reopen this page."));promiseCache.clear();worker?.terminate();worker=undefined;};
  }
  const id=++requestId;
  return new Promise((resolve,reject)=>{promiseCache.set(id,{resolve,reject});worker.postMessage({id,view,q,career:career.save.id,season:season.id,tracked:Object.entries(notes()).filter(([,x])=>x.tracked).map(([uid])=>uid)});});
}
function home(q){
  const slots=team.squadTactics?.slots??[];
  return '<section class="hero card"><div>'+h("The recruitment desk","Find a player. See why they fit.")+'<p>Start with a role, narrow the field and open a report to inspect the evidence.</p><div class="actions">'+A(path("scouting",context({role:cb})),"Find centre-backs","button primary")+A(path("scouting",context({})),"All players")+'</div></div><svg class="pitch" aria-hidden="true" viewBox="0 0 400 235"><rect x="10" y="10" width="380" height="215" rx="14" fill="#e1d2f1" stroke="#9576b5"/><path d="M200 10v215M10 70h65v95H10m380-95h-65v95h65" fill="none" stroke="#9576b5"/><circle cx="200" cy="117" r="44" fill="none" stroke="#9576b5"/><g fill="#553696"><circle cx="70" cy="117" r="11"/><circle cx="140" cy="72" r="11"/><circle cx="140" cy="163" r="11"/><circle cx="200" cy="117" r="13"/><circle cx="265" cy="72" r="11"/><circle cx="265" cy="163" r="11"/><circle cx="336" cy="117" r="11"/></g></svg></section>'+
  '<section class="card"><h2>Your career</h2><form class="grid" data-form="context">'+field("career","Career",saves.map(x=>[x.save.id,x.save.name]),q)+field("season","Imported season",career.datasets.map(x=>[x.id,x.seasonLabel]),q)+'<div class="actions"><button>Use this season</button></div></form><p>'+season.playerCount.toLocaleString()+' imported player records. The beta reads the same career as the current app; trial decisions are stored separately.</p></section>'+
  (slots.length?'<section class="card"><h2>Scout a tactic slot</h2><p>Choose a saved role and duty from your tactic.</p><div class="actions">'+slots.filter(s=>s.roleId).map(s=>A(path("scouting",context({role:s.roleId})),s.label+" · "+roleLabel(s.roleId))).join("")+'</div></section>':'');
}
function results(q,d){
  const choices=(list,any)=>[["",any],...list.map(x=>[x,x])];
  const labels={role:roleLabel(q.role),league:q.league,q:"Search: "+q.q,ageMin:"Age from "+q.ageMin,ageMax:"Age to "+q.ageMax,minutes:q.minutes+"+ minutes",value:"Value ≤ "+(q.currency||"£")+q.value+"m",wage:"Wage ≤ "+(q.currency||"£")+q.wage+"k",foot:q.foot,minScore:"Role score ≥ "+q.minScore,stat:q.stat,statMin:"Stat minimum "+q.statMin,tracked:"Beta shortlist"};
  const stats=d.stats;
  const columns=["Player","Age","Position","Level","Role score",...stats.map(x=>x[1]),"Contract","Estimated value","Compare"];
  const cell=(label,value)=>'<div><span class="mobile-label">'+E(label)+'</span>'+value+'</div>';
  const rows=d.players.map(p=>{
    const f=p.f, url=path("player",{...q,uid:p.uid}), cmp=path("compare",{...q,uid:p.uid});
    return '<article class="row"><div class="identity">'+A(url,p.name,"player-link")+'<small>'+val(p.club)+' · '+val(f.Division)+(decision(p.uid).tracked?' · Shortlisted':'')+'</small></div>'+
      cell("Age",val(f.Age)+"<small>"+val(f.Height)+"</small>")+cell("Position",val(p.position)+"<small>"+val(f["Preferred Foot"])+"</small>")+cell("Level",val(f.Level))+cell("Role score",'<span class="score">'+score(p.score)+'</span>')+
      stats.map(([k,l])=>cell(l,val(f[k]))).join("")+cell("Contract",val(f.Expires))+cell("Estimated value",val(moneyText(f))+"<small>"+val(f.Wage)+"</small>")+A(cmp,"Compare")+'</article>';
  }).join("");
  const chips=Object.keys(labels).filter(k=>q[k]).map(k=>{const x={...q};delete x[k];delete x.p;if(k==="stat")delete x.statMin;return A(path("scouting",x),labels[k]+" ×","");}).join("");
  return h("Scouting / "+season.seasonLabel,"Find players")+'<p>Filter the imported season. Role scores are calculated against eligible peers in the whole season, not just these results.</p>'+
   '<form class="filters" data-form="search"><div class="grid">'+field("role","Role and duty",[["","Any position"],...roles],q)+field("league","Division",choices(d.leagues,"All divisions"),q)+input("q","Player or club",q,"search")+input("minutes","Minimum minutes",q)+input("ageMin","Minimum age",q)+input("ageMax","Maximum age",q)+input("value","Estimated value cap (millions)",q)+input("wage","Weekly wage cap (thousands)",q)+'</div>'+
   '<details '+(["foot","stat","statMin","tracked","minScore"].some(k=>q[k])?"open":"")+'><summary>More filters</summary><div class="grid">'+field("foot","Preferred foot",choices(d.feet,"Any"),q)+input("minScore","Minimum role score",q)+field("stat","Source stat",choices(d.fields,"No stat condition"),q)+input("statMin","Minimum source stat",q)+field("tracked","Shortlist",[["","All players"],["yes","Beta shortlist only"]],q)+'</div></details>'+
   '<div class="grid">'+field("currency","Budget currency",[["£","£ GBP"],["€","€ EUR"],["$","$ (as exported)"]],{currency:q.currency||"£"})+field("sort","Sort",[["","Best role fit, then name"],["name","Player name"],["age","Youngest first"],["minutes","Most minutes"]],q)+'</div><div class="actions"><button class="primary">Apply filters</button>'+A(path("scouting",context({})),"Clear all")+'</div></form>'+
   (chips?'<div class="chips" aria-label="Active filters">'+chips+'</div>':'')+
   (q.value||q.wage?'<p>Unknown or differently denominated amounts are excluded. Estimated value uses the upper end of the range, not the asking price.</p>':'')+
   '<section id="results"><h2>'+d.total.toLocaleString()+' players</h2>'+(rows?'<div class="row rowhead" aria-hidden="true">'+columns.map(c=>'<span>'+E(c)+'</span>').join("")+'</div>'+rows:'<p>No matches in this export. Try removing a filter; if a player still doesn’t appear by name with filters cleared, they may not be in this season.</p>')+
   '<div class="actions card">'+(d.page>1?A(path("scouting",{...q,p:d.page-1})+"#results","← Previous"):"")+'<span>Page '+d.page+' of '+d.pages+'</span>'+(d.page<d.pages?A(path("scouting",{...q,p:d.page+1})+"#results","Next →"):"")+'</div></section>';
}
function assessment(x){
  if(!x.fit)return "Choose a role to assess.";
  if(!x.fit.families.length)return "Not scored: outside the eligible position group.";
  if(x.fit.score==null)return x.fit.coreFamilyAvailable?"Not scored: insufficient weighted evidence.":"Not scored: required core evidence is missing.";
  return x.listed?"Scored against eligible positional peers.":"Position group eligible; this specific role position is not listed. Check retraining in FM.";
}
function report(q,d){
  const back=A(path("scouting",searchQ(q)),"← Back to results");
  if(d.missing)return back+h("Player report","Not in this export")+'<p>This UID has no record in the selected season.</p>';
  const x=d.primary,p=x.p,f=p.rawValues,tab=selectedTab(q), fit=x.fit, ph=x.philosophy, saved=decision(p.uid);
  const tabs=[["summary","Summary"],["role-fit","Role Fit"],["stats","Stats & History"],["notes","Notes"]];
  const link=(id,label)=>'<a class="button" '+(tab===id?'aria-current="page" ':'')+'href="'+E(path("player",{...q,tab:id}))+'">'+label+'</a>';
  const facts=[["Age","Age"],["Preferred foot","Preferred Foot"],["Estimated value","Transfer Value"],["Weekly wage","Wage"],["Contract expiry","Expires"],["Asking price","Asking Price"]];
  const fact=(label,value)=>'<div class="card fact"><small>'+E(label)+'</small><strong>'+value+'</strong></div>';
  const available=(fit?.families??[]).filter(y=>y.score!=null).sort((a,b)=>b.score-a.score);
  const family=y=>E(y.family.replace(/_/g," "));
  let body="";
  if(tab==="summary")body='<h2>Is this player worth a closer look?</h2><p>Check the role evidence and transfer details before making a decision in FM.</p><div class="grid">'+facts.map(([l,k])=>fact(l,val(f[k]))).join("")+'</div><div class="grid"><section class="card"><h2>Strengths in the evidence</h2>'+ (available.length?'<p>Highest measured role signals, relative to peers:</p>'+available.slice(0,2).map(y=>'<p>'+family(y)+' · '+score(y.score)+'</p>').join(""):'<p>No measured role signals to summarise.</p>')+'</section><section class="card"><h2>What to check</h2><p>'+E(assessment(x))+'</p>'+(available.length>2?'<p>Lowest measured role signal: '+family(available.at(-1))+' · '+score(available.at(-1).score)+'.</p>':'')+'<p>Estimated value is not an asking price or agreed fee.</p>'+link("role-fit","See role evidence")+'</section></div>';
  if(tab==="role-fit")body='<h2>What evidence supports this role?</h2><p>Change the role or philosophy for this report without changing your search or saved tactic.</p><form class="card grid" data-form="lens">'+field("lens","Assess as",[["","Choose a role"],...roles],{lens:q.lens??q.role??""})+field("philosophy","Philosophy",[["","None"],...Object.entries(FM24_PHILOSOPHY_TEMPLATES).map(([k,v])=>[k,v.name])],{philosophy:d.template})+'<div class="actions"><button>Update assessment</button></div></form><div class="grid"><section class="card"><h2>Role Fit · '+score(fit?.score)+'</h2><p>'+E(assessment(x))+'</p><p>Weighted season performance for the selected role. Percentile ranks compare eligible positional peers; they are not success rates.</p>'+(fit?.families??[]).map(y=>'<details class="metric"><summary>'+family(y)+' · '+score(y.score)+'</summary><p>Configured weight: '+E(y.configuredWeight)+'</p>'+(y.metrics??[]).map(m=>'<p>'+E(m.metric)+' · Original/derived value: '+val(m.rawValue)+' · '+(m.percentile==null?'Not comparable'+(m.reason?' ('+E(m.reason)+')':''):E(Math.round(m.percentile))+' percentile')+'</p>').join("")+'</details>').join("")+'</section><section class="card"><h2>Philosophy Fit · '+score(ph?.score)+'</h2><p>Alignment with the selected playing principles, not a prediction of tactical success.</p>'+(ph?'<p>'+Math.round(ph.coverage*100)+'% weighted evidence coverage.</p>':'<p>Select a role and philosophy to assess.</p>')+(ph?.principles??[]).map(y=>'<details class="metric"><summary>'+E(y.name)+' · '+score(y.score)+'</summary><p>'+E(y.description??"")+'</p>'+(y.metrics??[]).map(m=>'<p>'+E(m.metric)+' · '+(m.percentile==null?'Not comparable':E(Math.round(m.percentile))+' percentile')+'</p>').join("")+'</details>').join("")+'</section></div>';
  if(tab==="stats")body='<h2>What did the player actually record?</h2><p>Original export values, not calculated scores. Missing stays missing; zero stays zero.</p><details class="card" open><summary>All imported fields ('+Object.keys(f).length+')</summary>'+input("statSearch","Find a stat",{},"search")+'<div class="grid raw">'+Object.entries(f).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>'<div data-stat="'+E(k.toLocaleLowerCase())+'">'+fact(k,val(v))+'</div>').join("")+'</div><p id="no-stat" hidden>No matching field.</p></details><section class="card"><h2>Season history</h2>'+d.history.map(z=>'<p><strong>'+E(z.label)+'</strong> · '+(z.present?val(z.club)+" · Minutes: "+val(z.minutes):"Not present in this export")+'</p>').join("")+'</section>';
  if(tab==="notes")body='<h2>What have I decided?</h2><p>Record what you want to check next. Beta notes are separate from your current app and aren’t included in its backups.</p><form data-form="note" class="card">'+field("stage","Recruitment stage",stages.map(s=>[s,s||"Not set"]),{stage:saved.stage})+'<label>Scout notes<textarea name="note" rows="4" maxlength="2000">'+E(saved.note)+'</textarea></label><button>Save stage and note</button></form>';
  return back+'<div class="profile-head">'+h("Player report / "+season.seasonLabel,p.displayName)+'<p>'+val(p.club)+' · '+val(f.Division)+' · '+val(p.position)+'</p><div class="actions">'+A(path("compare",q),"Compare players")+'<button data-action="print">Print report</button><button class="primary" data-action="track" aria-pressed="'+Boolean(saved.tracked)+'">'+(saved.tracked?"Remove from shortlist":"Add to shortlist")+'</button></div></div>'+
   '<div class="card evidence"><strong>'+E(roleLabel(q.lens??q.role))+'</strong><p>Minutes: '+val(f.Mins)+' · Confidence: '+(fit?.families.length?E(fit.confidence):"Not assessed")+' · Evidence coverage: '+(fit?.families.length?Math.round(fit.coverage*100)+"%":"Not assessed")+'</p><details><summary>What do confidence and coverage mean?</summary><p>Confidence is based on minutes'+(d.medium!=null?' (medium from '+d.medium+', high from '+d.high+')':'')+'. Coverage is the share of role weights supported by available evidence. The reference pool uses eligible positional peers in this season'+(d.pool!=null?' with a minimum of '+d.pool+' minutes; eligibility also varies by metric':'')+'. Neither measure predicts how a player will perform after a transfer.</p></details></div><nav class="tabs" aria-label="Player report sections">'+tabs.map(([id,label])=>link(id,label)).join("")+'</nav><p role="status" id="feedback"></p>'+body;
}
function comparison(q,d){
  const back=A(path("player",q),"← Back to player report");
  if(d.missing)return back+h("Compare","Player not in this export");
  const card=x=>{const p=x.p,f=p.rawValues;return '<article class="card"><h2>'+E(p.displayName)+'</h2><p>'+val(p.club)+' · '+val(p.position)+'</p><p>Role Fit: <strong>'+score(x.fit?.score)+'</strong></p><p>'+E(assessment(x))+'</p>'+[["Minutes","Mins"],["Age","Age"],...d.stats.map(([k,l])=>[l,k]),["Estimated value","Transfer Value"],["Weekly wage","Wage"],["Contract","Expires"]].map(([l,k])=>'<div class="metric">'+E(l)+' · <strong>'+val(f[k])+'</strong></div>').join("")+'</article>';};
  return back+h("Compare / Same season","Compare players")+'<p>'+E(roleLabel(q.lens??q.role))+' · Compare the same role and season, then confirm transfer details in FM.</p><form class="card actions" data-form="compare">'+input("compareName","Find another player by name or club",q,"search")+'<button class="primary">Find player</button></form>'+
   (q.compareName?'<div class="card actions">'+(d.matches.map(x=>A(path("compare",{...q,other:x.uid}),x.name+" · "+x.club)).join("")||"No matches in this season.")+'</div>':'')+'<div class="grid">'+card(d.primary)+(d.secondary?card(d.secondary):'')+'</div>';
}
async function render(scroll=false){
  const id=++navId,q=query(),view=locationView();
  try{
    let active;try{active=localStorage.getItem("moneyball-companion:active-save");}catch{}
    career=saves.find(x=>x.save.id===q.career)??saves.find(x=>x.save.id===active&&x.datasets.length)??saves.find(x=>x.datasets.length);
    if(!career?.datasets.length){desk.innerHTML=h("Beta","No imported season in this browser")+'<p>Open the beta in the same browser and device as your existing Moneyball career. A save on another device isn’t synced automatically.</p>'+A("../","Open current app");return;}
    season=career.datasets.find(x=>x.id===q.season)??career.datasets[0];
    const params=context(q);
    document.querySelector(".mast nav a").href=path("scouting",context({}));
    if(view==="index"){
      if(lastContext!==career.save.id){team=await getScoutingWorkspaceState(career.save.id);if(id!==navId)return;lastContext=career.save.id;}
      desk.innerHTML=home(params);
    }else{
      desk.innerHTML='<p role="status">Reading '+E(season.seasonLabel)+' and preparing the selected role…</p>';
      const data=await request(view,params);if(id!==navId)return;
      desk.innerHTML=view==="scouting"?results(params,data):view==="compare"?comparison(params,data):report(params,data);
    }
    if(scroll){await frame();if(id!==navId)return;const y=view==="scouting"?Number(q.backY):0;const result=location.hash==="#results"?document.getElementById("results"):null;if(result)result.scrollIntoView();else window.scrollTo(0,Number.isFinite(y)?y:0);if(!y&&!result)desk.focus({preventScroll:true});}
  }catch(error){if(id===navId)desk.innerHTML=h("Beta","Couldn’t open this view")+'<p role="alert">'+E(error.message)+'</p>'+A("index.html","Back to beta home");}
}
document.addEventListener("click",e=>{
  const a=e.target.closest("a[href]");
  if(!a||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  const u=new URL(a.href);
  if(u.origin!==location.origin||!u.pathname.includes("/beta/")||a.getAttribute("href").startsWith("#"))return;
  e.preventDefault();
  if(locationView()==="scouting"&&/\/(player|compare)\.html$/.test(u.pathname)){
    const current=new URL(location.href);current.searchParams.set("backY",String(window.scrollY));history.replaceState({},"",current);
    u.searchParams.set("backY",String(window.scrollY));
  }
  if(locationView()!=="scouting"&&u.pathname.endsWith("/scouting.html")&&query().backY)u.searchParams.set("backY",query().backY);
  navigate(u);
});
desk.addEventListener("submit",e=>{
  const form=e.target, type=form.dataset.form;if(!type)return;e.preventDefault();
  const f=Object.fromEntries(new FormData(form)),q=context(query());
  if(type==="context"){navigate(path("index",f));return;}
  if(type==="search"){
    if(f.ageMin&&f.ageMax&&Number(f.ageMin)>Number(f.ageMax)){const el=form.elements.ageMax;el.setCustomValidity("Maximum age must be at least the minimum age.");el.reportValidity();el.setCustomValidity("");return;}
    navigate(path("scouting",context(Object.fromEntries(Object.entries(f).filter(([,v])=>String(v).trim()))))+"#results");return;
  }
  if(type==="lens"){navigate(path("player",{...q,...f,tab:"role-fit"}));return;}
  if(type==="compare"){delete q.other;navigate(path("compare",{...q,...f}));return;}
  if(type==="note"){try{saveDecision(q.uid,f);document.querySelector("#feedback").textContent="Beta stage and note saved on this browser.";}catch{document.querySelector("#feedback").textContent="Browser storage blocked saving the note.";}}
});
desk.addEventListener("click",e=>{
  const button=e.target.closest("[data-action]");if(!button)return;
  if(button.dataset.action==="print"){window.print();return;}
  const uid=query().uid;
  try{const tracked=!decision(uid).tracked;saveDecision(uid,{tracked});button.setAttribute("aria-pressed",String(tracked));button.textContent=tracked?"Remove from shortlist":"Add to shortlist";document.querySelector("#feedback").textContent=tracked?"Added to beta shortlist.":"Removed from beta shortlist.";}catch{document.querySelector("#feedback").textContent="Browser storage blocked saving this decision.";}
});
desk.addEventListener("input",e=>{if(e.target.name!=="statSearch")return;let count=0;desk.querySelectorAll("[data-stat]").forEach(el=>{el.hidden=!el.dataset.stat.includes(e.target.value.trim().toLocaleLowerCase());if(!el.hidden)count++;});document.querySelector("#no-stat").hidden=count>0;});
addEventListener("popstate",()=>void render(true));
listSaves().then(x=>{saves=x;return render(true);}).catch(error=>{desk.innerHTML=h("Beta","Couldn’t open the career library")+'<p role="alert">'+E(error.message)+'</p>'+A("../","Open current app");});
