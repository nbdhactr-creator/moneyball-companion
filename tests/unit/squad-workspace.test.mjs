import test from "node:test";import assert from "node:assert/strict";import {createDefaultTactic,buildFormationSlots,clampTacticCoordinate,listFm24FormationIds} from "../../src/data/squad-workspace.ts";
test("default FM24 tactic contains eleven slots with compatible roles",()=>{const t=createDefaultTactic();assert.equal(t.formationId,"433");assert.equal(t.slots.length,11);assert.ok(t.slots.every(s=>s.roleId));const backThree=createDefaultTactic("352");assert.ok(backThree.slots.every(s=>s.roleId));});
test("formation changes preserve matching slot assignments",()=>{const t=createDefaultTactic();t.slots[0].playerUid="123";const n=buildFormationSlots("4231",t.slots);assert.equal(n.length,11);assert.equal(n[0].playerUid,"123");});
test("formation changes drop slots no longer present",()=>{const t=createDefaultTactic("442");const n=buildFormationSlots("433",t.slots);assert.equal(n.some(s=>s.label==="ML"),false);assert.equal(n.length,11);});
test("tactical position controls clamp and round pitch coordinates",()=>{assert.equal(clampTacticCoordinate(2),5);assert.equal(clampTacticCoordinate(50.7),51);assert.equal(clampTacticCoordinate(120),95);assert.equal(clampTacticCoordinate(Number.NaN),50);});

test("FM24 preset catalogue provides broad three-, four- and five-defender choices",()=>{
 const ids=listFm24FormationIds();
 for(const id of ["433","4231","442","352","343","4222","442d","424","4321","5212","5221","523","532","4141","4411"])assert.ok(ids.includes(id),id);
 assert.equal(ids.length,15);
 for(const id of ids){const tactic=createDefaultTactic(id);assert.equal(tactic.slots.length,11,id);assert.ok(tactic.slots.every(slot=>slot.roleId),id);}
});
test("changing a formation keeps a player's assignment when the slot identity remains",()=>{
 const tactic=createDefaultTactic("433");
 tactic.slots.find(slot=>slot.id==="GK-0").playerUid="keeper-uid";
 const changed=buildFormationSlots("4231",tactic.slots);
 assert.equal(changed.find(slot=>slot.id==="GK-0")?.playerUid,"keeper-uid");
});
