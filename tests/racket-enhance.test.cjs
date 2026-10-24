const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
(async()=>{
  const root=process.cwd(),server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost'),file=path.join(root,u.pathname==='/'?'index.html':u.pathname);fs.readFile(file,(e,b)=>e?res.writeHead(404).end():res.end(b));});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1100,height:900}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(()=>document.getElementById('prologue-loading').hidden);
    await page.evaluate(()=>{document.getElementById('auth-gate').close();localStorage.setItem('spinlab.progress',JSON.stringify({xp:0,unlocked:['jersey','pastor','aribeom'],coins:10000,racketEnhance:0}));});
    await page.reload();
    await page.waitForFunction(()=>document.getElementById('prologue-loading').hidden);
    await page.evaluate(()=>document.getElementById('auth-gate').close());
    await page.locator('#enhance-home').click();
    assert.equal(await page.locator('#enhance').evaluate(d=>d.open),true);
    assert.equal(await page.locator('#enhance-level').textContent(),'+0');
    assert.match(await page.locator('#enhance-rate').textContent(),/100%/);
    await page.locator('#enhance-try').click();
    await page.waitForFunction(()=>document.getElementById('enhance-level').textContent==='+1');
    const state=await page.evaluate(()=>({coins:prog.coins,level:enhanceLevel(),speed:enhanceSpeed(),spin:enhanceSpin(),miss:enhanceAiMiss()}));
    const racketEffect=await page.evaluate(()=>{const old=ctx,c=document.createElement('canvas');c.width=c.height=180;ctx=c.getContext('2d');prog.racketEnhance=0;racket(90,90,0,'shake','#1b1b1b',1);const base=c.toDataURL();ctx.clearRect(0,0,180,180);prog.racketEnhance=10;time=.5;racket(90,90,0,'shake','#1b1b1b',1);const enhanced=c.toDataURL();ctx=old;return base!==enhanced;});
    assert.equal(state.level,1);assert.ok(state.coins<10000);assert.ok(racketEffect,'+10 racket should render an effect');assert.ok(state.speed>1&&state.spin>1&&state.miss>0);assert.deepEqual(errors,[]);
    console.log('Racket enhancement spends spin coins and applies combat bonuses');
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
