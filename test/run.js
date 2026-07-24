const { boot } = require('./harness');
const LIB = require('../src/exercises.js');

let pass = 0, fail = 0;
function check(name, cond, extra){
  if(cond){ pass++; console.log('  ok   ' + name); }
  else    { fail++; console.log('  FAIL ' + name + (extra ? '  → ' + extra : '')); }
}
function section(t){ console.log('\n' + t); }

const MIN = 60000;

/* ---------------------------------------------------------- */
section('1. Базовый цикл работа → предупреждение → перерыв');
{
  const t = boot();
  t.click('startBtn');
  check('фаза "Работа" после старта', t.phase() === 'Работа', t.phase());
  check('оверлей закрыт', !t.overlayOpen());

  t.advance(24 * MIN);           // 24 из 25 минут
  check('через 24 мин ещё работа', t.phase() === 'Работа');
  check('предупреждения ещё нет', !t.warningOpen());

  t.advance(35 * 1000);          // 24:35 → в зоне предупреждения
  check('предупреждение показано за 30 сек', t.warningOpen());
  check('фаза всё ещё работа', t.phase() === 'Работа');

  t.advance(40 * 1000);          // перевалили 25 мин
  check('перешли в перерыв', t.phase() === 'Перерыв', t.phase());
  check('оверлей открыт', t.overlayOpen());
  check('предупреждение скрыто', !t.warningOpen());

  const r = t.invoked.filter(i => i.cmd === 'enter_rest');
  check('окно запрошено поверх остальных', r.length === 1, 'вызовов: ' + r.length);

  t.advance(5 * MIN + 2000);     // перерыв кончился
  check('вернулись в работу', t.phase() === 'Работа', t.phase());
  check('оверлей закрыт', !t.overlayOpen());
  check('перерыв засчитан', t.$('statToday').textContent === '1', t.$('statToday').textContent);
}

/* ---------------------------------------------------------- */
section('2. Гонка: фаза не должна проскакивать дважды');
{
  const t = boot();
  t.click('startBtn');
  let switches = 0, prev = t.phase();
  for(let i = 0; i < 90; i++){
    t.advance(MIN);
    if(t.phase() !== prev){ switches++; prev = t.phase(); }
  }
  // 90 минут при цикле 25+5=30 → ровно 3 полных цикла = 6 переключений
  check('за 90 мин ровно 6 переключений фаз', switches === 6, 'получено ' + switches);
  check('перерывов засчитано 3', t.$('statToday').textContent === '3', t.$('statToday').textContent);
}

/* ---------------------------------------------------------- */
section('3. Сон компьютера во время работы');
{
  const t = boot();
  t.click('startBtn');
  t.advance(10 * MIN);           // отработал 10 мин из 25

  t.sleep(90 * MIN);             // ноутбук спал полтора часа
  t.advance(1500);               // проснулись, тикнули

  check('после долгого сна фаза — работа', t.phase() === 'Работа', t.phase());
  check('перерыв НЕ выскочил сразу', !t.overlayOpen());
  const secs = t.time().split(':').map(Number);
  const left = secs[0]*60 + secs[1];
  check('отсчёт начат заново (~25 мин)', left > 24*60, 'осталось ' + t.time());
  check('подсказка объясняет причину',
        /не было|заново/.test(t.$('hint').textContent), t.$('hint').textContent);
}

section('4. Короткая отлучка не съедает рабочее время');
{
  const t = boot();
  t.click('startBtn');
  t.advance(10 * MIN);
  const before = t.time();

  t.sleep(2 * MIN);              // отошёл на 2 минуты (меньше перерыва в 5)
  t.advance(1500);

  const p = s => { const a = s.split(':').map(Number); return a[0]*60+a[1]; };
  check('отлучка не засчитана как работа', Math.abs(p(before) - p(t.time())) < 5,
        before + ' → ' + t.time());
  check('фаза не сменилась', t.phase() === 'Работа');
}

section('5. Сон во время перерыва = перерыв состоялся');
{
  const t = boot();
  t.click('startBtn');
  t.advance(25 * MIN + 2000);
  check('в перерыве', t.phase() === 'Перерыв', t.phase());

  t.sleep(20 * MIN);             // ушёл и правда отдохнул
  t.advance(1500);

  check('вернулись к работе', t.phase() === 'Работа', t.phase());
  check('перерыв засчитан как выполненный', t.$('statToday').textContent === '1');
}

/* ---------------------------------------------------------- */
section('6. Отсрочка');
{
  const t = boot();
  t.click('startBtn');
  t.advance(24 * MIN + 35000);
  check('предупреждение видно', t.warningOpen());

  t.click('snoozeBtn');
  check('предупреждение скрыто', !t.warningOpen());
  check('фаза осталась рабочей', t.phase() === 'Работа');

  // на момент отсрочки оставалось ~25 сек, отсрочка добавляет 5 мин → ~5:25
  t.advance(4 * MIN);
  check('через 4 мин перерыв ещё не начался', t.phase() === 'Работа', t.phase());

  t.advance(2 * MIN);
  check('после отсрочки перерыв наступил', t.phase() === 'Перерыв', t.phase());
}

section('7. Лимит отсрочек — три штуки');
{
  const t = boot();
  t.click('startBtn');
  t.advance(24 * MIN + 35000);
  for(let i = 0; i < 3; i++){
    t.click('snoozeBtn');
    t.advance(5 * MIN);
  }
  check('кнопка отсрочки заблокирована', t.$('snoozeBtn').disabled === true);
  const label = t.$('snoozeBtn').textContent;
  check('надпись объясняет блокировку', /кончил/i.test(label), label);
}

/* ---------------------------------------------------------- */
section('8. Упражнения зависят от длины перерыва');
{
  const t = boot();
  // ставим перерыв 1 минуту
  for(let i = 0; i < 4; i++) t.click('restMinus');
  check('перерыв = 1 мин', t.$('restVal').textContent === '1', t.$('restVal').textContent);

  t.click('startBtn');
  t.advance(25 * MIN + 2000);
  const microName = t.$('exerciseName').textContent;
  const micro = LIB.EXERCISES.micro.map(e => e.name);
  check('на 1-минутном перерыве упражнение из уровня micro',
        micro.includes(microName), microName);
}
{
  const t = boot();
  for(let i = 0; i < 10; i++) t.click('restPlus');   // 5 → 15 мин
  check('перерыв = 15 мин', t.$('restVal').textContent === '15');
  t.click('startBtn');
  t.advance(25 * MIN + 2000);
  const longName = t.$('exerciseName').textContent;
  const long = LIB.EXERCISES.long.map(e => e.name);
  check('на 15-минутном перерыве упражнение из уровня long',
        long.includes(longName), longName);
}

section('9. Упражнения не повторяются подряд');
{
  const t = boot();
  t.click('startBtn');
  const seen = [];
  for(let i = 0; i < 8; i++){
    t.advance(25 * MIN + 2000);
    seen.push(t.$('exerciseName').textContent);
    t.advance(5 * MIN + 2000);
  }
  const dupAdjacent = seen.some((v,i) => i > 0 && v === seen[i-1]);
  check('нет двух одинаковых подряд', !dupAdjacent, seen.join(' | '));
  check('разнообразие есть', new Set(seen).size >= 6, 'уникальных: ' + new Set(seen).size);
}

/* ---------------------------------------------------------- */
section('10. Клавиатура');
{
  const t = boot();
  t.click('startBtn');
  t.advance(25 * MIN + 2000);
  check('оверлей открыт', t.overlayOpen());
  t.key('Escape');
  check('Esc закрывает перерыв', !t.overlayOpen());
  check('Esc возвращает к работе', t.phase() === 'Работа', t.phase());
  check('пропуск засчитан как пропуск, не как выполнение',
        t.$('statToday').textContent === '0', t.$('statToday').textContent);
}

/* ---------------------------------------------------------- */
section('11. Мягкий режим не захватывает экран');
{
  const t = boot();
  t.click('softMode');
  t.click('startBtn');
  t.advance(25 * MIN + 2000);
  const grabs = t.invoked.filter(i => i.cmd === 'enter_rest');
  check('enter_rest не вызывался', grabs.length === 0, 'вызовов: ' + grabs.length);
  const notes = t.invoked.filter(i => i.cmd === 'notify');
  check('уведомление всё равно отправлено', notes.length >= 1);
  check('оверлей в окне всё равно показан', t.overlayOpen());
}

/* ---------------------------------------------------------- */
section('12. Настройки сохраняются');
{
  const t = boot();
  t.click('workPlus'); t.click('workPlus');   // 25 → 35
  t.click('restPlus');                        // 5 → 6
  t.$('volRange').value = '30';
  t.$('volRange').oninput();

  const saved = JSON.parse(t.store['peredyshka.settings.v1']);
  check('работа сохранена', saved.workMin === 35, saved.workMin);
  check('отдых сохранён', saved.restMin === 6, saved.restMin);
  check('громкость сохранена', saved.volume === 30, saved.volume);

  const t2 = boot({ seedStore: t.store });
  check('после перезапуска работа восстановлена', t2.$('workVal').textContent === '35');
  check('после перезапуска отдых восстановлен', t2.$('restVal').textContent === '6');
  check('после перезапуска громкость восстановлена', t2.$('volRange').value === '30');
}

/* ---------------------------------------------------------- */
section('13. Серия дней');
{
  const day = d => '2026-07-' + String(d).padStart(2,'0');
  // вчера была серия 4 дня
  const seed = { 'peredyshka.stats.v1': JSON.stringify({
    date: day(23), done: 5, skipped: 0, streak: 4, lastDoneDate: day(23) }) };

  const t = boot({ seedStore: seed, startTime: new Date('2026-07-24T10:00:00').getTime() });
  check('счётчик за день обнулён на новый день', t.$('statToday').textContent === '0');
  check('серия сохранена до первого перерыва', t.$('statStreak').textContent === '4');

  t.click('startBtn');
  t.advance(25 * MIN + 2000);
  t.click('doneBtn');
  check('серия выросла до 5', t.$('statStreak').textContent === '5', t.$('statStreak').textContent);
  check('перерыв засчитан', t.$('statToday').textContent === '1');
}

section('14. Серия рвётся после пропущенного дня');
{
  const seed = { 'peredyshka.stats.v1': JSON.stringify({
    date:'2026-07-20', done: 3, skipped: 0, streak: 9, lastDoneDate:'2026-07-20' }) };
  const t = boot({ seedStore: seed, startTime: new Date('2026-07-24T10:00:00').getTime() });
  check('серия обнулена', t.$('statStreak').textContent === '0', t.$('statStreak').textContent);

  t.click('startBtn');
  t.advance(25 * MIN + 2000);
  t.click('doneBtn');
  check('серия начата заново с 1', t.$('statStreak').textContent === '1', t.$('statStreak').textContent);
}

/* ---------------------------------------------------------- */
section('15. Звук и громкость');
{
  const t = boot();
  t.click('startBtn');
  const before = t.sounds.length;
  t.advance(25 * MIN + 2000);
  check('сигнал перерыва прозвучал', t.sounds.length > before);

  const t2 = boot();
  t2.click('muteBtn');
  t2.click('startBtn');
  const b2 = t2.sounds.length;
  t2.advance(25 * MIN + 2000);
  check('в беззвучном режиме тишина', t2.sounds.length === b2,
        'звуков: ' + (t2.sounds.length - b2));
}

/* ---------------------------------------------------------- */
section('16. Остановка сбрасывает всё');
{
  const t = boot();
  t.click('startBtn');
  t.advance(25 * MIN + 2000);
  check('в перерыве', t.overlayOpen());
  t.click('startBtn');            // остановить
  check('оверлей закрыт', !t.overlayOpen());
  check('фаза сброшена', t.phase() === 'Готов к работе', t.phase());
  const back = t.invoked.filter(i => i.cmd === 'enter_work');
  check('окно возвращено из полноэкранного', back.length >= 1);

  t.advance(60 * MIN);
  check('после остановки таймер стоит', t.phase() === 'Готов к работе', t.phase());
}

/* ---------------------------------------------------------- */
console.log('\n' + '─'.repeat(52));
console.log(`Пройдено: ${pass}   Провалено: ${fail}`);
process.exit(fail ? 1 : 0);
