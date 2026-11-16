
export const n=v=>typeof v==="string"&&/^\d[\d,]*(?:\.\d+)?%?$/.test(v.trim())?Number(v.trim().replace(/[,%]/g,"")):null;
export function money(v,currency){
  if(!v||/not for sale/i.test(v))return null;
  const symbols=[...new Set(v.match(/[£€$]/g)||[])];
  if(symbols.length!==1||symbols[0]!==currency)return null;
  const parts=v.replace(/(?:\s*(?:p\/w|\/wk|\/week))$/i,"").trim().split(/\s*[–—-]\s*/);
  const values=parts.map(part=>{
    const m=part.match(/^[£€$]?\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*([kmb])?$/i);
    return m?Number(m[1].replace(/,/g,""))*({k:1e3,m:1e6,b:1e9}[m[2]?.toLowerCase()]||1):NaN;
  });
  return values.length<=2&&values.every(Number.isFinite)?Math.max(...values):null;
}
export function searchRows(records,q,scores,tracked=[]){
  const term=(q.q||"").trim().toLocaleLowerCase(), currency=q.currency||"£";
  const cap=(value,key,scale)=>n(q[key])===null||(value!==null&&value<=n(q[key])*scale);
  const floor=(value,key)=>n(q[key])===null||(value!==null&&value>=n(q[key]));
  const match=records.filter(p=>{
    const f=p.rawValues, fit=scores.get(p.uid);
    return (!q.role||fit?.listed)&&(!term||[p.displayName,p.club].some(v=>v.toLocaleLowerCase().includes(term)))&&
      (!q.league||f.Division===q.league)&&(!q.foot||f["Preferred Foot"]===q.foot)&&
      floor(n(f.Age),"ageMin")&&cap(n(f.Age),"ageMax",1)&&floor(n(f.Mins),"minutes")&&
      cap(money(f["Transfer Value"],currency),"value",1e6)&&cap(money(f.Wage,currency),"wage",1e3)&&
      floor(fit?.score??null,"minScore")&&(!q.stat||floor(n(f[q.stat]),"statMin"))&&(!q.tracked||tracked.includes(p.uid));
  });
  match.sort((a,b)=>(q.sort==="name"?0:q.sort==="age"?(n(a.rawValues.Age)??Infinity)-(n(b.rawValues.Age)??Infinity):q.sort==="minutes"?(n(b.rawValues.Mins)??-1)-(n(a.rawValues.Mins)??-1):(scores.get(b.uid)?.score??-1)-(scores.get(a.uid)?.score??-1))||a.displayName.localeCompare(b.displayName)||a.uid.localeCompare(b.uid));
  return match;
}