
import {getDatasetPlayers,getScoutingWorkspaceState,getPlayerHistory} from "./data/storage/local-database";
import {createFm24Scorer,philosophyWeightsForRole} from "./analytics/fm24-scoring";
import {createDefaultTactic} from "./data/squad-workspace";
import {searchRows} from "./beta-domain";
import {createReference,referenceSummary,explainForPlayer} from "./beta-benchmarks";
let loadedId,records=[],scorer,byUid=new Map(),normalByUid=new Map(),scoreRoleId,scores=new Map(),facets;
let benchmarkCache=new Map();
const values=key=>[...new Set(records.map(p=>p.rawValues[key]).filter(v=>v&&v!=="-"&&v!=="—"))].sort((a,b)=>a.localeCompare(b));
const quick=role=>{
  if(role?.slots.includes("D-C"))return [["Hdr %","Header win %"],["Tck R","Tackle success %"]];
  const known=new Set(facets.fields);
  const preferred=Object.entries(role?.w??{}).sort((a,b)=>b[1]-a[1]).filter(([key])=>known.has(key)).map(([key])=>[key,key]);
  return [...preferred,...[["Mins","Minutes"],["Av Rat","Avg. rating"]].filter(([key])=>!preferred.some(([k])=>k===key))].slice(0,2);
};
async function handle({season,career,q,view,tracked,club}){
  if(loadedId!==season){
    records=[];scorer=undefined;byUid.clear();normalByUid.clear();scores.clear();benchmarkCache.clear();loadedId=undefined;
    const next=await getDatasetPlayers(season);
    records=next;loadedId=season;scorer=undefined;scoreRoleId=undefined;scores=new Map();byUid=new Map(records.map(p=>[p.uid,p]));
    const fields=new Set();for(const p of records)for(const key of Object.keys(p.rawValues))fields.add(key);
    facets={leagues:values("Division"),feet:values("Preferred Foot"),fields:[...fields].sort()};
  }
  const getRole=id=>{
    if(!id)return;
    if(!scorer){
      scorer=createFm24Scorer(records.map(p=>({uid:p.uid,displayName:p.displayName,position:p.position,club:p.club,division:p.rawValues.Division??"",rawValues:p.rawValues})),{metricMetadataVersion:"fm24-v2"});
      normalByUid=new Map(scorer.players.map(p=>[p.uid,p]));
    }
    return scorer.roles.find(r=>r.id===id);
  };
  const referenceFor=(role,division,scope)=>{
    if(!role)return null;
    const mode=scope==="all"||!division?"all":"division";
    const cacheKey=[role.id,mode,mode==="division"?division:""].join("|");
    if(!benchmarkCache.has(cacheKey))benchmarkCache.set(cacheKey,createReference(scorer,role,{scope:mode,division}));
    return benchmarkCache.get(cacheKey);
  };
  const key=s=>(s??"").trim().toLocaleLowerCase();
  const listedPosition=(normal,role)=>Boolean(normal&&role?.slots.some(slot=>normal.positionSlots.has(slot)));
  if(view==="scouting"){
    const role=getRole(q.role);
    if(q.role&&!role)throw new Error("Choose a valid FM24 role and duty.");
    if(role?.id!==scoreRoleId){
      scores=new Map();scoreRoleId=role?.id;
      if(role)for(const p of scorer.players){const listed=role.slots.some(slot=>p.positionSlots.has(slot));if(listed)scores.set(p.uid,{listed,score:scorer.scoreRole(p,role).score});}
    }
    const effectiveMinutes=q.minutes==null&&role?scorer.poolMinimumMinutes:q.minutes;
    const found=searchRows(records,{...q,role:role?.id,minutes:effectiveMinutes},scores,tracked);
    const pages=Math.max(1,Math.ceil(found.length/12)),page=Math.min(pages,Math.max(1,parseInt(q.p,10)||1));
    const reference=role?referenceFor(role,q.league,q.peer==="all"?"all":"division"):null;
    const stats=quick(role), cols=["Age","Height","Division","Preferred Foot","Expires","Transfer Value","Wage","Level",...stats.map(([k])=>k)];
    return {...facets,defaultMinutes:effectiveMinutes,total:found.length,pages,page,stats,benchmark:reference?referenceSummary(reference):null,shortlistCount:tracked.length,players:found.slice((page-1)*12,page*12).map(p=>({uid:p.uid,name:p.displayName,club:p.club,position:p.position,score:scores.get(p.uid)?.score??null,f:Object.fromEntries(cols.map(k=>[k,p.rawValues[k]])),essentials:reference?explainForPlayer(normalByUid.get(p.uid),role,reference):[]}))};
  }
  const saved=await getScoutingWorkspaceState(career);
  const teamView=view==="squad"||view==="planning";
  const shortlistView=view==="shortlist";
  const tactic=(teamView||shortlistView)?(saved.squadTactics?.slots.length?saved.squadTactics:createDefaultTactic()):null;
  const slot=tactic?.slots.find(s=>s.id===q.slot)??tactic?.slots[0];
  const role=getRole(teamView?slot?.roleId:shortlistView?(q.role||(q.slot?slot?.roleId:"")):q.lens??q.role);
  if((q.role||q.lens)&&!role)throw new Error("The selected role is unavailable in FM24.");
  const findNormal=uid=>normalByUid.get(uid);
  const template=q.philosophy??saved.analysis?.philosophyTemplate??"";
  const resultFor=raw=>{
    if(!raw)return null;
    const normal=role?findNormal(raw.uid):null;
    const fit=normal?scorer.scoreRole(normal,role):null;
    const philosophy=normal&&template?scorer.scorePhilosophy(normal,role,saved.analysis?.philosophyTemplate===template?(saved.analysis.customPhilosophyWeightsByRole?.[role.type+"|"+role.duty]??philosophyWeightsForRole(role,template)):philosophyWeightsForRole(role,template)):null;
    return {p:raw,fit,philosophy,listed:normal?listedPosition(normal,role):null};
  };

  if(shortlistView){
    const roster=club?records.filter(p=>key(p.club)===key(club)):[];
    const inClub=new Map(roster.map(p=>[p.uid,p]));
    const savedStatuses=new Set(["watching","shortlist","revisit"]);
    const savedIds=Object.entries(saved.players??{}).filter(([,x])=>savedStatuses.has(x.status)).map(([uid])=>uid);
    const ids=[...new Set([...tracked,...savedIds])].filter(uid=>byUid.has(uid));
    const baselineUid=q.starter||slot?.playerUid||"";
    const baseline=inClub.get(baselineUid)||null;
    const listed=ids.map(uid=>byUid.get(uid));
    const requested=Object.hasOwn(q,"picks")?String(q.picks).split(",").filter(Boolean):ids.slice(0,6);
    const chosen=[...new Set(requested)].filter(uid=>ids.includes(uid)&&uid!==baseline?.uid).slice(0,6);
    const clubDivision=baseline?.rawValues.Division||roster.find(p=>p.rawValues.Division)?.rawValues.Division||"";
    const ref=role?referenceFor(role,clubDivision,q.peer==="all"?"all":"division"):null;
    const annotate=p=>{
      const x=resultFor(p);
      if(!x)return null;
      return {...x,essentials:ref?explainForPlayer(findNormal(p.uid),role,ref):[]};
    };
    return {roleId:role?.id||"",slot,club,template,baseline:annotate(baseline),
      choices:listed.map(p=>({uid:p.uid,name:p.displayName,club:p.club})),
      selected:chosen,candidates:chosen.map(uid=>annotate(byUid.get(uid))).filter(Boolean),
      baselineOptions:roster.map(p=>({uid:p.uid,name:p.displayName,club:p.club})).sort((a,b)=>a.name.localeCompare(b.name)),
      benchmark:ref?referenceSummary(ref):null,sourceCount:ids.length};
  }
  if(teamView){
    const key=s=>(s??"").trim().toLocaleLowerCase(), clubKey=key(club);
    const roster=clubKey?records.filter(p=>key(p.club)===clubKey):[];
    const clubByUid=new Map(roster.map(p=>[p.uid,p]));
    const brief=p=>({uid:p.uid,name:p.displayName,club:p.club,position:p.position});
    const assigned=clubByUid.has(slot.playerUid)?slot.playerUid:"";
    if(view==="squad"){
      const cover=role?roster.filter(p=>role.slots.some(s=>findNormal(p.uid)?.positionSlots.has(s))).map(resultFor):[];
      cover.sort((a,b)=>(b.fit?.score??-1)-(a.fit?.score??-1)||a.p.displayName.localeCompare(b.p.displayName));
      return {tactic,slot,club,assigned,slots:tactic.slots.map(s=>({id:s.id,label:s.label,roleId:s.roleId,saved:Boolean(s.playerUid),player:clubByUid.has(s.playerUid)?brief(clubByUid.get(s.playerUid)):null})),cover:cover.slice(0,8),coverCount:cover.length,scoredCount:cover.filter(x=>x.fit?.score!=null).length};
    }
    const baseline=clubByUid.get(q.starter??assigned);
    const target=q.target!==baseline?.uid?byUid.get(q.target):null;
    const term=key(q.find), exclude=p=>p.uid!==baseline?.uid;
    const matches=term?records.filter(p=>exclude(p)&&[p.displayName,p.club].some(v=>key(v).includes(term))).slice(0,20).map(brief):[];
    const ids=new Set([...tracked,...Object.entries(saved.players??{}).filter(([,v])=>["watching","scouted","bid","signed"].includes(String(v.status).toLowerCase())).map(([uid])=>uid)]);
    return {tactic,slot,assigned,template,roster:roster.map(brief).sort((a,b)=>a.name.localeCompare(b.name)),baseline:resultFor(baseline),target:resultFor(target),matches,shortlist:[...ids].map(uid=>byUid.get(uid)).filter(p=>p&&exclude(p)).slice(0,20).map(brief)};
  }
  const p=byUid.get(q.uid);if(!p)return {missing:true};
  const primary=resultFor(p);
  const ref=role?referenceFor(role,p.rawValues.Division,q.peer==="all"?"all":"division"):null;
  const benchmark=ref?referenceSummary(ref):null;
  const essentials=ref?explainForPlayer(findNormal(p.uid),role,ref):[];
  if(view==="compare"){
    const term=(q.compareName||"").trim().toLocaleLowerCase();
    const matches=term?records.filter(x=>x.uid!==p.uid&&[x.displayName,x.club].some(v=>v.toLocaleLowerCase().includes(term))).slice(0,20).map(x=>({uid:x.uid,name:x.displayName,club:x.club})):[]; 
    const secondary=resultFor(q.other!==p.uid?byUid.get(q.other):null);
    return {primary,secondary,secondaryEssentials:secondary&&ref?explainForPlayer(findNormal(secondary.p.uid),role,ref):[],matches,stats:quick(role),benchmark,essentials};
  }
  const history=(await getPlayerHistory(career,p.uid)).map(x=>({label:x.dataset.seasonLabel,club:x.player?.club,minutes:x.player?.rawValues.Mins,present:Boolean(x.player)}));
  return {primary,history,template,benchmark,essentials,pool:scorer?.poolMinimumMinutes,medium:scorer?.mediumConfidenceMinutes,high:scorer?.highConfidenceMinutes,stats:quick(role)};
}
let pending=Promise.resolve();
self.onmessage=e=>{const request=e.data;pending=pending.then(async()=>{try{self.postMessage({id:request.id,data:await handle(request)});}catch(error){self.postMessage({id:request.id,error:error instanceof Error?error.message:"Could not read or score this season."});}});};
