import { emptyScoutingWorkspaceState, getDatasetPlayers, getScoutingWorkspaceState, updateScoutingWorkspaceState, type SaveWithDatasets, type ScoutingWorkspaceState, type PlayerSeasonRecord, type SquadTacticConfig, type SquadTacticSlot } from "./storage/local-database.ts";
import { FM24_ROLES, FM24_STRATA } from "../analytics/fm24-role-catalog.ts";
import { FM24_PHILOSOPHY_TEMPLATES, FM24_PHILOSOPHY_PRINCIPLES, philosophyWeightsForRole } from "../analytics/fm24-scoring.ts";

type Tab = "overview"|"players"|"tactics"|"philosophy"|"depth";
type Role = {id:string;type:string;name:string;duty:string;dutyName:string;strata:string;slots:string[];desc?:string};
const roles=FM24_ROLES as unknown as Role[];
const strata=FM24_STRATA as unknown as Record<string,{label:string;slots:string[]}>;
const tabs: Array<{id:Tab;label:string;hint:string}>=[
 {id:"overview",label:"Overview",hint:"Squad profile and evidence"},{id:"players",label:"Players",hint:"Database and player records"},
 {id:"tactics",label:"Tactics",hint:"Formation, roles and instructions"},{id:"philosophy",label:"Philosophy",hint:"Club identity and principles"},{id:"depth",label:"Depth & Needs",hint:"Tactical coverage"},
];
const formations=[
 {id:"433",name:"4-3-3 DM Wide",p:[["GK","GK",50,88],["DL","D-L",15,70],["DCL","D-C",38,72],["DCR","D-C",62,72],["DR","D-R",85,70],["DM","DM",50,55],["MCL","M-C",34,39],["MCR","M-C",66,39],["AML","AM-L",17,19],["AMR","AM-R",83,19],["ST","ST-C",50,9]]},
 {id:"4231",name:"4-2-3-1 DM AM Wide",p:[["GK","GK",50,88],["DL","D-L",15,70],["DCL","D-C",38,72],["DCR","D-C",62,72],["DR","D-R",85,70],["DML","DM",38,55],["DMR","DM",62,55],["AML","AM-L",17,30],["AMC","AM-C",50,32],["AMR","AM-R",83,30],["ST","ST-C",50,9]]},
 {id:"442",name:"4-4-2",p:[["GK","GK",50,88],["DL","D-L",15,70],["DCL","D-C",38,72],["DCR","D-C",62,72],["DR","D-R",85,70],["ML","M-L",15,43],["MCL","M-C",39,45],["MCR","M-C",61,45],["MR","M-R",85,43],["STL","ST-C",39,15],["STR","ST-C",61,15]]},
 {id:"352",name:"3-5-2",p:[["GK","GK",50,88],["DCL","D-C",25,72],["DC","D-C",50,75],["DCR","D-C",75,72],["WBL","WB-L",10,48],["MCL","M-C",32,45],["MC","M-C",50,39],["MCR","M-C",68,45],["WBR","WB-R",90,48],["STL","ST-C",39,13],["STR","ST-C",61,13]]},
 {id:"343",name:"3-4-3",p:[["GK","GK",50,88],["DCL","D-C",25,72],["DC","D-C",50,75],["DCR","D-C",75,72],["WBL","WB-L",10,49],["MCL","M-C",39,45],["MCR","M-C",61,45],["WBR","WB-R",90,49],["AML","AM-L",17,20],["AMR","AM-R",83,20],["ST","ST-C",50,9]]},
 {id:"4222",name:"4-2-2-2 DM AM Narrow",p:[["GK","GK",50,88],["DL","D-L",15,70],["DCL","D-C",38,72],["DCR","D-C",62,72],["DR","D-R",85,70],["DML","DM",38,55],["DMR","DM",62,55],["AMCL","AM-C",39,30],["AMCR","AM-C",61,30],["STL","ST-C",39,10],["STR","ST-C",61,10]]},
 {id:"442d",name:"4-4-2 Diamond Narrow",p:[["GK","GK",50,88],["DL","D-L",15,70],["DCL","D-C",38,72],["DCR","D-C",62,72],["DR","D-R",85,70],["DM","DM",50,56],["MCL","M-C",35,43],["MCR","M-C",65,43],["AMC","AM-C",50,28],["STL","ST-C",39,10],["STR","ST-C",61,10]]},
 {id:"424",name:"4-2-4 DM Wide",p:[["GK","GK",50,88],["DL","D-L",15,70],["DCL","D-C",38,72],["DCR","D-C",62,72],["DR","D-R",85,70],["DML","DM",38,55],["DMR","DM",62,55],["AML","AM-L",17,24],["AMR","AM-R",83,24],["STL","ST-C",39,9],["STR","ST-C",61,9]]},
 {id:"4321",name:"4-3-2-1 DM AM Narrow",p:[["GK","GK",50,88],["DL","D-L",15,70],["DCL","D-C",38,72],["DCR","D-C",62,72],["DR","D-R",85,70],["DM","DM",50,57],["MCL","M-C",35,43],["MCR","M-C",65,43],["AMCL","AM-C",39,27],["AMCR","AM-C",61,27],["ST","ST-C",50,9]]},
 {id:"5212",name:"5-2-1-2 DM AM",p:[["DCL","D-C",25,72],["DC","D-C",50,75],["DCR","D-C",75,72],["WBL","WB-L",10,55],["WBR","WB-R",90,55],["MCL","M-C",38,43],["MCR","M-C",62,43],["AMC","AM-C",50,26],["STL","ST-C",39,9],["STR","ST-C",61,9],["GK","GK",50,91]]},
 {id:"5221",name:"5-2-2-1 DM AM",p:[["DCL","D-C",25,72],["DC","D-C",50,75],["DCR","D-C",75,72],["WBL","WB-L",10,55],["WBR","WB-R",90,55],["DML","DM",38,55],["DMR","DM",62,55],["AMCL","AM-C",39,28],["AMCR","AM-C",61,28],["ST","ST-C",50,9],["GK","GK",50,91]]},
 {id:"523",name:"5-2-3 DM Wide",p:[["DCL","D-C",25,72],["DC","D-C",50,75],["DCR","D-C",75,72],["WBL","WB-L",10,55],["WBR","WB-R",90,55],["MCL","M-C",38,44],["MCR","M-C",62,44],["AML","AM-L",17,22],["AMR","AM-R",83,22],["ST","ST-C",50,9],["GK","GK",50,91]]},
 {id:"532",name:"5-3-2 DM WB",p:[["DCL","D-C",25,72],["DC","D-C",50,75],["DCR","D-C",75,72],["WBL","WB-L",10,55],["WBR","WB-R",90,55],["DM","DM",50,55],["MCL","M-C",35,42],["MCR","M-C",65,42],["STL","ST-C",39,9],["STR","ST-C",61,9],["GK","GK",50,91]]},
 {id:"4141",name:"4-1-4-1 DM",p:[["GK","GK",50,88],["DL","D-L",15,70],["DCL","D-C",38,72],["DCR","D-C",62,72],["DR","D-R",85,70],["DM","DM",50,56],["ML","M-L",15,39],["MCL","M-C",39,41],["MCR","M-C",61,41],["MR","M-R",85,39],["ST","ST-C",50,9]]},
 {id:"4411",name:"4-4-1-1 2DM",p:[["GK","GK",50,88],["DL","D-L",15,70],["DCL","D-C",38,72],["DCR","D-C",62,72],["DR","D-R",85,70],["DML","DM",38,55],["DMR","DM",62,55],["ML","M-L",15,39],["MR","M-R",85,39],["AMC","AM-C",50,25],["ST","ST-C",50,9]]},
];
let tab:Tab="overview", saveId="", datasetId="", state:ScoutingWorkspaceState=emptyScoutingWorkspaceState(), players:PlayerSeasonRecord[]=[];
let loading=false, message="", club="", selectedSlot="", playerSearchQuery="";
let activePitchDrag:{slotId:string;pointerId:number;pitch:HTMLElement;button:HTMLElement;x:number;y:number;moved:boolean}|null=null;
let token=0;
const esc=(s:string)=>s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]??c));
const defaultRole=(pos:string)=>{const a=roles.filter(r=>r.slots.includes(pos));return (a.find(r=>r.duty==="D")??a[0])?.id??""};
export function createDefaultTactic(id="433"):SquadTacticConfig{
 const f=formations.find(x=>x.id===id)??formations[0];
 return {name:f.name,formationId:f.id,slots:f.p.map(([label,position,x,y],i)=>({id:String(label)+"-"+i,label:String(label),position:String(position),x:Number(x),y:Number(y),roleId:defaultRole(String(position)),playerUid:""})),
 mentality:"Positive",inPossession:{width:"Fairly Wide",passing:"Shorter",tempo:"Higher",finalThird:"Work Ball Into Box"},
 transition:{win:"Counter",lose:"Counter-Press",goalkeeper:"Distribute Quickly"},
 outOfPossession:{line:"Higher",defensiveLine:"Higher",pressing:"Much More Often",approach:"Prevent Short GK Distribution"},updatedAt:new Date(0).toISOString()};
}
export function clampTacticCoordinate(value:number):number {
 return Number.isFinite(value) ? Math.round(Math.max(5,Math.min(95,value))) : 50;
}
export function buildFormationSlots(id:string,previous:SquadTacticSlot[]=[]):SquadTacticSlot[]{
 const next=createDefaultTactic(id).slots,old=new Map(previous.map(s=>[s.id,s]));
 return next.map(s=>{const p=old.get(s.id);return p?{...s,roleId:roles.some(r=>r.id===p.roleId&&r.slots.includes(s.position))?p.roleId:s.roleId,playerUid:p.playerUid}:s});
}
function tactic(){return state.squadTactics??createDefaultTactic()}
function clubRows(){return club?players.filter(p=>p.club.trim().toLowerCase()===club.trim().toLowerCase()):[]}
async function load(save:SaveWithDatasets,did:string,render:()=>void){
 const id=++token;loading=true;message="";saveId=save.save.id;datasetId=did;club=save.save.club;state=emptyScoutingWorkspaceState();players=[];render();
 try{const [s,p]=await Promise.all([getScoutingWorkspaceState(save.save.id),did?getDatasetPlayers(did):Promise.resolve([])]);
 if(id!==token)return;state={...emptyScoutingWorkspaceState(),...s};state.squadTactics??=createDefaultTactic();players=p;club=save.save.club;saveId=save.save.id;datasetId=did;
 }catch(e){if(id===token)message=e instanceof Error?e.message:"Could not load Squad data."}
 finally{if(id===token){loading=false;render()}}
}
async function persist(render:()=>void){try{await updateScoutingWorkspaceState(saveId,state);message="Squad settings saved to this career."}catch(e){message=e instanceof Error?e.message:"Could not save Squad settings."}render()}
function philosophy(){
 const a=state.analysis??emptyScoutingWorkspaceState().analysis!,role=roles.find(r=>r.id===a.roleId);
 const templates=Object.entries(FM24_PHILOSOPHY_TEMPLATES).map(([k,v])=>'<option value="'+k+'"'+(a.philosophyTemplate===k?" selected":"")+'>'+esc(v.name)+'</option>').join("");
 const roleOpts=Object.keys(strata).map(k=>'<optgroup label="'+esc(strata[k].label)+'">'+roles.filter(r=>r.strata===k).map(r=>'<option value="'+r.id+'"'+(a.roleId===r.id?" selected":"")+'>'+esc(r.name)+' · '+esc(r.dutyName)+'</option>').join("")+'</optgroup>').join("");
 const w=role&&a.philosophyTemplate?(a.customPhilosophyWeightsByRole?.[role.type+"|"+role.duty]??philosophyWeightsForRole(role as never,a.philosophyTemplate)):[];
 const guidance=[
  ["Keep the ball","Pass completion and possession-loss rate. Higher weight makes secure circulation and ball retention matter more in this role's Philosophy Fit."],
  ["Always available","Passes attempted per 90 as a proxy for involvement in circulation. Higher weight favours players who are frequently involved; it does not measure off-ball movement."],
  ["Move it to hurt","Progressive passes, open-play key passes, expected assists and dribbling. Higher weight gives more influence to progression and chance creation."],
  ["Win it back quickly","Pressing attempts, pressing completions and possession won. Higher weight favours recorded pressing and ball-regain output; it does not measure the time taken to counter-press."],
  ["Defend on the front foot","Interceptions, tackle rate and aerial success. Higher weight favours proactive defensive actions and duel outcomes; it is not a full defensive-positioning measure."],
  ["Intensity","Distance covered per 90 and sprints per 90. Higher weight favours repeat running output; it is not a direct measure of work rate or tactical discipline."]
 ];
 const rows=FM24_PHILOSOPHY_PRINCIPLES.map((p,i)=>'<div class="squad-principle-row"><div><strong>'+esc(p.name)+'</strong><small>'+esc(p.description)+'</small><small class="squad-principle-metrics">Evidence: '+esc(p.metrics.join(" · "))+'</small></div><div class="squad-weight-control"><input type="range" min="0" max="3" step=".5" value="'+(w[i]??0)+'" data-squad-weight="'+i+'" aria-label="'+esc(p.name)+' weight" '+(!role||!a.philosophyTemplate?"disabled":"")+'><output>'+(w[i]??0).toFixed(1)+'</output><div class="squad-weight-track"><span style="width:'+Math.round((w[i]??0)/3*100)+'%"></span></div><small>'+((w[i]??0)===0?"Excluded":(w[i]??0)===3?"Maximum emphasis":(w[i]??0)>=2?"Strong emphasis":(w[i]??0)>=1?"Moderate emphasis":"Light emphasis")+'</small></div></div>').join("");
 const side=guidance.map(([name,description],i)=>'<div class="squad-philosophy-guide"><strong>'+(i+1)+". "+esc(name)+'</strong><p>'+esc(description)+'</p></div>').join("");
 return '<div class="squad-grid-two squad-philosophy-layout"><article class="content-card"><div class="card-kicker">CLUB IDENTITY</div><h2>Define what good football looks like.</h2><p>Choose a starting template, then tune its six principles for a role and duty. These settings are shared with Scouting and Planning.</p><div class="squad-control-grid"><label>Philosophy template<select data-squad-template><option value="">Choose template…</option>'+templates+'</select></label><label>Role and duty lens<select data-squad-role><option value="">Choose role…</option>'+roleOpts+'</select></label></div><div class="squad-section-title"><strong>Principle weights</strong><span>0–3 · 0.5 steps</span></div>'+rows+'<p class="squad-note">Weights are saved per role type and duty. The original role catalogue remains unchanged.</p></article><aside class="content-card squad-philosophy-help"><div class="card-kicker">HOW THE PHILOSOPHY SCORE WORKS</div><h3>What changing a slider actually does</h3><p>A weight controls how strongly that principle influences a player's Philosophy Fit score for the selected role and duty.</p><ul><li><b>0</b> — exclude the principle from the score.</li><li><b>1</b> — give it a light influence.</li><li><b>2</b> — give it twice the influence of weight 1.</li><li><b>3</b> — maximum influence; three times weight 1.</li></ul><p>The score is a weighted average of the available principle percentiles. Raising one weight makes that principle count more relative to the others; it does not change the player's raw statistics or role score.</p><div class="squad-formula">Philosophy Fit = Σ (principle percentile × weight) ÷ Σ available weights</div><p>If a principle's evidence is missing, it cannot contribute. Missing evidence reduces coverage; the overall score is withheld when weighted evidence coverage is below 60%. A zero-weight principle is excluded from both the score and its denominator. If all six weights are zero, no Philosophy Fit score can be calculated.</p><div class="squad-section-title"><strong>What each slider measures</strong><span>Season-export proxies</span></div>'+side+'<p class="squad-note">These are season-output indicators, not direct measurements of tactical execution, pressing structure, off-ball movement or match-engine behaviour.</p></aside></div>';
}
function playerPickerOptions(slot:SquadTacticSlot,rows:PlayerSeasonRecord[],query:string):string{
 const q=query.trim().toLocaleLowerCase(),selected=rows.find(p=>p.uid===slot.playerUid);
 const matches=q.length>=2?rows.filter(p=>[p.displayName,p.position,p.uid].some(v=>v.toLocaleLowerCase().includes(q))).sort((a,b)=>a.displayName.localeCompare(b.displayName)).slice(0,20):[];
 const options:string[]=['<option value="">Unassigned</option>'];
 if(selected)options.push('<option value="'+esc(selected.uid)+'" selected>'+esc(selected.displayName)+' · '+esc(selected.position||"Position unavailable")+' · current</option>');
 for(const p of matches){if(p.uid===selected?.uid)continue;options.push('<option value="'+esc(p.uid)+'">'+esc(p.displayName)+' · '+esc(p.position||"Position unavailable")+'</option>')}
 if(q.length<2)options.push('<option value="" disabled>Type at least 2 characters to search the squad</option>');
 else if(!matches.length)options.push('<option value="" disabled>No matching players found</option>');
 return options.join("");
}
function positionOptionMarkup(position:string):string{
 return Object.entries(strata).map(([key,group])=>'<optgroup label="'+esc(group.label)+'">'+group.slots.map(pos=>'<option value="'+esc(pos)+'"'+(position===pos?" selected":"")+'>'+esc(pos)+'</option>').join("")+'</optgroup>').join("");
}
function tactics(){
 const t=tactic(),rows=clubRows(),slot=t.slots.find(s=>s.id===selectedSlot)??t.slots[0];if(slot)selectedSlot=slot.id;
 const pitch=t.slots.map(s=>{const p=rows.find(x=>x.uid===s.playerUid),r=roles.find(x=>x.id===s.roleId);return '<button class="squad-pitch-slot'+(s.id===selectedSlot?' is-selected':'')+'" type="button" aria-label="Edit '+esc(s.label)+' position" title="Select or drag to reposition" style="left:'+s.x+'%;top:'+s.y+'%" data-tactic-slot="'+esc(s.id)+'"><b>'+esc(p?.displayName??s.label)+'</b><small>'+esc(r?.name??"Choose role")+' · '+esc(r?.dutyName??"—")+'</small></button>'}).join("");
 const roleChoices=slot?roles.filter(r=>r.slots.includes(slot.position)):[];
 const roleOptions=roleChoices.map(r=>'<option value="'+r.id+'"'+(slot?.roleId===r.id?" selected":"")+'>'+esc(r.name)+' · '+esc(r.dutyName)+'</option>').join("");
 const picker=slot?'<div class="squad-player-picker" data-squad-player-picker><label>Find a player<input type="search" data-squad-player-search autocomplete="off" value="'+esc(playerSearchQuery)+'" placeholder="Search name, position or UID…" aria-label="Search squad players"></label><small data-squad-player-count>'+(playerSearchQuery.trim().length>=2?"Showing up to 20 matching players":"Type at least 2 characters. Only your active club is searched.")+'</small><label>Assigned player<select data-squad-slot-player>'+playerPickerOptions(slot,rows,playerSearchQuery)+'</select></label></div>':'';
 const sel=(key:string,label:string,values:string[],value:string)=>'<label>'+label+'<select data-squad-instruction="'+key+'">'+values.map(v=>'<option'+(v===value?" selected":"")+'>'+v+'</option>').join("")+'</select></label>';
 return '<div class="squad-tactics-layout"><article class="content-card"><div class="squad-tactics-toolbar"><div><div class="card-kicker">TACTICAL BOARD · FM24</div><p class="squad-note">Select a shirt to edit it. Drag it to change its pitch position.</p></div><label>Formation<select data-squad-formation>'+formations.map(f=>'<option value="'+f.id+'"'+(f.id===t.formationId?" selected":"")+'>'+f.name+'</option>').join("")+'</select></label></div><div class="squad-pitch"><div class="squad-pitch-half"></div><div class="squad-pitch-circle"></div><div class="squad-pitch-box squad-pitch-box-top"></div><div class="squad-pitch-box squad-pitch-box-bottom"></div>'+pitch+'</div><div class="squad-tactic-summary"><span><b>'+t.slots.filter(s=>s.playerUid).length+'</b> / 11 assigned</span><span><b>'+t.slots.filter(s=>!s.playerUid).length+'</b> unfilled slots</span></div></article><aside class="content-card squad-tactic-editor"><div class="card-kicker">POSITION EDITOR</div><h3>'+esc(slot?.label??"Select a slot")+'</h3>'+(slot?picker+'<label>FM24 position<select data-squad-slot-position>'+positionOptionMarkup(slot.position)+'</select></label><label>Role and duty<select data-squad-slot-role>'+roleOptions+'</select></label><label>Horizontal pitch position · '+slot.x+'%<input type="range" min="5" max="95" step="1" value="'+slot.x+'" data-squad-slot-x></label><label>Vertical pitch position · '+slot.y+'%<input type="range" min="5" max="95" step="1" value="'+slot.y+'" data-squad-slot-y></label><p class="squad-note">Player search is limited to the current club. The exported position string is not a full positional-competence matrix, so assignment remains a manager decision.</p>':'')+
 '<div class="squad-section-title"><strong>Team instructions</strong><span>Saved per career</span></div>'+sel("mentality","Mentality",["Very Defensive","Defensive","Cautious","Balanced","Positive","Attacking","Very Attacking"],t.mentality)+
 '<div class="squad-instruction-group"><b>In Possession</b>'+sel("inPossession.width","Attacking width",["Much Narrower","Narrower","Standard","Fairly Wide","Wider","Much Wider"],t.inPossession.width)+sel("inPossession.passing","Passing directness",["Much Shorter","Shorter","Standard","More Direct","Much More Direct"],t.inPossession.passing)+sel("inPossession.tempo","Tempo",["Much Lower","Lower","Standard","Higher","Much Higher"],t.inPossession.tempo)+sel("inPossession.finalThird","Final third",["Work Ball Into Box","Shoot On Sight","Run At Defence","Mixed"],t.inPossession.finalThird)+'</div>'+
 '<div class="squad-instruction-group"><b>Transition</b>'+sel("transition.win","When possession is won",["Counter","Hold Shape"],t.transition.win)+sel("transition.lose","When possession is lost",["Counter-Press","Regroup"],t.transition.lose)+sel("transition.goalkeeper","Goalkeeper distribution",["Distribute Quickly","Slow Pace Down","Take Short Kicks","Distribute to Centre-Backs","Distribute to Full-Backs"],t.transition.goalkeeper)+'</div>'+
 '<div class="squad-instruction-group"><b>Out of Possession</b>'+sel("outOfPossession.line","Line of engagement",["Much Lower","Lower","Standard","Higher","Much Higher"],t.outOfPossession.line)+sel("outOfPossession.defensiveLine","Defensive line",["Much Lower","Lower","Standard","Higher","Much Higher"],t.outOfPossession.defensiveLine)+sel("outOfPossession.pressing","Trigger press",["Much Less Often","Less Often","Standard","More Often","Much More Often"],t.outOfPossession.pressing)+sel("outOfPossession.approach","Defensive approach",["Prevent Short GK Distribution","Invite Short GK Distribution","Trap Outside","Trap Inside","Stay On Feet"],t.outOfPossession.approach)+'</div></aside></div><p class="player-data-footnote">This is a tactical planning board, not a match-engine simulator. It does not infer familiarity or predict results.</p>';
}
function overview(){
 const rows=clubRows();if(!club)return '<section class="content-card"><h2>Set your current club</h2><p>Choose your club in Data & Saves to isolate its imported player records.</p></section>';
 if(!rows.length)return '<section class="content-card"><h2>No matching club records</h2><p>The active club is matched exactly against the imported Club field.</p></section>';
 const ageKey=Object.keys(rows[0].rawValues).find(k=>["age","age (years)"].includes(k.toLowerCase()));
 const ages=rows.map(p=>ageKey?Number.parseFloat(p.rawValues[ageKey]??""):NaN).filter(Number.isFinite);
 const bins=[["U21",0,20],["21–24",21,24],["25–28",25,28],["29–32",29,32],["33+",33,100]];
 const counts=bins.map(([l,min,max])=>({l:String(l),n:ages.filter(a=>a>=Number(min)&&a<=Number(max)).length}));
 const pos=new Map<string,number>();rows.forEach(p=>{const k=p.position.trim()||"Not supplied";pos.set(k,(pos.get(k)??0)+1)});
 const bars=(items:Array<{l:string;n:number}>)=>items.map(x=>'<div class="squad-chart-row"><span>'+esc(x.l)+'</span><div class="squad-chart-track"><i style="width:'+Math.round(x.n/Math.max(1,...items.map(y=>y.n))*100)+'%"></i></div><b>'+x.n+'</b></div>').join("");
 return '<div class="squad-overview-stats"><article class="content-card"><span>Players at '+esc(club)+'</span><strong>'+rows.length+'</strong><small>Exact club match</small></article><article class="content-card"><span>Age values</span><strong>'+ages.length+'/'+rows.length+'</strong><small>Readable source values</small></article><article class="content-card"><span>Position labels</span><strong>'+pos.size+'</strong><small>Distinct exported strings</small></article></div><div class="squad-grid-two"><article class="content-card"><div class="card-kicker">AGE PROFILE</div><h3>Squad age distribution</h3>'+(ages.length?bars(counts):'<p>Age is unavailable in this export.</p>')+'</article><article class="content-card"><div class="card-kicker">POSITION PROFILE</div><h3>Imported position labels</h3>'+bars([...pos.entries()].map(([l,n])=>({l,n})).sort((a,b)=>b.n-a.n).slice(0,8))+'<p class="squad-note">Counts use exact source position strings, not inferred positional eligibility or role depth.</p></article></div>';
}
function depth(){
 const t=tactic(),rows=clubRows(),assigned=t.slots.filter(s=>s.playerUid&&rows.some(p=>p.uid===s.playerUid)).length;
 return '<section class="content-card"><div class="card-kicker">TACTIC-BASED COVERAGE</div><h2>'+esc(t.name)+'</h2><p>'+assigned+' of '+t.slots.length+' slots have an assigned player.</p><div class="squad-coverage-track"><i style="width:'+Math.round(assigned/t.slots.length*100)+'%"></i></div><div class="player-table-wrap"><table class="player-data-table"><thead><tr><th>Slot</th><th>Required role</th><th>Assigned player</th></tr></thead><tbody>'+t.slots.map(s=>'<tr><td>'+esc(s.label)+' · '+esc(s.position)+'</td><td>'+esc(roles.find(r=>r.id===s.roleId)?.name??"—")+' · '+esc(roles.find(r=>r.id===s.roleId)?.dutyName??"—")+'</td><td>'+esc(rows.find(p=>p.uid===s.playerUid)?.displayName??"Unassigned")+'</td></tr>').join("")+'</tbody></table></div><p class="squad-note">This is assigned XI coverage, not a complete depth ranking. Next step is scoring all squad players against each slot using the existing scoring worker.</p></section>';
}
export function renderSquadWorkspace(save:SaveWithDatasets|undefined,did:string,playersHtml:string,render:()=>void):string{
 if(!save||!save.datasets.length)return playersHtml;
 if(saveId!==save.save.id||datasetId!==did){if(!loading)void load(save,did,render);return '<section class="content-card"><h2>Loading Squad workspace…</h2><p>Reading the selected season and saved settings.</p></section>'}
 if(loading)return '<section class="content-card"><h2>Loading Squad workspace…</h2></section>';
 const body=tab==="players"?playersHtml:tab==="tactics"?tactics():tab==="philosophy"?philosophy():tab==="depth"?depth():overview();
 return '<nav class="squad-subnav" aria-label="Squad sections">'+tabs.map(x=>'<button type="button" data-squad-tab="'+x.id+'" class="'+(tab===x.id?"is-active":"")+'"><strong>'+x.label+'</strong><small>'+x.hint+'</small></button>').join("")+'</nav>'+(message?'<p class="squad-workspace-message" role="status">'+esc(message)+'</p>':"")+body;
}
export function listFm24FormationIds():string[]{return formations.map(f=>f.id)}
export function handleSquadWorkspaceInput(target:HTMLInputElement):boolean{
 if(!target.matches("[data-squad-player-search]"))return false;
 playerSearchQuery=target.value;
 const wrapper=target.closest<HTMLElement>("[data-squad-player-picker]");
 const select=wrapper?.querySelector<HTMLSelectElement>("[data-squad-slot-player]");
 const count=wrapper?.querySelector<HTMLElement>("[data-squad-player-count]");
 const slot=tactic().slots.find(s=>s.id===selectedSlot);
 if(!wrapper||!select||!count||!slot)return true;
 select.innerHTML=playerPickerOptions(slot,clubRows(),playerSearchQuery);
 const q=playerSearchQuery.trim();
 const total=q.length>=2?clubRows().filter(p=>[p.displayName,p.position,p.uid].some(v=>v.toLocaleLowerCase().includes(q.toLocaleLowerCase()))).length:0;
 count.textContent=q.length<2?"Type at least 2 characters. Only your active club is searched.":total?("Found "+total+" player(s); showing up to 20. Refine your search if needed."):"No players match that search.";
 return true;
}
export function handleSquadWorkspacePointerDown(event:PointerEvent):boolean{
 const button=(event.target as HTMLElement).closest<HTMLElement>("[data-tactic-slot]");
 const pitch=button?.closest<HTMLElement>(".squad-pitch");
 if(!button||!pitch)return false;
 const id=button.dataset.tacticSlot??"";
 if(!id)return false;
 selectedSlot=id;
 const current=tactic().slots.find(slot=>slot.id===id);
 activePitchDrag={slotId:id,pointerId:event.pointerId,pitch,button,x:current?.x??50,y:current?.y??50,moved:false};
 try{button.setPointerCapture(event.pointerId)}catch{}
 return true;
}
export function handleSquadWorkspacePointerMove(event:PointerEvent):boolean{
 const drag=activePitchDrag;if(!drag||drag.pointerId!==event.pointerId)return false;
 const rect=drag.pitch.getBoundingClientRect();
 if(!rect.width||!rect.height)return true;
 const x=clampTacticCoordinate((event.clientX-rect.left)/rect.width*100);
 const y=clampTacticCoordinate((event.clientY-rect.top)/rect.height*100);
 if(Math.abs(x-drag.x)>0||Math.abs(y-drag.y)>0)drag.moved=true;
 drag.x=x;drag.y=y;drag.button.style.left=x+"%";drag.button.style.top=y+"%";
 return true;
}
export async function handleSquadWorkspacePointerUp(event:PointerEvent,render:()=>void):Promise<boolean>{
 const drag=activePitchDrag;if(!drag||drag.pointerId!==event.pointerId)return false;
 activePitchDrag=null;
 try{drag.button.releasePointerCapture(event.pointerId)}catch{}
 if(drag.moved){
  const t=tactic();
  state.squadTactics={...t,slots:t.slots.map(s=>s.id===drag.slotId?{...s,x:drag.x,y:drag.y}:s),updatedAt:new Date().toISOString()};
  await persist(render);
 }
 return true;
}
export async function handleSquadWorkspaceClick(target:HTMLElement,render:()=>void):Promise<boolean>{
 if(target.dataset.squadTab){tab=target.dataset.squadTab as Tab;render();return true}
 if(target.dataset.tacticSlot){selectedSlot=target.dataset.tacticSlot;playerSearchQuery="";render();return true}
 return false;
}
export async function handleSquadWorkspaceChange(target:HTMLElement,render:()=>void):Promise<boolean>{
 const t=tactic();
 if(target instanceof HTMLInputElement&&(target.matches("[data-squad-slot-x]")||target.matches("[data-squad-slot-y]"))){
  const axis=target.matches("[data-squad-slot-x]")?"x":"y",coordinate=clampTacticCoordinate(Number(target.value));
  state.squadTactics={...t,slots:t.slots.map(s=>s.id===selectedSlot?{...s,[axis]:coordinate}:s),updatedAt:new Date().toISOString()};
  await persist(render);return true;
 }
 if(target instanceof HTMLSelectElement&&target.matches("[data-squad-formation]")){
  const f=formations.find(x=>x.id===target.value);if(!f)return true;
  state.squadTactics={...t,name:f.name,formationId:f.id,slots:buildFormationSlots(f.id,t.slots),updatedAt:new Date().toISOString()};selectedSlot=state.squadTactics.slots[0]?.id??"";await persist(render);return true;
 }
 if(target instanceof HTMLSelectElement&&target.matches("[data-squad-slot-player]")){
  state.squadTactics={...t,slots:t.slots.map(s=>({...s,playerUid:s.id===selectedSlot?target.value:target.value&&s.playerUid===target.value?"":s.playerUid})),updatedAt:new Date().toISOString()};await persist(render);return true;
 }
 if(target instanceof HTMLSelectElement&&target.matches("[data-squad-slot-position]")){
  const position=target.value;if(!Object.values(strata).some(group=>group.slots.includes(position)))return true;
  state.squadTactics={...t,slots:t.slots.map(s=>s.id===selectedSlot?{...s,position,roleId:defaultRole(position)}:s),updatedAt:new Date().toISOString()};await persist(render);return true;
 }
 if(target instanceof HTMLSelectElement&&target.matches("[data-squad-slot-role]")){
  state.squadTactics={...t,slots:t.slots.map(s=>s.id===selectedSlot?{...s,roleId:target.value}:s),updatedAt:new Date().toISOString()};await persist(render);return true;
 }
 if(target instanceof HTMLSelectElement&&target.dataset.squadInstruction){
  const path=target.dataset.squadInstruction.split(".");const g=path[0]??"";const k=path[1]??"";
  if(g==="mentality")t.mentality=target.value;
  else if(g==="inPossession"||g==="transition"||g==="outOfPossession")(t[g] as Record<string,string>)[k]=target.value;
  state.squadTactics={...t,updatedAt:new Date().toISOString()};await persist(render);return true;
 }
 if(target instanceof HTMLSelectElement&&target.matches("[data-squad-template]")){
  const a=state.analysis??emptyScoutingWorkspaceState().analysis!,r=roles.find(x=>x.id===a.roleId),custom={...(a.customPhilosophyWeightsByRole??{})};if(r)delete custom[r.type+"|"+r.duty];
  state.analysis={...a,philosophyTemplate:target.value as NonNullable<ScoutingWorkspaceState["analysis"]>["philosophyTemplate"],customPhilosophyWeightsByRole:custom};await persist(render);return true;
 }
 if(target instanceof HTMLSelectElement&&target.matches("[data-squad-role]")){
  state.analysis={...(state.analysis??emptyScoutingWorkspaceState().analysis!),roleId:target.value};await persist(render);return true;
 }
 if(target instanceof HTMLInputElement&&target.matches("[data-squad-weight]")){
  const a=state.analysis??emptyScoutingWorkspaceState().analysis!,r=roles.find(x=>x.id===a.roleId);if(!r||!a.philosophyTemplate)return true;
  const key=r.type+"|"+r.duty,base=a.customPhilosophyWeightsByRole?.[key]??philosophyWeightsForRole(r as never,a.philosophyTemplate),w=[...base],i=Number(target.dataset.squadWeight);if(i<0||i>5)return true;
  w[i]=Math.max(0,Math.min(3,Number(target.value)));state.analysis={...a,customPhilosophyWeightsByRole:{...(a.customPhilosophyWeightsByRole??{}),[key]:w}};await persist(render);return true;
 }
 return false;
}
