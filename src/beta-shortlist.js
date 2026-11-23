import {benchmarkPanel,metricCompact} from "./beta-metrics.js";
export const MAX_COMPARISON_CANDIDATES=6;
export function selectionFromList(available,picks,limit=MAX_COMPARISON_CANDIDATES){
 const ids=new Set(available);
 return [...new Set(picks)].filter(uid=>ids.has(uid)).slice(0,limit);
}
export function shortlistBoard(q,d,{E,A,h,path,roleLabel,roles,field,score,val}){
 const url=(view,extra={})=>path(view,{career:q.career,season:q.season,...extra});
 const selections=new Set(d.selected);
 const scope=(q.peer==="all"?"all":"division");
 const intro=h("Scouting / Shortlist","Compare your shortlist")+
  '<p>Choose up to six candidates and compare them against a current club player. Results are from the selected imported season only. No transfer is made and no save data leaves this browser.</p>'+
  '<div class="actions">'+A(url("scouting",{role:d.roleId||q.role||"",slot:q.slot||""}),"← Back to Scouting")+A(url("squad",{slot:q.slot||""}),"Squad")+'</div>';
 const selectedRole=q.role||d.roleId||"";
 const chooser='<form data-form="shortlist" class="card"><h2>Comparison setup</h2><div class="grid">'+
 field("role","Role and duty",[["","Choose a role"],...roles],{role:selectedRole})+
 field("starter","Current club starter",[["","No current starter"],...d.baselineOptions.map(x=>[x.uid,x.name+" · "+x.club])],{starter:q.starter??d.baseline?.p.uid??""})+
 field("peer","Peer comparison",[["division","Your club’s division"],["all","All divisions"]],{peer:scope})+
 '</div><details class="method-notes" open><summary>Choose up to six players ('+d.selected.length+' selected, '+d.sourceCount+' available)</summary>'+
 '<label>Find in shortlist<input type="search" name="filterCandidates" data-candidate-filter placeholder="Type a name or club…"></label>'+
 '<div class="candidate-choices">'+d.choices.map(x=>'<label class="candidate-choice" data-candidate-name="'+E((x.name+" "+x.club).toLocaleLowerCase())+'"><input type="checkbox" name="pick" value="'+E(x.uid)+'" '+(selections.has(x.uid)?"checked":"")+'> <span>'+E(x.name)+' <small>'+E(x.club)+'</small></span></label>').join("")+'</div></details><div class="actions"><button class="primary" type="submit">Compare selected</button><span role="status" id="shortlist-feedback">Maximum six. Select a role to see meaningful metrics.</span></div></form>';
 const card=(label,x)=>{
  if(!x)return '<article class="card shortlist-player"><p class="eyebrow">'+E(label)+'</p><h3>No player selected</h3></article>';
  const p=x.p,f=p.rawValues;
  return '<article class="card shortlist-player"><p class="eyebrow">'+E(label)+'</p><h3>'+E(p.displayName)+'</h3><p>'+val(p.club)+' · '+val(p.position)+'</p>'+
   '<div class="comparison-scores"><span>Role Fit <strong>'+score(x.fit?.score)+'</strong></span><span>Philosophy <strong>'+score(x.philosophy?.score)+'</strong></span></div>'+
   '<p><small>'+val(f.Mins)+' minutes · '+(x.fit?.families.length?Math.round(x.fit.coverage*100)+'% role coverage, '+E(x.fit.confidence)+' minutes confidence':"Role evidence missing")+'</small></p>'+
   metricCompact(x.essentials,{E})+
   '<div class="metric"><small>Estimated value</small><strong>'+val(f["Transfer Value"])+'</strong></div><div class="metric"><small>Weekly wage</small><strong>'+val(f.Wage)+'</strong></div>'+
   '<div class="metric"><small>Contract</small><strong>'+val(f.Expires)+'</strong></div>'+
   '<div class="actions">'+A(url("player",{role:selectedRole,uid:p.uid,slot:q.slot||""}),"Player report")+'</div></article>';
 };
 const candidates=d.candidates;
 const profile=d.benchmark?benchmarkPanel(d.benchmark,[],{E},"Reference benchmark"):"";
 return intro+chooser+(d.choices.length===0?'<section class="card"><h2>Your shortlist is empty</h2><p>Add players from Scouting or from a player report. Your existing V2 Watching/Shortlist/Revisit statuses are also recognised.</p>'+A(url("scouting",{role:selectedRole}),"Find candidates","button primary")+'</section>':"")+
 (selectedRole?profile:'<section class="card"><h2>Choose a role before comparing</h2><p>Different positions have different key statistics; a pooled score would be misleading.</p></section>')+
 '<section><h2>Side-by-side recruitment evidence</h2><p>Compare the three key stats, sample sizes and transfer details. This does not estimate transfer success or predict how a player will perform in your system.</p>'+
 '<div class="shortlist-grid">'+card("Current club starter",d.baseline)+candidates.map((x,i)=>card("Candidate "+(i+1),x)).join("")+'</div></section>';
}
