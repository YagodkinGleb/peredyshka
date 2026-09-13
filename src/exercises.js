/* Домашние комплексы. Дозировки — настройки приложения, источники: EXERCISES.md. */
const GROUPS = {legs:'Ноги и ягодицы', upper:'Грудь, плечи и руки', core:'Корпус', back:'Спина и подвижность'};
const MOVEMENTS = {
  squat:{name:'Приседания',zone:'legs',family:'squat',reps:[8,12,16],tempo:3,pose:'squat',
    cues:['Стопы чуть шире таза, носки немного наружу. Руки перед собой.','Отведи таз назад и опустись на удобную глубину. Колени направляй по линии носков.','Встань с опорой на всю стопу. Не округляй спину и не отрывай пятки.'],repeat:'Вниз и обратно вверх — один повтор.'},
  lunge:{name:'Выпады назад',zone:'legs',family:'lunge',reps:[3,5,7],tempo:3,perSide:true,pose:'lunge',
    cues:['Встань ровно, стопы на ширине таза. Оставь место для одного шага назад.','Шагни назад и согни обе ноги на удобную глубину. Переднее колено направляй по линии носка.','Вернись в стойку и смени ногу. Держи корпус устойчиво, не ударяй коленом о пол.'],repeat:'Выпад и возврат — один повтор. Чередуй ноги.'},
  bridge:{name:'Ягодичный мостик',zone:'legs',family:'bridge',floor:true,reps:[8,12,16],tempo:3,pose:'bridge',
    cues:['Ляг на спину, согни колени. Стопы полностью на полу, примерно на ширине таза.','Подними таз, напрягая ягодицы, до линии плечи — таз — колени.','Плавно опусти таз. Не запрокидывай голову и не прогибай поясницу в верхней точке.'],repeat:'Подъём и опускание таза — один повтор.'},
  squatPause:{name:'Приседания с паузой',zone:'legs',family:'squat',minLevel:1,reps:[6,8,10],tempo:5,pose:'squat',
    cues:['Стопы чуть шире таза. Руки перед собой, пятки на полу.','Опустись на удобную глубину и задержись на две секунды. Колени по линии носков.','Плавно встань. Сохраняй ровную спину и не пружинь внизу.'],repeat:'Приседание, пауза и подъём — один повтор.'},
  pushup:{name:'Отжимания',zone:'upper',family:'push',floor:true,minLevel:1,reps:[4,8,12],tempo:3,pose:'pushup',
    cues:['Упор на ладонях и носках. Ладони чуть шире плеч, тело в одну линию.','Согни локти, направляя их немного назад, и опусти грудь к полу на удобную глубину.','Выжми себя вверх. Живот подтянут: таз не провисает и не поднимается раньше плеч.'],repeat:'Опуститься и выпрямить руки — один повтор.'},
  kneePushup:{name:'Отжимания с колен',zone:'upper',family:'push',floor:true,maxLevel:0,reps:[5,8,10],tempo:3,pose:'kneePushup',
    cues:['Ладони чуть шире плеч, колени на полу. От колен до головы — прямая линия.','Сгибай локти немного назад и опускай грудь, удерживая живот подтянутым.','Выпрями руки. Не сгибайся в тазу и не тяни голову к полу отдельно от корпуса.'],repeat:'Опуститься и подняться — один повтор.'},
  wallPushup:{name:'Отжимания от стены',zone:'upper',family:'push',standingAlternative:true,reps:[8,12,16],tempo:3,pose:'wallPushup',
    cues:['Ладони на стене на уровне груди, чуть шире плеч. Отступи, сохраняя устойчивость.','Сгибай локти и приближай грудь к стене всем корпусом, без прогиба в пояснице.','Оттолкнись и выпрями руки. Чем дальше стопы от стены, тем труднее движение.'],repeat:'Приблизиться к стене и оттолкнуться — один повтор.'},
  plank:{name:'Планка на предплечьях',zone:'core',family:'plank',floor:true,hold:[20,30,40],pose:'plank',
    cues:['Локти под плечами, предплечья и носки на полу.','Подними таз до прямой линии с плечами и пятками. Подтяни живот.','Дыши свободно. Не провисай в пояснице; если форму удержать не получается, опустись на колени.'],repeat:'Удерживай положение до сигнала, сохраняя технику.'},
  sidePlank:{name:'Боковая планка с колен',zone:'core',family:'sidePlank',floor:true,hold:[12,18,24],perSide:true,pose:'sidePlank',
    cues:['Ляг на указанный бок, колени согнуты. Локоть нижней руки точно под плечом.','Подними таз, опираясь на предплечье и колени. Плечи, таз и колени на одной линии.','Удерживай таз без провисания и дыши свободно. Смена стороны будет отдельным этапом.'],repeat:'Удержание выполняется отдельно на каждом боку.'},
  deadbug:{name:'Рука и нога лёжа на спине',zone:'core',family:'deadbug',floor:true,reps:[3,5,7],tempo:4,perSide:true,pose:'deadbug',
    cues:['Ляг на спину, подними руки вверх. Бёдра над тазом, колени согнуты под прямым углом.','Медленно отведи одну руку за голову, а противоположную ногу вытяни вперёд над полом.','Вернись и смени пару. Уменьши размах, если поясница начинает отрываться от пола.'],repeat:'Вытянуть руку и противоположную ногу и вернуть — один повтор. Чередуй стороны.'},
  shoulderTap:{name:'Касания плеч в упоре',zone:'core',family:'plank',floor:true,minLevel:1,reps:[4,6,8],tempo:2,perSide:true,pose:'shoulderTap',
    cues:['Упор на прямых руках, ладони под плечами. Стопы расставь чуть шире таза.','Коснись ладонью противоположного плеча и верни руку на пол. Затем смени руку.','Держи таз ровно, не раскачивай корпус. Двигайся медленно, сохраняя опору.'],repeat:'Касание и возврат руки на пол — один повтор.'},
  standingKnee:{name:'Колено к противоположной руке',zone:'core',family:'standingKnee',standingAlternative:true,reps:[5,8,10],tempo:2,perSide:true,pose:'standingKnee',
    cues:['Встань ровно, стопы на ширине таза. Руки согнуты перед грудью.','Подними колено и коснись его противоположной ладонью без наклона головы вперёд.','Опусти ногу и смени сторону. Не прыгай, держи корпус устойчиво.'],repeat:'Подъём и опускание колена — один повтор. Чередуй ноги.'},
  birdDog:{name:'Рука и нога на четвереньках',zone:'back',family:'birdDog',floor:true,reps:[3,5,6],tempo:4,perSide:true,pose:'birdDog',
    cues:['Встань на четвереньки: ладони под плечами, колени под тазом.','Вытяни вперёд руку, а противоположную ногу назад до линии корпуса.','Вернись и смени пару. Не разворачивай таз и не прогибай поясницу.'],repeat:'Вытяжение и возврат — один повтор. Чередуй стороны.'},
  proneW:{name:'Подъёмы рук буквой W',zone:'back',family:'proneW',floor:true,reps:[6,10,12],tempo:3,pose:'proneW',
    cues:['Ляг на живот, взгляд вниз. Согни локти так, чтобы руки образовали букву W.','Слегка приподними руки, мягко сближая лопатки. Плечи не тяни к ушам.','Плавно опусти руки. Не запрокидывай голову и не поднимай грудь за счёт прогиба поясницы.'],repeat:'Небольшой подъём рук и опускание — один повтор.'},
  wallSlide:{name:'Подъёмы рук у стены',zone:'back',family:'wallSlide',standingAlternative:true,reps:[6,10,12],tempo:3,pose:'wallSlide',
    cues:['Встань спиной к стене. Согни локти, направляя ладони вперёд.','Поднимай и опускай руки в удобном диапазоне, не поднимая плечи к ушам.','Не прижимай руки к стене силой и не увеличивай прогиб поясницы.'],repeat:'Поднять и опустить руки — один повтор.'}
};
Object.entries(MOVEMENTS).forEach(([id,m])=>{ m.id=id; m.form=m.cues.join(' '); });
const DEFAULT_TRAINING = {level:1,groups:Object.keys(GROUPS),floor:true,excluded:[],upperAbility:'unknown',lowerAbility:'unknown'};
function normalizeTraining(value){
  const p=value && typeof value==='object' ? value : {};
  return {level:[0,1,2].includes(p.level)?p.level:1,
    groups:Array.isArray(p.groups)?Object.keys(GROUPS).filter(g=>p.groups.includes(g)):Object.keys(GROUPS),
    floor:typeof p.floor==='boolean'?p.floor:true,
    excluded:Array.isArray(p.excluded)?Object.keys(MOVEMENTS).filter(id=>p.excluded.includes(id)):[],
    upperAbility:['few','some','many'].includes(p.upperAbility)?p.upperAbility:'unknown',
    lowerAbility:['few','some','many'].includes(p.lowerAbility)?p.lowerAbility:'unknown'};
}
function movementLevel(m,p){
  const ability=m.zone==='upper'?p.upperAbility:m.zone==='legs'?p.lowerAbility:'unknown';
  return ability==='unknown'?p.level:['few','some','many'].indexOf(ability);
}
function availableMovements(value){
  const p=normalizeTraining(value);
  return Object.values(MOVEMENTS).filter(m=>{
    const level=movementLevel(m,p);
    return p.groups.includes(m.zone) && !p.excluded.includes(m.id) && (!m.floor || p.floor)
      && (m.minLevel===undefined || level>=m.minLevel) && (m.maxLevel===undefined || level<=m.maxLevel)
      && (!m.standingAlternative || !p.floor);
  });
}
function doseText(step){
  return step.hold ? step.hold+' сек'+(step.side?' · '+step.side:'')
    : step.perSide ? 'По '+step.reps+' на сторону' : step.reps+' повторов';
}
function makeSet(m,p,round,budget){
  const level=movementLevel(m,p), pairedHold=!!(m.hold && m.perSide);
  const multiple=m.perSide?2:1, transition=pairedHold?5:0;
  const ideal=m.hold?m.hold[level]:m.reps[level];
  const tempo=m.hold?1:m.tempo;
  const count=Math.min(ideal,Math.floor((budget-transition)/(multiple*tempo)));
  if(count<(m.hold?10:m.perSide?2:4)) return [];
  const base={...m,round,reps:m.hold?null:count,hold:m.hold?count:null,
    duration:Math.ceil(count*tempo*(pairedHold?1:multiple))};
  return pairedHold ? [{...base,side:'левый бок'},{...base,side:'правый бок',restBefore:5}] : [base];
}
function createPicker(opts={}){
  const random=opts.random||Math.random;
  let recent=(Array.isArray(opts.recent)?opts.recent:[]).filter(id=>MOVEMENTS[id]).slice(-24);
  function pick(restMin,preferences){
    const totalSec=Number.isFinite(restMin)?Math.max(0,Math.floor(restMin*60)):0;
    const p=normalizeTraining(preferences), pool=availableMovements(p);
    const task={title:'Отдых от экрана',name:'Отдых от экрана',steps:[],stages:[],totalSec,workSec:0,
      preparationSec:totalSec>=60?(totalSec===60?10:15):0,
      detail:'Двигайся плавно. При боли остановись.',tip:'Не нужно догонять повторы ради таймера. На отдыхе отведи взгляд от экрана.'};
    if(totalSec<60 || !pool.length){ task.stages=[{kind:'recovery',start:0,end:totalSec,index:-1}];task.empty=true;return task; }
    const activeBudget=Math.min(totalSec,600), recovery=totalSec===60?5:15;
    const maxUnique=totalSec<=60?1:totalSec<=180?3:totalSec<=300?4:5;
    const order=[], usedFamilies=new Set();
    let lastZone=recent.length?MOVEMENTS[recent[recent.length-1]].zone:null;
    while(order.length<maxUnique){
      const candidates=pool.filter(m=>!usedFamilies.has(m.family));
      if(!candidates.length) break;
      const ranked=candidates.map(m=>({m,score:order.filter(chosen=>chosen.zone===m.zone).length*1000+(m.zone===lastZone?100:0)+(recent.includes(m.id)?30+recent.lastIndexOf(m.id):0)+random()*10}));
      ranked.sort((a,b)=>a.score-b.score);
      const m=ranked[0].m;order.push(m);usedFamilies.add(m.family);lastZone=m.zone;
    }
    let cursor=task.preparationSec, round=1, last=null;
    task.stages.push({kind:'prepare',start:0,end:cursor,index:0});
    while(cursor<activeBudget-recovery){
      let added=false;
      for(const m of order){
        const rest=last?(last.zone===m.zone?30:last.floor!==m.floor?25:20):0;
        const set=makeSet(m,p,round,activeBudget-recovery-cursor-rest);
        if(!set.length) continue;
        set.forEach((step,j)=>{
          const gap=j?step.restBefore:rest;
          const index=task.steps.length;
          if(gap) task.stages.push({kind:'rest',start:cursor,end:cursor+gap,index});
          cursor+=gap;
          step.restBefore=gap;task.steps.push(step);
          task.stages.push({kind:'work',start:cursor,end:cursor+step.duration,index});
          cursor+=step.duration;task.workSec+=step.duration;
        });
        last=m;added=true;
        if(totalSec<=60) break;
      }
      if(!added || totalSec<=60) break;
      round++;
    }
    task.stages.push({kind:'recovery',start:cursor,end:totalSec,index:-1});
    task.rounds=Math.max(1,...task.steps.map(s=>s.round));
    task.name=task.title=[...new Set(task.steps.map(s=>s.name))].join(' + ');
    recent=recent.concat(task.steps.map(s=>s.id)).slice(-24);
    return task;
  }
  pick.recent=()=>recent.slice();return pick;
}
function stageAt(task,elapsed,early=[]){
  const stage=task.stages.find(s=>elapsed<s.end) || task.stages[task.stages.length-1];
  if(stage.kind==='work' && early.includes(stage.index)){
    const next=task.stages.find(s=>s.kind==='work' && s.index>stage.index);
    return {kind:next?'rest':'recovery',index:next?next.index:-1,start:stage.start,end:next?next.start:task.totalSec,early:true};
  }
  return stage;
}
if(typeof module!=='undefined' && module.exports) module.exports={MOVEMENTS,GROUPS,DEFAULT_TRAINING,normalizeTraining,availableMovements,createPicker,stageAt,doseText};
