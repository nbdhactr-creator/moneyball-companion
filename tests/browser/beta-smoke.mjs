
import assert from "node:assert/strict";
import { chromium } from "playwright";
const origin="http://127.0.0.1:5173/moneyball-companion/";
for(let attempt=0;;attempt++){
  if(await fetch(origin+"beta/index.html").then(r=>r.ok).catch(()=>false))break;
  if(attempt===39)throw Error("Vite did not start");
  await new Promise(r=>setTimeout(r,250));
}
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto(origin+"beta/index.html");
 await page.getByRole("heading",{name:"No imported season in this browser"}).waitFor();
 await page.evaluate(async base=>{
   const db=await import(base+"src/data/storage/local-database.ts");
   const save=await db.createSave("Smoke career","Test City");
   const rows=Array.from({length:18},(_,i)=>({sourceLine:i+2,values:{
     UID:String(10001+i),Name:"Test Player "+String(i+1).padStart(2,"0"),Position:"D (C)",Club:"Test City",Division:"Test League",Mins:String(1500+i*31),Age:"23","Hdr %":String(53+i)+"%","Tck R":String(70+i)+"%","Transfer Value":"£1M - £2M",Wage:"£10K p/w"
   }}));
   await db.persistSeasonImport({saveId:save.id,seasonLabel:"2026/27",fileName:"fixture.html",fileSize:1200,format:"fm24-pipe-table-v1",fingerprint:"b".repeat(64),rows});
 },origin);
 await page.reload();
 await page.getByRole("link",{name:"Find centre-backs"}).click();
 await page.locator("#results h2").waitFor();
 assert.equal(await page.locator("[name=role]").inputValue()!=="",true);
 assert.equal(await page.locator(".row:not(.rowhead)").count(),12);
 await page.getByLabel("Minimum minutes").fill("1600");
 await page.getByRole("button",{name:"Apply filters"}).click();
 await page.getByRole("heading",{name:"14 players"}).waitFor();
 const player=page.locator(".player-link").first(); const name=await player.textContent();
 await player.click();
 await page.getByRole("heading",{name,exact:true}).waitFor();
 await page.getByRole("navigation",{name:"Player report sections"}).getByRole("link",{name:"Role Fit"}).click();
 await page.getByText("What evidence supports this role?",{exact:true}).waitFor();
 await page.getByLabel("Philosophy",{exact:true}).selectOption("possession");
 await page.getByRole("button",{name:"Update assessment"}).click();
 await page.getByText("What evidence supports this role?",{exact:true}).waitFor();
 assert.equal(await page.getByLabel("Philosophy",{exact:true}).inputValue(),"possession");
 await page.getByRole("link",{name:"Stats & History"}).click();
 await page.getByLabel("Find a stat").fill("hdr");
 assert.equal(await page.locator("[data-stat]:visible").count(),1);
 await page.getByRole("link",{name:"Notes",exact:true}).click();
 await page.getByLabel("Scout notes").fill("Smoke note");
 await page.getByRole("button",{name:"Save stage and note"}).click();
 await page.getByText("Beta stage and note saved on this browser.").waitFor();
 await page.getByRole("link",{name:"Compare players"}).click();
 await page.getByLabel("Find another player by name or club").fill("Test Player");
 await page.getByRole("button",{name:"Find player",exact:true}).click();
 await page.locator('a[href*="other="]').first().click();
 await page.waitForFunction(()=>document.querySelectorAll("article.card").length===2);
 await page.getByRole("link",{name:"Back to player report"}).click();
 await page.getByRole("link",{name:"Back to results"}).click();
 await page.getByRole("heading",{name:"14 players"}).waitFor();
 assert.equal(await page.getByLabel("Minimum minutes").inputValue(),"1600");
 for(const width of [320,390,1024,1440]){
   await page.setViewportSize({width,height:900});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,"No horizontal overflow at "+width);
 }

 await page.getByRole("navigation",{name:"Main navigation"}).getByRole("link",{name:"Squad",exact:true}).click();
 await page.getByRole("heading",{name:"Where does your squad need help?"}).waitFor();
 await page.getByLabel("Tactic slot").selectOption({label:await page.locator('[name="slot"] option').evaluateAll(options=>options.find(o=>o.textContent.includes("Central Defender")).textContent)});
 await page.getByRole("button",{name:"Open slot"}).click();
 await page.getByRole("link",{name:"Use as planning baseline"}).first().click();
 await page.getByRole("heading",{name:"Would this signing improve your squad?"}).waitFor();
 assert.ok(await page.getByLabel("Current club baseline").inputValue());
 await page.getByLabel("Find a target by name or club").fill("Test Player");
 await page.getByLabel("Weekly wage cap (thousands)").fill("9");
 await page.getByRole("button",{name:"Update scenario"}).click();
 await page.locator('a[href*="target="]').first().click();
 await page.getByText(/Weekly wage: over cap/).waitFor();
 await page.getByRole("link",{name:"Find candidates"}).click();
 await page.locator("#results h2").waitFor();
 assert.ok(await page.getByLabel("Role and duty").inputValue());
 await page.locator(".player-link").first().click();
 await page.getByRole("link",{name:"Plan this signing"}).click();
 await page.getByRole("heading",{name:"Would this signing improve your squad?"}).waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors,[]);
 console.log("Beta real IndexedDB browser journey passed at 320–1440px.");
}finally{await browser.close();}
