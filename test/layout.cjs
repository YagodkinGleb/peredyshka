// Real browser: fixed frame, actual timed transitions, tab isolation and controls.
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-09-12T12:00:00Z')});
  await page.clock.pauseAt(new Date('2026-09-12T12:00:01Z'));
  await page.goto(pathToFileURL(path.resolve(__dirname,'../src/index.html')).href);
  await page.evaluate(()=>localStorage.setItem('peredyshka.settings.v1',JSON.stringify({restMin:10})));
  await page.reload();
  assert.equal(await page.locator('#trainingSettings').isVisible(),false);
  await page.locator('#settingsTab').click();assert.equal(await page.locator('#trainingSettings').isVisible(),true);
  assert.equal(await page.locator('#startBtn').isVisible(),false);
  await page.locator('#allowFloor').uncheck();await page.reload();await page.locator('#settingsTab').click();
  assert.equal(await page.locator('#allowFloor').isChecked(),false);await page.locator('#allowFloor').check();
  await page.locator('#timerTab').click();await page.locator('#startBtn').click();
  for(const [width,height] of [[1440,1080],[1366,768],[800,600],[400,760],[320,568]]){
   await page.setViewportSize({width,height});await page.locator('#skipBtn').click();
   const frame=await page.locator('.overlay-frame').boundingBox();const footer=await page.locator('.ov-foot').boundingBox();
   assert.ok(frame.y+frame.height<=height);assert.ok(footer.y+footer.height<=height);
   assert.equal(await page.locator('#otherBtn').count(),0);
   for(let i=0;i<29;i++){
    await page.clock.runFor(20000);
    assert.deepEqual(await page.locator('.overlay-frame').boundingBox(),frame,'frame moves on transition');
    assert.deepEqual(await page.locator('.ov-foot').boundingBox(),footer,'footer moves on transition');
    assert.ok(await page.locator('.ov-main').evaluate(el=>el.scrollWidth<=el.clientWidth),'horizontal clipping');
    assert.ok(await page.locator('.ov-body').evaluate(el=>el.scrollWidth<=el.clientWidth),'instruction clipping');
   }
   await page.keyboard.press('Escape');assert.equal(await page.locator('#overlay').isVisible(),false);
  }
  await page.locator('#skipBtn').click();await page.clock.runFor(15000);
  await page.locator('#doneBtn').focus();await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'dismissBreakBtn');
  await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'doneBtn');
  const total=await page.locator('#overlayTime').innerText();await page.locator('#doneBtn').click();
  assert.equal(await page.locator('#overlayTime').innerText(),total);assert.equal(await page.locator('#doneBtn').isDisabled(),true);
  await page.keyboard.press('Escape');
  fs.mkdirSync(path.resolve(__dirname,'../artifacts'),{recursive:true});
  await page.setViewportSize({width:400,height:850});await page.locator('#settingsTab').click();
  assert.equal(await page.locator('#supportLink').getAttribute('href'),'https://boosty.to/yagojeez/donate');
  await page.screenshot({path:path.resolve(__dirname,'../artifacts/settings.png'),fullPage:true});
  await page.locator('#timerTab').click();await page.screenshot({path:path.resolve(__dirname,'../artifacts/timer.png'),fullPage:true});
  await page.locator('#skipBtn').click();await page.clock.runFor(15000);
  await page.setViewportSize({width:1366,height:768});await page.screenshot({path:path.resolve(__dirname,'../artifacts/break-desktop.png')});
  await page.setViewportSize({width:400,height:760});await page.screenshot({path:path.resolve(__dirname,'../artifacts/break-compact.png')});
  assert.deepEqual(errors,[]);console.log('PASS: 145 timed transitions, five screen sizes; fixed frame/footer, settings isolation, saved filters, keyboard and early completion');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
