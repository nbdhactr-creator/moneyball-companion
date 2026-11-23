import {FM24_STAT_META,FM24_STRATA} from "./analytics/fm24-role-catalog.ts";

// Beta 3: clear, opt-in positional benchmarking. No fixed creator thresholds.
// These are presentation presets, not hidden changes to the role score weights.
const PRESETS = {
  GK: [["Save %","Save percentage"],["Con/90","Goals conceded / 90"],["CS/Start","Clean sheets / start"]],
  DC: [["Poss Won/90","Possession won / 90"],["Int/90","Interceptions / 90"],["Hdr %","Headers won %"]],
  DLR: [["Asts/90","Assists / 90"],["Drb/90","Dribbles / 90"],["Poss Won/90","Possession won / 90"]],
  WB: [["Asts/90","Assists / 90"],["Drb/90","Dribbles / 90"],["Poss Won/90","Possession won / 90"]],
  DM: [["Pr passes/90","Progressive passes / 90"],["Poss Won/90","Possession won / 90"],["Tck R","Tackle win %"]],
  MC: [["Pr passes/90","Progressive passes / 90"],["OP-KP/90","Open-play key passes / 90"],["Asts/90","Assists / 90"]],
  MLR: [["Asts/90","Assists / 90"],["Drb/90","Dribbles / 90"],["OP-KP/90","Open-play key passes / 90"]],
  AMC: [["OP-KP/90","Open-play key passes / 90"],["xA/90","Expected assists / 90"],["Gls/90","Goals / 90"]],
  AMLR: [["Gls/90","Goals / 90"],["Asts/90","Assists / 90"],["Drb/90","Dribbles / 90"]],
  ST: [["Gls/90","Goals / 90"],["npxG/90","Non-penalty xG / 90"],["Asts/90","Assists / 90"]],
};
export const MIN_BENCHMARK_PEERS = 10;
export const normDivision = d=>String(d??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLocaleLowerCase();
const decimal=v=>typeof v==="number"&&Number.isFinite(v)?v:null;
const meta=key=>{
  const tuple=FM24_STAT_META[key];
  return tuple ? {direction:tuple[1],floor:tuple[3]} : {direction:1,floor:null};
};
const qualifies=(p,key)=>{
  const {floor}=meta(key);
  return !floor || (decimal(p.stats[floor[0]])!==null && p.stats[floor[0]]>=floor[1]);
};
const eligible=(p,role)=> (FM24_STRATA[role.strata]?.slots??role.slots??[]).some(slot=>p.positionSlots.has(slot));
const quantile=(a,p)=>{
  if(!a.length)return null;
  const at=(a.length-1)*p, i=Math.floor(at),j=Math.ceil(at);
  return a[i]+(a[j]-a[i])*(at-i);
};
export function essentialMetrics(role){
  if(!role)return [];
  const preset=PRESETS[role.strata];
  if(preset)return preset;
  return Object.entries(role.w??{}).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([key])=>[key,key]);
}
export function createReference(scorer,role,{division="",scope="division"}={}){
  if(!role) return {scope:"none",division:"",poolMin:scorer.poolMinimumMinutes,metrics:[]};
  const inDivision=scope==="division",key=normDivision(division),metrics=essentialMetrics(role);
  const pool=scorer.players.filter(p=>(p.minutes??0)>=scorer.poolMinimumMinutes&&eligible(p,role)&&(!inDivision||(key&&normDivision(p.division)===key)));
  const entries=metrics.map(([metric,label])=>{
    const direction=meta(metric).direction;
    const values=pool.filter(p=>qualifies(p,metric)).map(p=>decimal(p.stats[metric])).filter(x=>x!==null).sort((a,b)=>a-b);
    return {metric,label,direction,n:values.length,median:values.length>=MIN_BENCHMARK_PEERS?quantile(values,.5):null,strong:values.length>=MIN_BENCHMARK_PEERS?quantile(values,direction<0?.2:.8):null,values};
  });
  return {scope:inDivision?"division":"all",division:inDivision?division:"",poolMin:scorer.poolMinimumMinutes,positionGroup:FM24_STRATA[role.strata]?.label??role.strata,eligiblePlayerCount:pool.length,metrics:entries};
}
export function percentileRank(value,ascending,direction=1){
  if(value==null||ascending.length<MIN_BENCHMARK_PEERS)return null;
  let lo=0,hi=ascending.length;
  while(lo<hi){const m=(lo+hi)>>>1;if(ascending[m]<value)lo=m+1;else hi=m;}
  const below=lo;hi=ascending.length;
  while(lo<hi){const m=(lo+hi)>>>1;if(ascending[m]<=value)lo=m+1;else hi=m;}
  const rank=(below+.5*(lo-below))/ascending.length*100;
  return Math.round((direction<0?100-rank:rank)*10)/10;
}
export function explainForPlayer(player,role,reference){
  if(!reference)return [];
  const positionOK=Boolean(player&&eligible(player,role));
  return reference.metrics.map(m=>{
    const value=decimal(player?.stats[m.metric]);
    let reason="";
    if(!positionOK)reason="Not in this position group";
    else if(value===null)reason="Stat missing or not derivable from this export";
    else if(!qualifies(player,m.metric))reason="Minimum attempts for this metric not met";
    else if(m.n<MIN_BENCHMARK_PEERS)reason="Fewer than 10 eligible peers with this metric";
    const percentile=reason?null:percentileRank(value,m.values,m.direction);
    const label=percentile===null?"Unassessed":percentile>=80?"Top 20% of peers":percentile>=60?"Above peer midpoint":percentile>=40?"Near peer midpoint":"Below peer midpoint";
    return {metric:m.metric,label:m.label,value,percentile,interpretation:label,reason};
  });
}
export function referenceSummary(reference){
  return {scope:reference.scope,division:reference.division,poolMin:reference.poolMin,positionGroup:reference.positionGroup,eligiblePlayerCount:reference.eligiblePlayerCount,metrics:reference.metrics.map(({metric,label,direction,n,median,strong})=>({metric,label,direction,n,median,strong}))};
}
export function formatMetric(value,metric){
  if(value==null||!Number.isFinite(value))return "Not supplied";
  const fraction=new Set(["Save %","CS/Start","Catch rate","Pen save %"]);
  if(fraction.has(metric))return (value*100).toFixed(1)+"%";
  if(metric.includes("%")||metric==="Tck R")return value.toFixed(1)+"%";
  return value.toFixed(2).replace(/0+$/,"").replace(/\.$/,"");
}
export function referenceExplanation(summary){
  if(!summary||summary.scope==="none")return "Choose a role for relevant positional benchmarks.";
  const group=summary.scope==="division"?"Division: "+(summary.division||"not specified"):"All divisions";
  return group+" · "+summary.positionGroup+" · reference players with "+summary.poolMin+"+ minutes. Each metric also requires enough attempts and at least 10 comparable peers.";
}
