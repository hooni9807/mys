const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const source=html.slice(html.indexOf('const RANK_TIERS='),html.indexOf('function rankLocal()'));
const ctx={};vm.runInNewContext(source+';globalThis.lookup=m=>[rankName(m),rankIdx(m),rankTier(m).dif];',ctx);
for(const [score,name] of [[0,'7부'],[799,'7부'],[800,'6부'],[999,'6부'],[1000,'5부'],[1200,'4부'],[1400,'3부'],[1600,'2부'],[1800,'1부'],[2000,'선수부']])assert.equal(ctx.lookup(score)[0],name);
assert.equal(ctx.lookup(2000)[2],'pro');
assert(html.includes("const suList=()=>mode==='match'?[1,2]:[1]"));
for(const script of [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean))new vm.Script(script);
console.log('Rank divisions, score boundaries and setup syntax OK');
