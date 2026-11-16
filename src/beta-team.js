
import {money} from "./beta-domain.js";
export function planningDelta(baseline,target){
 if(!baseline?.listed||!target?.listed||baseline.fit?.score==null||target.fit?.score==null)return null;
 return target.fit.score-baseline.fit.score;
}
export function renderTeam(view,q,d,{E,A,h,path,score,val,roleLabel,field,input}){
 const slot=d.slot,tactic=d.tactic, plan=view==="planning";
 const selection={career:q.career,season:q.season,slot:slot.id};
 const route=(v,extra={})=>path(v,{...selection,...extra});
 const c=q.currency||"£";
 const starter=q.starter??d.assigned??"";
 const chooser='<form class="card grid" data-form="team">'+field("slot","Tactic slot",tactic.slots.map(s=>[s.id,s.label+" · "+roleLabel(s.roleId)]),selection)+'<div class="actions"><button>Open slot</button></div></form>';
 const assessment=x=>!x?"No player selected":!x.listed?"Position not listed for this role":x.fit?.score==null?"Insufficient evidence to score":"Measured against the same season’s eligible peers";
 const metrics=x=>x?'<p>'+val(x.p.rawValues.Mins)+' minutes · '+(x.fit?.families.length?E(x.fit.confidence)+' minutes confidence · '+Math.round(x.fit.coverage*100)+'% role coverage':"No role evidence")+'</p>':"";
 const scout=A(path("scouting",{...selection,role:slot.roleId}),"Find candidates","button primary");
 const nav='<div class="actions">'+scout+A(route(plan?"squad":"planning",{...(starter?{starter}:{})}),plan?"Back to Squad":"Plan a signing")+'</div>';
 if(!plan){
  const assigned=d.slots.filter(s=>s.player).length;
  const overview='<section class="card"><h2>'+E(tactic.name)+'</h2><p>'+assigned+' of '+d.slots.length+' slots have a saved starter present at '+val(d.club)+' in this season. An unassigned slot is not automatically a squad weakness.</p><div class="grid squad-slots">'+d.slots.map(s=>'<article class="card"><small>'+E(s.label)+' · '+E(roleLabel(s.roleId))+'</small><strong>'+ (s.player?E(s.player.name):s.saved?"Saved starter not in this club’s season roster":"No saved starter")+'</strong><div class="actions">'+A(path("squad",{...selection,slot:s.id}),"Inspect "+s.label)+'</div></article>').join("")+'</div></section>';
  const rows=d.cover.map(x=>'<article class="card"><small>'+val(x.p.position)+'</small><h3>'+E(x.p.displayName)+'</h3><p>Role Fit: '+score(x.fit?.score)+'</p>'+metrics(x)+A(route("planning",{starter:x.p.uid}),"Use as planning baseline")+'</article>').join("");
  return h("Squad / "+q.seasonLabel,"Where does your squad need help?")+'<p>Inspect your tactic and rank in-club cover for a specific role. This beta reads your saved tactic without changing it.</p>'+overview+chooser+'<section class="card"><h2>'+E(slot.label)+' · '+E(roleLabel(slot.roleId))+'</h2><p>'+d.coverCount+' club players list a position for this role; '+d.scoredCount+' have enough evidence to score. Showing up to eight, ranked by Role Fit.</p>'+(!d.club?'<p>Set your club in the original app’s Data &amp; Saves first.</p>':"")+nav+'</section><div class="grid">'+rows+'</div>';
 }
 const player=(label,x)=>'<article class="card"><small>'+label+'</small><h2>'+(x?E(x.p.displayName):"Not selected")+'</h2>'+(x?'<p>'+val(x.p.club)+' · '+val(x.p.position)+'</p><p>Role Fit: <strong>'+score(x.fit?.score)+'</strong> · Philosophy Fit: <strong>'+score(x.philosophy?.score)+'</strong></p>'+metrics(x)+'<p>'+E(assessment(x))+'</p><div class="metric">Estimated value: '+val(x.p.rawValues["Transfer Value"])+'</div><div class="metric">Weekly wage: '+val(x.p.rawValues.Wage)+'</div><div class="metric">Contract: '+val(x.p.rawValues.Expires)+'</div>':"")+'</article>';
 const delta=planningDelta(d.baseline,d.target);
 const target=d.target?.p.rawValues;
 const wage=money(target?.Wage,c),value=money(target?.["Transfer Value"],c);
 const cap=(raw,amount,mult,label)=>raw==null?label+": not verifiable in "+c:amount===""||amount==null?label+": no cap set":label+(raw<=Number(amount)*mult?": within cap":": over cap");
 const options=d.roster.map(x=>[x.uid,x.name+" · "+x.position]);
 const candidate=x=>A(route("planning",{starter,target:x.uid,find:q.find??"",capValue:q.capValue??"",capWage:q.capWage??"",currency:c}),x.name+" · "+x.club);
 return h("Planning / "+q.seasonLabel,"Would this signing improve your squad?")+'<p>'+E(slot.label)+' · '+E(roleLabel(slot.roleId))+' · '+(d.template?"Saved philosophy: "+E(d.template):"No saved philosophy selected")+'. Compare a target with a current club player without changing the tactic or committing a transfer.</p>'+chooser+nav+
 '<form class="card" data-form="plan"><div class="grid">'+field("starter","Current club baseline",[["","No baseline"],...options],{starter})+input("find","Find a target by name or club",q,"search")+field("currency","Budget currency",[["£","£ GBP"],["€","€ EUR"],["$","$ (as exported)"]],{currency:c})+input("capValue","Estimated value cap (millions)",q)+input("capWage","Weekly wage cap (thousands)",q)+'</div><div class="actions"><button class="primary">Update scenario</button></div></form>'+
 (q.find?'<section class="card"><h2>Target search</h2><p>'+d.matches.length+' shown (up to 20).</p><div class="actions">'+(d.matches.map(candidate).join("")||"No matches in this season.")+'</div></section>':"")+
 (d.shortlist.length?'<section class="card"><h2>Shortlisted targets</h2><div class="actions">'+d.shortlist.map(candidate).join("")+'</div></section>':"")+
 '<div class="grid">'+player("Current baseline",d.baseline)+player("Transfer target",d.target)+'</div>'+
 '<section class="card evidence"><h2>What changes?</h2><p>'+(delta==null?"No comparable role-score difference yet. Select two distinct players with listed positions and enough role evidence.":(delta>0?"+":"")+delta+" Role Fit points versus the baseline. This is a score difference, not a transfer recommendation.")+'</p>'+
 (d.target?'<p>'+E(cap(value,q.capValue,1e6,"Estimated value"))+' · '+E(cap(wage,q.capWage,1e3,"Weekly wage"))+'.</p><p>Value uses the upper end of the exported range. It is not an asking price. Unknown costs are not treated as affordable.</p>':"")+'</section>';
}
