/* Передышка — логика приложения. */
(function(){
'use strict';

/* ================= мост в Rust ================= */
/* В браузере window.__TAURI__ отсутствует — приложение просто работает без
   захвата экрана и нативных уведомлений, всё остальное идентично. */
var TAURI = (window.__TAURI__ && window.__TAURI__.core) ? window.__TAURI__.core : null;
function invoke(cmd, args){
  if(!TAURI) return Promise.resolve(null);
  return TAURI.invoke(cmd, args || {}).catch(function(e){
    console.error('invoke ' + cmd + ' failed:', e);
    return null;
  });
}

/* ================= константы ================= */
var WARNING_SEC   = 30;      // за сколько секунд предупреждать о перерыве
var SNOOZE_MIN    = 5;       // на сколько откладывает кнопка «Отложить»
var MAX_SNOOZES   = 3;       // сколько раз подряд можно отложить
var GAP_THRESHOLD = 25000;   // разрыв в тиках, считающийся сном/блокировкой, мс
var STORE_KEY     = 'peredyshka.settings.v1';
var STATS_KEY     = 'peredyshka.stats.v1';

/* ================= состояние ================= */
var S = {
  phase: 'idle',          // idle | work | rest
  running: false,
  transitioning: false,   // защита от двойного перехода фазы
  phaseEndAt: 0,
  phaseTotalSec: 0,
  snoozesUsed: 0,
  warningShown: false,
  exercise: null,
  lastTickAt: 0,
  tickHandle: null,
  breathHandle: null,
  trayHandle: null
};

var settings = {
  workMin: 25,
  restMin: 5,
  volume: 70,
  muted: false,
  softMode: false,
  showTips: true
};

var stats = { date: '', done: 0, skipped: 0, streak: 0, lastDoneDate: '' };

var pickExercise = createPicker();

/* ================= элементы ================= */
function $(id){ return document.getElementById(id); }
var el = {
  body: document.body,
  ring: $('ringWrap'), progress: $('progressCircle'),
  time: $('timeDisplay'), phaseLabel: $('phaseLabel'),
  presets: Array.prototype.slice.call(document.querySelectorAll('.preset')),
  workVal: $('workVal'), restVal: $('restVal'),
  workMinus: $('workMinus'), workPlus: $('workPlus'),
  restMinus: $('restMinus'), restPlus: $('restPlus'),
  volRange: $('volRange'), muteBtn: $('muteBtn'), volIcon: $('volIcon'),
  softMode: $('softMode'), tipsMode: $('tipsMode'),
  startBtn: $('startBtn'), skipBtn: $('skipBtn'),
  statToday: $('statToday'), statStreak: $('statStreak'),
  hint: $('hint'),
  warning: $('warning'), warningCountdown: $('warningCountdown'),
  snoozeBtn: $('snoozeBtn'), warnNowBtn: $('warnNowBtn'),
  overlay: $('overlay'), overlayTime: $('overlayTime'),
  overlayBreath: $('overlayBreath'),
  exerciseZone: $('exerciseZone'), exerciseName: $('exerciseName'),
  exerciseDetail: $('exerciseDetail'), exerciseTip: $('exerciseTip'),
  doneBtn: $('doneBtn'), otherBtn: $('otherBtn')
};

var CIRC = 2 * Math.PI * 100;

var ZONE_NAMES = {
  legs:'Ноги', arms:'Руки', core:'Корпус', glutes:'Ягодичные',
  cardio:'Кардио', back:'Спина', shoulders:'Плечи', wrists:'Запястья',
  hips:'Тазобедренные', chest:'Грудь', fullbody:'Всё тело',
  circuit:'Круговая', strength:'Силовая', mobility:'Мобильность',
  walk:'Прогулка'
};

/* ================= хранилище ================= */
function loadSettings(){
  try{
    var raw = localStorage.getItem(STORE_KEY);
    if(raw){
      var p = JSON.parse(raw);
      if(typeof p.workMin === 'number') settings.workMin = clamp(p.workMin, 5, 180);
      if(typeof p.restMin === 'number') settings.restMin = clamp(p.restMin, 1, 60);
      if(typeof p.volume === 'number')  settings.volume  = clamp(p.volume, 0, 100);
      if(typeof p.muted === 'boolean')  settings.muted   = p.muted;
      if(typeof p.softMode === 'boolean') settings.softMode = p.softMode;
      if(typeof p.showTips === 'boolean') settings.showTips = p.showTips;
    }
  }catch(e){ console.warn('settings load failed', e); }
}
function saveSettings(){
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(settings)); }
  catch(e){ console.warn('settings save failed', e); }
}

function todayKey(){
  var d = new Date();
  return d.getFullYear() + '-' +
         String(d.getMonth()+1).padStart(2,'0') + '-' +
         String(d.getDate()).padStart(2,'0');
}
function daysBetween(a, b){
  if(!a || !b) return null;
  var pa = a.split('-').map(Number), pb = b.split('-').map(Number);
  var da = Date.UTC(pa[0], pa[1]-1, pa[2]);
  var db = Date.UTC(pb[0], pb[1]-1, pb[2]);
  return Math.round((db - da) / 86400000);
}
function loadStats(){
  try{
    var raw = localStorage.getItem(STATS_KEY);
    if(raw) stats = Object.assign(stats, JSON.parse(raw));
  }catch(e){ console.warn('stats load failed', e); }

  var today = todayKey();
  if(stats.date !== today){       // новый день — счётчик за день обнуляем
    stats.date = today;
    stats.done = 0;
    stats.skipped = 0;
  }
  // серия рвётся, если пропустил день целиком
  var gap = daysBetween(stats.lastDoneDate, today);
  if(gap === null || gap > 1) stats.streak = stats.lastDoneDate === today ? stats.streak : 0;
}
function saveStats(){
  try{ localStorage.setItem(STATS_KEY, JSON.stringify(stats)); }
  catch(e){ console.warn('stats save failed', e); }
}
function recordBreak(completed){
  var today = todayKey();
  if(stats.date !== today){ stats.date = today; stats.done = 0; stats.skipped = 0; }

  if(completed){
    stats.done++;
    if(stats.lastDoneDate !== today){
      var gap = daysBetween(stats.lastDoneDate, today);
      stats.streak = (gap === 1) ? stats.streak + 1 : 1;
      stats.lastDoneDate = today;
    }
  } else {
    stats.skipped++;
  }
  saveStats();
  renderStats();
}

/* ================= утилиты ================= */
function clamp(v, lo, hi){ return Math.min(hi, Math.max(lo, v)); }
function fmt(sec){
  sec = Math.max(0, Math.round(sec));
  var m = Math.floor(sec/60), s = sec % 60;
  return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
}
function remainingSec(){ return (S.phaseEndAt - Date.now()) / 1000; }

/* ================= звук ================= */
var audioCtx = null;
function ctx(){
  if(!audioCtx){
    var AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return null;
    audioCtx = new AC();
  }
  if(audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
function playAlarm(kind){
  if(settings.muted || settings.volume === 0) return;
  var c = ctx();
  if(!c) return;

  // громкость слайдера воспринимается на слух линейно, если возвести в квадрат
  var vol = Math.pow(settings.volume / 100, 2) * 0.55;

  var pattern;
  if(kind === 'rest')      pattern = [659, 659, 880, 659, 880, 988, 1175];
  else if(kind === 'warn') pattern = [523, 494];
  else                     pattern = [523, 659];

  var t = c.currentTime + 0.02;
  pattern.forEach(function(freq){
    var dur = 0.34;
    // две волны сразу: синус даёт тело, треугольник — слышимость на слабых колонках
    ['sine','triangle'].forEach(function(type, i){
      var o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      o.connect(g); g.connect(c.destination);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol * (i ? 0.45 : 1), t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t); o.stop(t + dur + 0.03);
    });
    t += dur + 0.1;
  });
}

/* ================= отрисовка ================= */
function buildTicks(){
  var g = $('ticks');
  for(var i = 0; i < 12; i++){
    var a = (i/12) * 2*Math.PI - Math.PI/2;
    var l = document.createElementNS('http://www.w3.org/2000/svg','line');
    l.setAttribute('x1', (118 + 106*Math.cos(a)).toFixed(2));
    l.setAttribute('y1', (118 + 106*Math.sin(a)).toFixed(2));
    l.setAttribute('x2', (118 + 113*Math.cos(a)).toFixed(2));
    l.setAttribute('y2', (118 + 113*Math.sin(a)).toFixed(2));
    l.setAttribute('class','tick');
    g.appendChild(l);
  }
}

function renderSettings(){
  el.workVal.textContent = settings.workMin;
  el.restVal.textContent = settings.restMin;
  el.volRange.value = settings.volume;
  el.muteBtn.classList.toggle('on', !settings.muted && settings.volume > 0);
  el.muteBtn.setAttribute('aria-pressed', String(settings.muted));
  el.muteBtn.setAttribute('aria-label', settings.muted ? 'Включить звук' : 'Выключить звук');
  el.volIcon.style.opacity = settings.muted ? 0.4 : 1;
  el.softMode.setAttribute('aria-checked', String(settings.softMode));
  el.tipsMode.setAttribute('aria-checked', String(settings.showTips));

  el.presets.forEach(function(b){
    b.classList.toggle('active',
      Number(b.dataset.work) === settings.workMin &&
      Number(b.dataset.rest) === settings.restMin);
  });

  if(!S.running){
    el.time.textContent = fmt(settings.workMin * 60);
    el.progress.setAttribute('stroke-dashoffset', 0);
  }
}

function renderStats(){
  el.statToday.textContent = stats.done;
  el.statStreak.textContent = stats.streak;
}

function renderTick(){
  var rem = remainingSec();
  var txt = fmt(rem);
  el.time.textContent = txt;
  el.overlayTime.textContent = txt;

  var frac = S.phaseTotalSec > 0
    ? clamp((S.phaseTotalSec - rem) / S.phaseTotalSec, 0, 1) : 0;
  el.progress.setAttribute('stroke-dashoffset', CIRC * (1 - frac));
}

function setDisabled(disabled){
  [el.workMinus, el.workPlus, el.restMinus, el.restPlus].forEach(function(b){
    b.disabled = disabled;
  });
  el.presets.forEach(function(b){ b.disabled = disabled; });
}

/* ================= дыхательная подсказка ================= */
function startBreath(){
  var phrases = ['Вдох…','Выдох…'], i = 0;
  el.overlayBreath.textContent = phrases[0];
  clearInterval(S.breathHandle);
  S.breathHandle = setInterval(function(){
    i = 1 - i;
    el.overlayBreath.textContent = phrases[i];
  }, 4000);
}
function stopBreath(){
  clearInterval(S.breathHandle);
  el.overlayBreath.textContent = '';
}

/* ================= предупреждение ================= */
function showWarning(){
  if(S.warningShown) return;
  S.warningShown = true;
  el.body.classList.add('warning-mode');
  el.warning.classList.add('show');
  el.snoozeBtn.disabled = S.snoozesUsed >= MAX_SNOOZES;
  el.snoozeBtn.textContent = S.snoozesUsed >= MAX_SNOOZES
    ? 'Отсрочки кончились'
    : 'Отложить на ' + SNOOZE_MIN + ' мин';
  playAlarm('warn');
  invoke('notify', {
    title: 'Перерыв через полминуты',
    body: 'Заканчивай мысль'
  });
}
function hideWarning(){
  S.warningShown = false;
  el.body.classList.remove('warning-mode');
  el.warning.classList.remove('show');
}
function snooze(){
  if(S.snoozesUsed >= MAX_SNOOZES) return;
  S.snoozesUsed++;
  S.phaseEndAt += SNOOZE_MIN * 60 * 1000;
  S.phaseTotalSec += SNOOZE_MIN * 60;
  hideWarning();
  el.hint.textContent = 'Отложено на ' + SNOOZE_MIN + ' мин. Осталось отсрочек: ' +
                        (MAX_SNOOZES - S.snoozesUsed);
  renderTick();
}

/* ================= экран отдыха ================= */
function showExercise(){
  S.exercise = pickExercise(settings.restMin);
  el.exerciseZone.textContent = ZONE_NAMES[S.exercise.zone] || S.exercise.zone;
  el.exerciseName.textContent = S.exercise.name;
  el.exerciseDetail.textContent = S.exercise.detail;

  if(settings.showTips && S.exercise.tip){
    el.exerciseTip.textContent = S.exercise.tip;
    el.exerciseTip.hidden = false;
  } else {
    el.exerciseTip.hidden = true;
  }
}
function openOverlay(){
  showExercise();
  el.overlay.classList.add('show');
  el.overlay.focus();
}
function closeOverlay(){
  el.overlay.classList.remove('show');
}

/* ================= переходы фаз ================= */
function goWork(){
  if(S.transitioning) return;
  S.transitioning = true;

  S.phase = 'work';
  S.phaseTotalSec = settings.workMin * 60;
  S.phaseEndAt = Date.now() + S.phaseTotalSec * 1000;
  S.snoozesUsed = 0;
  hideWarning();
  closeOverlay();
  stopBreath();

  el.body.classList.remove('rest-mode');
  el.ring.classList.remove('breathe');
  el.phaseLabel.textContent = 'Работа';
  el.skipBtn.textContent = 'Отдохнуть сейчас';
  el.hint.textContent = 'Следующий перерыв через ' + settings.workMin + ' мин';

  playAlarm('work');
  invoke('enter_work');
  updateTray();
  renderTick();

  S.transitioning = false;
}

function goRest(){
  if(S.transitioning) return;
  S.transitioning = true;

  S.phase = 'rest';
  S.phaseTotalSec = settings.restMin * 60;
  S.phaseEndAt = Date.now() + S.phaseTotalSec * 1000;
  hideWarning();

  el.body.classList.add('rest-mode');
  el.ring.classList.add('breathe');
  el.phaseLabel.textContent = 'Перерыв';
  el.skipBtn.textContent = 'Вернуться к работе';
  el.hint.textContent = 'Отойди от экрана';

  openOverlay();
  startBreath();
  playAlarm('rest');

  invoke('notify', {
    title: 'Перерыв: ' + S.exercise.name,
    body: S.exercise.detail
  });
  // в мягком режиме окно не трогаем вовсе — только звук и уведомление
  if(!settings.softMode) invoke('enter_rest');
  updateTray();
  renderTick();

  S.transitioning = false;
}

/* ================= трей ================= */
function updateTray(){
  var text;
  if(!S.running) text = 'Передышка — остановлена';
  else if(S.phase === 'rest') text = 'Перерыв · ' + fmt(remainingSec());
  else text = 'До перерыва · ' + fmt(remainingSec());
  invoke('set_tray', { phase: S.phase, tooltip: text });
}

/* ================= главный тик ================= */
function tick(){
  var now = Date.now();
  var gap = now - S.lastTickAt;
  S.lastTickAt = now;

  /* Компьютер спал или был заблокирован.
     Время «отсутствия» не должно засчитываться как работа: иначе вернувшись
     с обеда ты сразу получаешь перерыв за отдых, который уже состоялся. */
  if(gap > GAP_THRESHOLD && S.running){
    var awaySec = gap / 1000;
    if(S.phase === 'rest'){
      // отсутствовал во время перерыва — перерыв и так состоялся
      recordBreak(true);
      goWork();
      el.hint.textContent = 'С возвращением. Отсчёт пошёл заново';
      renderTick();
      return;
    }
    if(awaySec >= settings.restMin * 60){
      // отсутствовал дольше, чем длится перерыв — считаем, что отдохнул
      goWork();
      el.hint.textContent = 'Тебя не было ' + Math.round(awaySec/60) +
                            ' мин — отсчёт начат заново';
      renderTick();
      return;
    }
    // короткая отлучка — просто не засчитываем её как рабочее время
    S.phaseEndAt += gap;
    S.phaseTotalSec += gap / 1000;   // иначе кольцо прогресса дёрнется назад
  }

  var rem = remainingSec();

  if(S.phase === 'work'){
    if(rem <= WARNING_SEC && rem > 0){
      showWarning();
      el.warningCountdown.textContent = Math.max(0, Math.ceil(rem));
    }
    if(rem <= 0){ goRest(); return; }
  } else if(S.phase === 'rest'){
    if(rem <= 0){ recordBreak(true); goWork(); return; }
  }

  renderTick();
}

/* ================= старт / стоп ================= */
function start(){
  ctx(); // разблокировать звук пользовательским жестом
  S.running = true;
  el.startBtn.textContent = 'Остановить';
  el.skipBtn.hidden = false;
  setDisabled(true);
  S.lastTickAt = Date.now();
  goWork();
  clearInterval(S.tickHandle);
  S.tickHandle = setInterval(tick, 1000);
  clearInterval(S.trayHandle);
  S.trayHandle = setInterval(updateTray, 20000);
}

function stop(){
  S.running = false;
  S.phase = 'idle';
  clearInterval(S.tickHandle);
  clearInterval(S.trayHandle);
  stopBreath();
  hideWarning();
  closeOverlay();
  invoke('enter_work');
  el.startBtn.textContent = 'Начать';
  el.skipBtn.hidden = true;
  setDisabled(false);
  el.body.classList.remove('rest-mode');
  el.ring.classList.remove('breathe');
  el.phaseLabel.textContent = 'Готов к работе';
  el.hint.textContent = 'Окно можно закрыть — программа останется в трее';
  renderSettings();
  updateTray();
}

/* ================= события ================= */
function bump(field, delta, lo, hi){
  settings[field] = clamp(settings[field] + delta, lo, hi);
  saveSettings();
  renderSettings();
}

el.workMinus.onclick = function(){ bump('workMin', -5, 5, 180); };
el.workPlus .onclick = function(){ bump('workMin',  5, 5, 180); };
el.restMinus.onclick = function(){ bump('restMin', -1, 1, 60); };
el.restPlus .onclick = function(){ bump('restMin',  1, 1, 60); };

el.presets.forEach(function(b){
  b.onclick = function(){
    settings.workMin = Number(b.dataset.work);
    settings.restMin = Number(b.dataset.rest);
    saveSettings(); renderSettings();
  };
});

el.volRange.oninput = function(){
  settings.volume = Number(el.volRange.value);
  if(settings.volume > 0) settings.muted = false;
  saveSettings(); renderSettings();
};
el.muteBtn.onclick = function(){
  settings.muted = !settings.muted;
  saveSettings(); renderSettings();
  if(!settings.muted) playAlarm('work');
};
el.softMode.onclick = function(){
  settings.softMode = !settings.softMode;
  saveSettings(); renderSettings();
};
el.tipsMode.onclick = function(){
  settings.showTips = !settings.showTips;
  saveSettings(); renderSettings();
  if(el.overlay.classList.contains('show')) showExercise();
};

el.startBtn.onclick = function(){ S.running ? stop() : start(); };

el.skipBtn.onclick = function(){
  if(S.phase === 'work'){ goRest(); }
  else { recordBreak(false); goWork(); }
};

el.snoozeBtn.onclick = snooze;
el.warnNowBtn.onclick = function(){ goRest(); };

el.doneBtn.onclick  = function(){ recordBreak(true);  goWork(); };
el.otherBtn.onclick = function(){ showExercise(); };

document.addEventListener('keydown', function(e){
  if(e.key === 'Escape'){
    if(el.overlay.classList.contains('show')){
      recordBreak(false);
      goWork();
    } else if(S.warningShown){
      hideWarning();
    }
  }
  if(e.key === ' ' && !el.overlay.classList.contains('show')
     && document.activeElement === document.body){
    e.preventDefault();
    S.running ? stop() : start();
  }
});

/* Вкладка/окно снова видимы — пересчитать немедленно, не ждать секунды */
document.addEventListener('visibilitychange', function(){
  if(!document.hidden && S.running) renderTick();
});

/* ================= инициализация ================= */
buildTicks();
loadSettings();
loadStats();
renderSettings();
renderStats();
renderTick();
updateTray();

})();
