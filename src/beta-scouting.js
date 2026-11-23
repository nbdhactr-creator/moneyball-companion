import {benchmarkPanel} from "./beta-metrics.js";
import {formatMetric} from "./beta-benchmarks.js";

// UI-only module. Query parameters are never treated as scoring inputs.
export function renderScouting(q,d,{E,A,h,val,field,input,score,path,decision,season,roles}){
 const choices=(values,any)=>[["",any],...values.map(x=>[x,x])];
 const pills={role:q.role?"Role selected":"",league:q.league,q:q.q?"Search: "+q.q:"",minutes:q.minutes?q.minutes+"+ minutes":"",ageMin:q.ageMin?"Age from "+q.ageMin:"",ageMax:q.ageMax?"Age to "+q.ageMax:"",value:q.value?"Value ≤ "+(q.currency||"£")+q.value+"m":"",wage:q.wage?"Wage ≤ "+(q.currency||"£")+q.wage+"k":"",tracked:q.tracked?"Beta shortlist only":"",minScore:q.minScore?"Minimum role score "+q.minScore:"",foot:q.foot};
 const role=q.role||"";
 const compareUrl=path("shortlist",{career:q.career,season:q.season,role,slot:q.slot||""});
 const benchmark=d.benchmark;
 const stats=benchmark?.metrics.slice(0,2).map(x=>[x.metric,x.label])??d.stats;
 const cell=(label,html)=>'<div><span class="mobile-label">'+E(label)+'</span>'+html+'</div>';
 const columns=["Player","Age","Position","Level","Role score",...stats.map(x=>x[1]),"Contract","Estimated value","Actions"];
 const rows=d.players.map(p=>{
  const f=p.f,tracked=Boolean(decision(p.uid).tracked),rawStat=([metric,label])=>{
   const m=p.essentials?.find(x=>x.metric===metric);
   return cell(label,m?E(formatMetric(m.value,metric))+'<small>'+(m.percentile==null?E(m.reason||"No comparable peers"):Math.round(m.percentile)+"th percentile")+'</small>':val(f[metric]));
  };
  return '<article class="row"><div class="identity">'+A(path("player",{...q,uid:p.uid}),p.name,"player-link")+
    '<small>'+val(p.club)+' · '+val(f.Division)+(tracked?' · Shortlisted':'')+'</small></div>'+
    cell("Age",val(f.Age)+'<small>'+val(f.Height)+'</small>')+
    cell("Position",val(p.position)+'<small>'+val(f["Preferred Foot"])+'</small>')+
    cell("Level",val(f.Level))+cell("Role score",'<span class="score">'+score(p.score)+'</span>')+
    stats.map(rawStat).join("")+cell("Contract",val(f.Expires))+
    cell("Estimated value",val(f["Transfer Value"])+'<small>'+val(f.Wage)+'</small>')+
    '<div class="row-actions">'+A(path("compare",{...q,uid:p.uid}),"Compare")+
    '<button type="button" data-action="track-row" data-uid="'+E(p.uid)+'" aria-pressed="'+tracked+'">'+(tracked?"Saved":"Shortlist")+'</button></div></article>';
 }).join("");
 const chips=Object.entries(pills).filter(([,v])=>v).map(([k,label])=>{const next={...q};delete next[k];delete next.p;return A(path("scouting",next),label+" ×","filter-chip");}).join("");
 const advanced=["ageMin","ageMax","value","wage","foot","minScore","stat","statMin","tracked"].some(k=>q[k]);
 return h("Scouting / "+season.seasonLabel,"Find the right players")+
 '<p>Start with a role and enough minutes. Compare the key statistics with eligible peers, then shortlist the players worth investigating.</p>'+
 '<form class="filters" data-form="search"><div class="grid">'+
 field("role","Role and duty",[["","Any position"],...roles],q)+
 field("league","Division",choices(d.leagues,"All divisions"),q)+
 input("minutes","Minimum minutes",q)+input("q","Player or club",q,"search")+
 '</div><div class="actions"><button class="primary">Find players</button>'+
 A(path("scouting",{career:q.career,season:q.season}),"Clear filters")+
 A(compareUrl,"Compare shortlist")+'</div>'+
 '<details '+(advanced?"open":"")+'><summary>Advanced filters and sort</summary><div class="grid">'+
 input("ageMin","Minimum age",q)+input("ageMax","Maximum age",q)+input("value","Estimated value cap (millions)",q)+
 input("wage","Weekly wage cap (thousands)",q)+
 field("currency","Budget currency",[["£","£ GBP"],["€","€ EUR"],["$","$ (as exported)"]],{currency:q.currency||"£"})+
 field("foot","Preferred foot",choices(d.feet,"Any preferred foot"),q)+
 input("minScore","Minimum role score",q)+field("stat","Source stat",choices(d.fields,"No extra stat condition"),q)+
 input("statMin","Minimum stat value",q)+field("tracked","Shortlist filter",[["","Everyone"],["yes","Only beta shortlist"]],q)+
 field("sort","Sort",[["","Role Fit (then name)"],["name","Player name"],["age","Youngest first"],["minutes","Most minutes"]],q)+
 '</div></details></form>'+
 (chips?'<div class="chips" aria-label="Active filters">'+chips+'</div>':"")+
 (q.value||q.wage?'<p>Unknown or differently denominated costs are excluded when you set a cap. Value estimates are not transfer fees.</p>':"")+
 (benchmark?benchmarkPanel(benchmark,[],{E},"Three essentials for this role"):'<section class="card"><h2>Select a role to compare performance</h2><p>Different positions cannot be ranked reliably using one general statistic.</p></section>')+
 '<section id="results"><div class="head"><h2>'+d.total.toLocaleString()+' players</h2>'+A(compareUrl,"Compare shortlist","button primary")+'</div>'+
 (rows?'<div class="row rowhead" aria-hidden="true">'+columns.map(x=>'<span>'+E(x)+'</span>').join("")+'</div>'+rows:
 '<section class="card"><p>No matches in these filters. Try a lower minutes minimum or remove a restriction. With filters cleared, a missing player may not be in this import.</p></section>')+
 '<div class="actions card">'+(d.page>1?A(path("scouting",{...q,p:d.page-1})+"#results","← Previous"):"")+
 '<span>Page '+d.page+' of '+d.pages+'</span>'+(d.page<d.pages?A(path("scouting",{...q,p:d.page+1})+"#results","Next →"):"")+
 '</div></section>';
}
