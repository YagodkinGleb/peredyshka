const assert=require('node:assert/strict');
const {boot}=require('./harness');
const lib=require('../src/exercises');
function only(id){return {groups:Object.keys(lib.GROUPS),floor:true,excluded:Object.keys(lib.MOVEMENTS).filter(k=>k!==id)};}
function session(restMin=3,training=only('squat')){
  const t=boot({seedStore:{'peredyshka.settings.v1':JSON.stringify({restMin,training})}});
  t.click('startBtn');t.click('skipBtn');return t;
}
const cases={
  'a minute has preparation, repetitions, recovery and automatic return'(){
    const t=session(1);assert.equal(t.$('stepLabel').textContent,'ПРИГОТОВЬСЯ');
    t.advance(10000);assert.match(t.$('stepLabel').textContent,/ПОДХОД 1/);
    assert.equal(t.$('exerciseCount').textContent,'12ПОВТОРОВ');
    t.advance(35000);assert.equal(t.$('exerciseCount').textContent,'12ПОВТОРОВ');
    t.advance(1000);assert.equal(t.$('stepLabel').textContent,'ВОССТАНОВЛЕНИЕ');
    assert.equal(t.$('statToday').textContent,'00');t.advance(14000);
    assert.equal(t.phase(),'РАБОТА');assert.equal(t.$('statToday').textContent,'01');
  },
  'automatic rest and next approach require no clicks'(){
    const t=session();t.advance(51000);assert.equal(t.$('stepLabel').textContent,'ОТДЫХ');
    t.advance(30000);assert.match(t.$('stepLabel').textContent,/ПОДХОД 2/);
    t.advance(99000);assert.equal(t.phase(),'РАБОТА');assert.equal(t.$('statToday').textContent,'01');
  },
  'early completion adds rest without moving the next deadline'(){
    const t=session();t.advance(20000);const clock=t.time();
    t.click('doneBtn');t.click('doneBtn');assert.equal(t.time(),clock);
    assert.equal(t.$('doneBtn').disabled,true);assert.equal(t.$('stepLabel').textContent,'ОТДЫХ');
    assert.equal(t.$('statToday').textContent,'00');
    t.advance(60000);assert.equal(t.$('stepLabel').textContent,'ОТДЫХ');
    t.advance(1000);assert.match(t.$('stepLabel').textContent,/ПОДХОД 2/);
  },
  'early last approach does not complete the entire break'(){
    const t=session(1);t.advance(12000);t.click('doneBtn');t.click('doneBtn');
    assert.equal(t.$('stepLabel').textContent,'ВОССТАНОВЛЕНИЕ');assert.equal(t.phase(),'ПАУЗА');
    t.advance(48000);assert.equal(t.$('statToday').textContent,'01');
  },
  'there is no replacement control or handler'(){const t=session();assert.equal(t.$('otherBtn'),null);},
  'settings exist only in their own panel'(){
    const t=boot();assert.equal(t.$('settingsPanel').hidden,true);assert.equal(t.$('timerPanel').hidden,false);
    t.click('settingsTab');assert.equal(t.$('settingsPanel').hidden,false);assert.equal(t.$('timerPanel').hidden,true);
    assert.ok(t.$('settingsPanel').contains(t.$('trainingSettings')));
    assert.equal(t.$('overlay').contains(t.$('trainingSettings')),false);
    t.click('timerTab');assert.equal(t.$('settingsPanel').hidden,true);
  },
  'filters survive restart and apply to future plans'(){
    const t=boot();t.click('settingsTab');
    t.$('allowFloor').checked=false;t.$('allowFloor').dispatchEvent(new t.w.Event('change'));
    const input=t.w.document.querySelector('[data-group="back"]');input.checked=false;input.dispatchEvent(new t.w.Event('change'));
    const t2=boot({seedStore:t.store});assert.equal(t2.$('allowFloor').checked,false);
    const p=JSON.parse(t.store['peredyshka.settings.v1']).training;
    assert.equal(p.groups.includes('back'),false);
    for(let i=0;i<30;i++) assert.ok(lib.createPicker()(5,p).steps.every(s=>!s.floor && s.zone!=='back'));
  },
  'empty selection preserves exclusions and permits a normal break'(){
    const t=session(1,{groups:[]});assert.match(t.$('stepStatus').textContent,/отключены/);
    assert.equal(t.$('doneBtn').disabled,true);t.advance(60000);assert.equal(t.phase(),'РАБОТА');
    assert.deepEqual(lib.normalizeTraining({groups:[]}).groups,[]);
  },
  'two-sided holds include both sides and a timed changeover'(){
    const task=lib.createPicker()(1,only('sidePlank'));
    assert.deepEqual(task.steps.map(s=>s.side),['левый бок','правый бок']);
    const t=session(1,only('sidePlank'));t.advance(10000);assert.equal(t.$('stepStatus').textContent,'левый бок');
    t.advance(18000);assert.equal(t.$('stepLabel').textContent,'ОТДЫХ');
    t.advance(5000);assert.equal(t.$('stepStatus').textContent,'правый бок');
  },
  'phase cues honor mute and do not repeat each tick'(){
    const t=session(1);const before=t.sounds.length;t.advance(10000);assert.equal(t.sounds.length,before+2);
    t.advance(10000);assert.equal(t.sounds.length,before+2);
    t.click('muteBtn');t.advance(26000);assert.equal(t.sounds.length,before+2);
  },
  'a paused sequence does not advance on visibility changes'(){
    const t=session();t.advance(20000);t.click('startBtn');const clock=t.$('stageClock').textContent;
    t.sleep(70000);t.w.document.dispatchEvent(new t.w.Event('visibilitychange'));
    assert.equal(t.$('stageClock').textContent,clock);t.click('doneBtn');assert.equal(t.$('stepLabel').textContent,'ПОДХОД 1 / 3');
    t.click('startBtn');t.advance(31000);assert.equal(t.$('stepLabel').textContent,'ОТДЫХ');
  },
  'skip never reports an entire completed workout'(){const t=session();t.click('dismissBreakBtn');assert.equal(t.$('statToday').textContent,'00');assert.equal(t.$('statSkipped').textContent,'01');},
  'ability answers affect upper and lower independently'(){
    const p={level:2,upperAbility:'few',lowerAbility:'many'};
    const pool=lib.availableMovements(p);assert.ok(pool.some(m=>m.id==='kneePushup'));assert.ok(!pool.some(m=>m.id==='pushup'));
    const task=lib.createPicker()(3,{...only('squat'),...p});assert.equal(task.steps[0].reps,16);
  }
};
let failed=0;for(const [name,run] of Object.entries(cases)){try{run();console.log('PASS:',name);}catch(e){failed++;console.error('FAIL:',name,e.stack);}}
process.exitCode=failed?1:0;
