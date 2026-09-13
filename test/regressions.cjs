const assert = require('node:assert/strict');
const { boot } = require('./harness');
const cases = {
  'malformed saved stats do not break startup'() {
    const t = boot({seedStore:{'peredyshka.stats.v1':JSON.stringify({lastDoneDate:17,streak:'9',done:-2})}});
    assert.equal(t.$('statToday').textContent,'00');
    assert.equal(t.$('statStreak').textContent,'00');
    t.click('startBtn'); assert.equal(t.phase(),'РАБОТА');
  },
  'login launch starts the timer automatically'() {
    const t = boot({launchedAtLogin:true});
    assert.equal(t.phase(), 'РАБОТА');
  },
  'failed autostart changes revert and explain the failure'() {
    const t = boot({invokeResult:{set_autostart:null}});
    t.click('autoStart');
    assert.equal(t.$('autoStart').getAttribute('aria-checked'), 'false');
    assert.equal(t.$('appStatus').hidden, false);
  },
  'a paused clock survives visibility events and sleep'() {
    const t = boot(); t.click('startBtn'); t.advance(60000); t.click('startBtn');
    const before = t.time();
    t.sleep(60000);
    t.w.document.dispatchEvent(new t.w.Event('visibilitychange'));
    assert.equal(t.time(), before);
    t.click('startBtn'); t.advance(1000);
    assert.equal(t.time(), '23:59');
  },
  'work durations 1–4 minutes survive restart'() {
    for (let workMin = 1; workMin < 5; workMin++) {
      const t = boot({seedStore:{'peredyshka.settings.v1':JSON.stringify({workMin})}});
      assert.equal(Number(t.$('workVal').textContent), workMin);
    }
  },
  'changing tips keeps the current exercise'() {
    const t = boot(); t.click('startBtn'); t.click('skipBtn');
    const name = t.$('exerciseName').textContent;
    t.click('tipsMode');
    assert.equal(t.$('exerciseName').textContent, name);
  },
  'starting a break from pause resumes its clock'() {
    const t = boot(); t.click('startBtn'); t.click('startBtn'); t.click('skipBtn');
    const before = t.time(); t.advance(3000);
    assert.notEqual(t.time(), before);
  },
  'modal makes the background inert and restores focus'() {
    const t = boot(); t.$('startBtn').focus(); t.click('startBtn'); t.click('skipBtn');
    assert.equal(t.$('mainScreen').inert, true);
    t.key('Escape');
    assert.equal(t.$('mainScreen').inert, false);
    assert.equal(t.w.document.activeElement, t.$('startBtn'));
  }
};
let failed = 0;
for (const [name, run] of Object.entries(cases)) {
  try { run(); console.log('PASS:', name); }
  catch (error) { failed++; console.error('FAIL:', name, error.message); }
}
process.exitCode = failed ? 1 : 0;
