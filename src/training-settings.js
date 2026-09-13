function initTrainingSettings(initial,onChange){
  let value=normalizeTraining(initial);
  const root=document.getElementById('trainingSettings');
  root.innerHTML=`<h2>Твоя нагрузка</h2><p class="settings-note">Чередуем выбранные группы. Изменения применятся со следующего перерыва.</p>
    <fieldset><legend>Интенсивность</legend><div class="level-options">${['Легче','Обычная','Выше'].map((s,i)=>`<button type="button" data-level="${i}" aria-pressed="false">${s}</button>`).join('')}</div></fieldset>
    <details class="ability"><summary>Помочь подобрать нагрузку</summary><p class="settings-note">Вспомни недавний опыт. Проверять максимум сейчас не нужно. Ответы уточняют нагрузку отдельно для рук и ног.</p>
    <label>Сколько обычных отжиманий можешь сделать подряд с ровным корпусом?<select id="upperAbility"><option value="unknown">Не знаю — выбранный уровень</option><option value="few">0–5</option><option value="some">6–15</option><option value="many">16 и больше</option></select></label>
    <label>Как даются 10 обычных приседаний?<select id="lowerAbility"><option value="unknown">Не знаю — выбранный уровень</option><option value="few">Трудно, нужно меньше</option><option value="some">Посильно, нагрузка ощутима</option><option value="many">Легко, могу больше</option></select></label></details>
    <fieldset><legend>Условия</legend><label><input id="allowFloor" type="checkbox">Можно выполнять упражнения на полу</label><p class="settings-note">Все упражнения без прыжков и спортивного инвентаря. Для вариантов стоя может понадобиться стена.</p></fieldset>
    <fieldset><legend>Что включать в перерывы</legend>${Object.entries(GROUPS).map(([id,name])=>`<label><input type="checkbox" data-group="${id}">${name}</label>`).join('')}</fieldset>
    <details><summary>Выбрать конкретные упражнения</summary><p class="settings-note">Галочка разрешает упражнение. Уровень и условия дополнительно ограничивают подбор.</p>${Object.entries(GROUPS).map(([g,name])=>`<fieldset><legend>${name}</legend>${Object.values(MOVEMENTS).filter(m=>m.zone===g).map(m=>`<label><input type="checkbox" data-movement="${m.id}">${m.name}<small data-reason="${m.id}"></small></label>`).join('')}</fieldset>`).join('')}</details>
    <p id="trainingStatus" class="settings-note" role="status"></p>`;
  function render(){
    root.querySelectorAll('[data-level]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.level)===value.level)));
    root.querySelectorAll('[data-group]').forEach(b=>b.checked=value.groups.includes(b.dataset.group));
    root.querySelectorAll('[data-movement]').forEach(b=>b.checked=!value.excluded.includes(b.dataset.movement));
    root.querySelector('#allowFloor').checked=value.floor;
    ['upperAbility','lowerAbility'].forEach(k=>root.querySelector('#'+k).value=value[k]);
    const eligible=availableMovements(value);
    root.querySelectorAll('[data-reason]').forEach(label=>{
      const m=MOVEMENTS[label.dataset.reason];
      label.textContent=eligible.includes(m)?'':value.excluded.includes(m.id)?'Исключено':!value.groups.includes(m.zone)?'Группа выключена':m.floor&&!value.floor?'Нужен пол':m.standingAlternative&&value.floor?'Вариант для режима без пола':'Другой уровень нагрузки';
    });
    root.querySelector('#trainingStatus').textContent=eligible.length ? 'Доступно упражнений: '+eligible.length+'. Выбор сохраняется автоматически.' : 'Нет подходящих упражнений. Включи группу или упражнение, либо измени условия. Пока перерывы будут без упражнений.';
  }
  function changed(){value=normalizeTraining(value);render();onChange(value);}
  root.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>{value.level=Number(b.dataset.level);value.upperAbility=value.lowerAbility='unknown';changed();});
  root.querySelectorAll('[data-group]').forEach(b=>b.onchange=()=>{value.groups=b.checked?value.groups.concat(b.dataset.group):value.groups.filter(g=>g!==b.dataset.group);changed();});
  root.querySelectorAll('[data-movement]').forEach(b=>b.onchange=()=>{value.excluded=b.checked?value.excluded.filter(id=>id!==b.dataset.movement):value.excluded.concat(b.dataset.movement);changed();});
  root.querySelector('#allowFloor').onchange=e=>{value.floor=e.target.checked;changed();};
  ['upperAbility','lowerAbility'].forEach(k=>root.querySelector('#'+k).onchange=e=>{value[k]=e.target.value;changed();});
  render();
}
