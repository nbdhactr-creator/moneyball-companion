
import {getDatasetPlayers,getScoutingWorkspaceState,getPlayerHistory} from "./data/storage/local-database";
import {createFm24Scorer,philosophyWeightsForRole} from "./analytics/fm24-scoring";
import {searchRows} from "./beta-domain";
let loadedId,records=[],scorer,byUid=new Map(),scoreRoleId,scores=new Map(),facets;
const values=key=>[...new Set(records.map(p=>p.rawValues[key]).filter(v=>v&&v!=="-"&&v!=="—"))].sort((a,b)=>a.localeCompare(b));
const quick=role=>{
  if(role?.slots.includes("D-C"))return [["Hdr %","Header win %"],["Tck R","Tackle success %"]];
  const known=new Set(facets.fields);
  const preferred=Object.entries(role?.w??{}).sort((a,b)=>b[1]-a[1]).filter(([key])=>known.has(key)).map(([key])=>[key,key]);
  return [...preferred,...[["Mins","Minutes"],["Av Rat","Avg. rating"]].filter(([key])=>!preferred.some(([k])=>k===key))].slice(0,2);
};
async function handle({season,career,q,view,tracked}){
  if(loadedId!==season){
    records=[];scorer=undefined;byUid.clear();scores.clear();loadedId=undefined;
    const next=await getDatasetPlayers(season);
    records=next;loadedId=season;scorer=undefined;scoreRoleId=undefined;scores=new Map();byUid=new Map(records.map(p=>[p.uid,p]));
    const fields=new Set();for(const p of records)for(const key of Object.keys(p.rawValues))fields.add(key);
    facets={leagues:values("Division"),feet:values("Preferred Foot"),fields:[...fields].sort()};
  }
  const getRole=id=>{
    if(!id)return;
    scorer??=createFm24Scorer(records.map(p=>({uid:p.uid,displayName:p.displayName,position:p.position,club:p.club,division:p.rawValues.Division??"",rawValues:p.rawValues})));
    return scorer.roles.find(r=>r.id===id);
  };
  if(view==="scouting"){
    const role=getRole(q.role);
    if(role?.id!==scoreRoleId){
      scores=new Map();scoreRoleId=role?.id;
      if(role)for(const p of scorer.players){const listed=role.slots.some(slot=>p.positionSlots.has(slot));if(listed)scores.set(p.uid,{listed,score:scorer.scoreRole(p,role).score});}
    }
    const found=searchRows(records,{...q,role:role?.id},scores,tracked);
    const pages=Math.max(1,Math.ceil(found.length/12)),page=Math.min(pages,Math.max(1,parseInt(q.p,10)||1));
    const stats=quick(role), cols=["Age","Height","Division","Preferred Foot","Expires","Transfer Value","Wage","Level",...stats.map(([k])=>k)];
    return {...facets,total:found.length,pages,page,stats,players:found.slice((page-1)*12,page*12).map(p=>({uid:p.uid,name:p.displayName,club:p.club,position:p.position,score:scores.get(p.uid)?.score??null,f:Object.fromEntries(cols.map(k=>[k,p.rawValues[k]]))}))};
  }
  const p=byUid.get(q.uid);if(!p)return {missing:true};
  const role=getRole(q.lens??q.role), saved=await getScoutingWorkspaceState(career);
  const template=q.philosophy??saved.analysis?.philosophyTemplate??"";
  const resultFor=raw=>{
    if(!raw)return null;
    const normal=role?scorer.players.find(x=>x.uid===raw.uid):null;
    const fit=normal?scorer.scoreRole(normal,role):null;
    const philosophy=normal&&template?scorer.scorePhilosophy(normal,role,saved.analysis?.philosophyTemplate===template?(saved.analysis.customPhilosophyWeightsByRole?.[role.type+"|"+role.duty]??philosophyWeightsForRole(role,template)):philosophyWeightsForRole(role,template)):null;
    return {p:raw,fit,philosophy,listed:normal?role.slots.some(s=>normal.positionSlots.has(s)):null};
  };
  const primary=resultFor(p);
  if(view==="compare"){
    const term=(q.compareName||"").trim().toLocaleLowerCase();
    const matches=term?records.filter(x=>x.uid!==p.uid&&[x.displayName,x.club].some(v=>v.toLocaleLowerCase().includes(term))).slice(0,20).map(x=>({uid:x.uid,name:x.displayName,club:x.club})):[]; 
    return {primary,secondary:resultFor(q.other!==p.uid?byUid.get(q.other):null),matches,stats:quick(role)};
  }
  const history=(await getPlayerHistory(career,p.uid)).map(x=>({label:x.dataset.seasonLabel,club:x.player?.club,minutes:x.player?.rawValues.Mins,present:Boolean(x.player)}));
  return {primary,history,template,pool:scorer?.poolMinimumMinutes,medium:scorer?.mediumConfidenceMinutes,high:scorer?.highConfidenceMinutes,stats:quick(role)};
}
let pending=Promise.resolve();
self.onmessage=e=>{const request=e.data;pending=pending.then(async()=>{try{self.postMessage({id:request.id,data:await handle(request)});}catch(error){self.postMessage({id:request.id,error:error instanceof Error?error.message:"Could not read or score this season."});}});};
