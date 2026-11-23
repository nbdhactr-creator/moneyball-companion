import {test} from "node:test";
import assert from "node:assert/strict";
import {createFm24Scorer} from "../../src/analytics/fm24-scoring.ts";
import {createReference,explainForPlayer,referenceSummary} from "../../src/beta-benchmarks.js";
import {searchRows} from "../../src/beta-domain.js";

test("55,131 synthetic player records keep positional/division baselines stable",()=>{
 const size=55131;
 const records=Array.from({length:size},(_,i)=>{
   const uid=String(200000+i), division=i%2?"League East":"League West";
   return {uid,displayName:"Fixture "+uid,position:i%7===0?"ST (C)":"D (C)",club:"Fixture FC",division,
    rawValues:{UID:uid,Name:"Fixture "+uid,Position:i%7===0?"ST (C)":"D (C)",Club:"Fixture FC",Division:division,
      Mins:i%131===0?"60":"2400","Poss Won/90":String(i%28),"Int/90":String((i%35)/10),
      "Hdr %":String(60+i%31),"Hdrs A":"75","Tck R":String(70+i%25),"Tck A":"45","Tck W":"28",
      "Itc":"22","K Tck":"10","Blk":"5","Clear":"50","Shts Blckd":"10","Gl Mst":"1"}};
 });
 const scorer=createFm24Scorer(records),role=scorer.roles.find(x=>x.id==="cd-DC-D");
 assert.equal(scorer.players.length,size);
 const ref=createReference(scorer,role,{scope:"division",division:"League East"});
 assert.equal(ref.metrics.length,3);
 assert.ok(ref.eligiblePlayerCount>10000);
 assert.ok(ref.metrics.every(x=>x.n>10000));
 const summary=referenceSummary(ref);
 assert.equal(summary.metrics[0].values,undefined);
 const eligible=scorer.players.find(p=>p.positionSlots.has("D-C")&&p.division==="League East"&&p.minutes>=scorer.poolMinimumMinutes);
 const measures=explainForPlayer(eligible,role,ref);
 assert.equal(measures.length,3);
 assert.ok(measures.every(x=>x.percentile!==null));
 const before=scorer.scoreRole(eligible,role).score;
 const subset=searchRows(records,{league:"League East",minutes:"1800"},new Map());
 assert.ok(subset.length>10000);
 assert.equal(scorer.scoreRole(eligible,role).score,before,"Search filters never rebase scores");
 const other=createReference(scorer,role,{scope:"division",division:"Missing League"});
 assert.equal(other.eligiblePlayerCount,0);
 assert.ok(other.metrics.every(m=>m.median===null),"No fallback when comparison group is empty");
});
