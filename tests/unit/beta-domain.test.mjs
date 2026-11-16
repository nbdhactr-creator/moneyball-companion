
import {test} from "node:test";
import assert from "node:assert/strict";
import {money,searchRows} from "../../src/beta-domain.js";
const row=(uid,values={})=>({uid,displayName:"Player "+uid,club:"Club",rawValues:{Age:"23",Mins:"1,020",Division:"League",...values}});
test("estimated value uses the top of the range and never mixes currencies",()=>{
 assert.equal(money("£1.2M - £2M","£"),2000000);
 assert.equal(money("£14K p/w","£"),14000);
 for(const v of ["-","£1M - €2M","Not for Sale","£1M+"])assert.equal(money(v,"£"),null);
 assert.equal(money("€1M","£"),null);
});
test("role ordering is stable and caps exclude unknown costs without changing scores",()=>{
 const rows=[row("a",{Wage:"£12K p/w"}),row("b",{Wage:"-"}),row("c",{Wage:"£2K p/w"})];
 const scores=new Map([["a",{listed:true,score:75}],["b",{listed:true,score:89}]]);
 assert.deepEqual(searchRows(rows,{role:"defend"},scores).map(x=>x.uid),["b","a"]);
 assert.deepEqual(searchRows(rows,{role:"defend",wage:"20"},scores).map(x=>x.uid),["a"]);
 assert.equal(scores.get("a").score,75);
});
test("source filters distinguish a measured zero from a missing value",()=>{
 const rows=[row("a",{Stat:"0"}),row("b",{Stat:"-"})];
 assert.deepEqual(searchRows(rows,{stat:"Stat",statMin:"0"},new Map()).map(x=>x.uid),["a"]);
});