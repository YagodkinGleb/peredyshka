const assert=require('node:assert/strict');
const lib=require('../src/exercises');
let seed=42;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
for(let minutes=1;minutes<=60;minutes++) for(let level=0;level<3;level++) for(const floor of [false,true]) for(let mask=0;mask<16;mask++){
  const groups=Object.keys(lib.GROUPS).filter((g,i)=>mask&(1<<i));
  const prefs={level,floor,groups};const task=lib.createPicker({random})(minutes,prefs);
  const available=lib.availableMovements(prefs).map(m=>m.id);
  assert.equal(task.totalSec,minutes*60);
  assert.equal(task.stages[0].start,0);assert.equal(task.stages.at(-1).end,minutes*60);
  task.stages.forEach((s,i)=>{assert.ok(s.end>s.start);if(i)assert.equal(s.start,task.stages[i-1].end);});
  assert.ok(task.steps.every(s=>available.includes(s.id)&&s.duration>0&&s.cues.length===3));
  assert.ok(task.steps.every(s=>s.hold?Number.isInteger(s.hold):Number.isInteger(s.reps)));
  assert.equal(task.workSec,task.stages.filter(s=>s.kind==='work').reduce((sum,s)=>sum+s.end-s.start,0));
  if(available.length){
    assert.ok(task.steps.length>0);
    assert.ok(task.stages.at(-1).start>=Math.min(minutes*60,600)-90,'unexpected long empty tail');
    if(minutes===1)assert.equal(new Set(task.steps.map(s=>s.id)).size,1);
    for(let i=0;i<task.steps.length;i++)if(task.steps[i].side==='левый бок'){
      assert.equal(task.steps[i+1].side,'правый бок');assert.equal(task.steps[i].hold,task.steps[i+1].hold);
    }
  }else assert.equal(task.empty,true);
}
for(const id of Object.keys(lib.MOVEMENTS)){
 const excluded=[id];for(let i=0;i<20;i++)assert.ok(lib.createPicker({random})(10,{excluded}).steps.every(s=>s.id!==id));
}
const pick=lib.createPicker({random});const task=pick(10);assert.ok(task.workSec>180);
assert.equal(lib.createPicker()(0).steps.length,0);
assert.deepEqual(lib.normalizeTraining({level:99,groups:['bogus'],excluded:[null]}).groups,[]);
console.log('PASS: 5760 plans, all durations 1–60 min, levels, floors, group combinations; exclusions and bilateral timing');
