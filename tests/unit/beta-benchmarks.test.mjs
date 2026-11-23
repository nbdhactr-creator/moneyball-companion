import {test} from "node:test";
import assert from "node:assert/strict";
import {createReference,essentialMetrics,explainForPlayer,formatMetric,percentileRank,referenceSummary} from "../../src/beta-benchmarks.js";
import {createFm24Scorer} from "../../src/analytics/fm24-scoring.ts";
const players=Array.from({length:24},(_,i)=>({
 uid:String(i+1),position:i===23?"ST (C)":"D (C)",division:i<12?"Premier League":"La Liga",
 rawValues:{Mins:i===11?"60":"2400", "Hdr %":String(60+i), "Hdrs A": i===1?"2":"55","Poss Won/90":String(5+i),"Int/90":String(1+i/10),
 "Tck R":"80","Tck A":"40","Tck W":"26","K Tck":"7","Itc":"20","Clear":"40","Blk":"10","Shts Blckd":"3","Gl Mst":"0"} }));
const scorer=createFm24Scorer(players);
const role=scorer.roles.find(x=>x.id==="cd-DC-D");
test("three centre-back metrics come from the real FM24 catalogue",()=>{
 assert.deepEqual(essentialMetrics(role).map(x=>x[0]),["Poss Won/90","Int/90","Hdr %"]);
 assert.equal(formatMetric(.81,"Save %"),"81.0%");
 assert.equal(formatMetric(74,"Hdr %"),"74.0%");
});
test("same division benchmark only uses eligible positional peers with enough minutes/attempts",()=>{
 const ref=createReference(scorer,role,{scope:"division",division:"Premier League"});
 assert.equal(ref.eligiblePlayerCount,11);
 assert.deepEqual(ref.metrics.map(m=>m.n),[11,11,10]);
 assert.equal(ref.positionGroup,"Centre-back");
 assert.equal(referenceSummary(ref).metrics[0].values,undefined,"Do not ship full peer distributions to UI");
});
test("all divisions differs from division scoped reference and does not silently fall back",()=>{
 const all=createReference(scorer,role,{scope:"all"}),tiny=createReference(scorer,role,{scope:"division",division:"Unknown League"});
 assert.ok(all.metrics[0].n>10);
 assert.equal(tiny.metrics[0].n,0);
 assert.equal(tiny.metrics[0].median,null);
});
test("zero is observed, missing and too few attempts cannot masquerade as a low percentile",()=>{
 const first=scorer.players[0],ref=createReference(scorer,role,{scope:"all"});
 const scored=explainForPlayer(first,role,ref);assert.ok(scored[0].percentile!==null);
 const lowAttempts=explainForPlayer(scorer.players[1],role,ref);
 assert.equal(lowAttempts[2].percentile,null);
 assert.match(lowAttempts[2].reason,/Minimum attempts/);
 const missing=explainForPlayer({...first,stats:{...first.stats,"Int/90":null}},role,ref);
 assert.equal(missing[1].value,null);
 assert.match(missing[1].reason,/missing/);
});
test("inverted percentile rank handles ties and limits and does not imply certainty",()=>{
 assert.ok(percentileRank(1,[0,1,2,3,4,5,6,7,8,9],-1)>percentileRank(8,[0,1,2,3,4,5,6,7,8,9],-1));
 assert.equal(percentileRank(0,Array(10).fill(0),1),50);
 assert.equal(percentileRank(0,[1,2],1),null);
});
test("noneligible striker is never given a centre-back benchmark percentile",()=>{
 const ref=createReference(scorer,role,{scope:"all"});
 assert.ok(explainForPlayer(scorer.players.at(-1),role,ref).every(x=>x.percentile===null));
});
