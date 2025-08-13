// Globe Brief static app
const FEED_PATH = 'SampleFeed/feed.json';
const GOAL_MINUTES_DEFAULT = 10;
const KEYS = {
  lastOpen: 'gb.lastOpen',
  streak: 'gb.streak',
  minutesByDate: 'gb.minutesByDate',
  mastery: 'gb.mastery'
};

let feed = null;
let index = 0;
let isPlaying = false;
let timer = null;
let secondsLeft = 0;
let goalMinutes = GOAL_MINUTES_DEFAULT;

const el = (id) => document.getElementById(id);

function todayKey(){
  const d = new Date();
  return d.toISOString().slice(0,10);
}

function loadJSON(path){
  return fetch(path, {cache: 'no-store'}).then(r => {
    if(!r.ok) throw new Error('Feed not found');
    return r.json();
  });
}

function getStore(key, fallback){
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function setStore(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

function incrementStreak(){
  const last = getStore(KEYS.lastOpen, '');
  const today = todayKey();
  let streak = getStore(KEYS.streak, 0);
  if (last !== today){
    streak += 1;
    setStore(KEYS.streak, streak);
    confetti();
  }
  setStore(KEYS.lastOpen, today);
  return streak;
}

function updateRing(minutes){
  const circum = 326; // 2πr for r=52 (stroke-dasharray in CSS)
  const pct = Math.min(1, minutes/goalMinutes);
  const offset = circum * (1 - pct);
  document.querySelector('.progress-svg .fg').style.strokeDashoffset = offset;
  el('minutesNow').textContent = Math.round(minutes);
  el('minutesGoal').textContent = goalMinutes;
}

function minutesToday(){
  const map = getStore(KEYS.minutesByDate, {});
  return map[todayKey()] ?? 0;
}

function addMinutes(mins){
  const map = getStore(KEYS.minutesByDate, {});
  const k = todayKey();
  map[k] = (map[k] ?? 0) + mins;
  setStore(KEYS.minutesByDate, map);
  updateRing(map[k]);
}

function recordMastery(topic){
  const m = getStore(KEYS.mastery, {});
  m[topic] = (m[topic] ?? 0) + 1;
  setStore(KEYS.mastery, m);
  renderMastery();
  pulse('+'+1+' '+topic);
}

function pulse(text){
  const box = el('microFeedback');
  const node = document.createElement('div');
  node.className = 'pulse';
  node.textContent = text;
  box.appendChild(node);
  setTimeout(()=> node.remove(), 900);
}

function confetti(){
  const layer = document.getElementById('confettiLayer');
  for(let i=0;i<60;i++){
    const c = document.createElement('div');
    c.className='confetti';
    c.style.left = Math.random()*100+'vw';
    c.style.top = '-10px';
    c.style.transform = `rotate(${Math.random()*360}deg)`;
    c.style.animationDelay = (Math.random()*0.4)+'s';
    layer.appendChild(c);
    setTimeout(()=> c.remove(), 1700);
  }
}

function renderTOC(){
  const toc = document.getElementById('toc');
  toc.innerHTML='';
  feed.stories.forEach((s,i)=>{
    const item = document.createElement('div');
    item.className = 'item';
    if(i===index) item.classList.add('active');
    const title = document.createElement('div'); title.className='title'; title.textContent=s.title;
    const meta = document.createElement('div'); meta.className='meta';
    meta.innerHTML = `<span>${Math.round(s.durationSec/60)}m</span> · <span>${s.topic}</span>`;
    item.appendChild(title); item.appendChild(meta);
    item.onclick = ()=> select(i, true);
    toc.appendChild(item);
  });
}

function renderStory(){
  const s = feed.stories[index];
  el('storyUrl').textContent = s.title;
  el('storyUrl').href = s.url;
  el('storyAuthor').textContent = s.author || '—';
  el('storyTopic').textContent = s.topic || '';
  el('storySummary').textContent = s.summary || '';
  secondsLeft = Math.max(1, s.durationSec | 0);
  el('secondsLeft').textContent = secondsLeft;
  // refresh active row
  [...document.querySelectorAll('.toc .item')].forEach((n, i)=>{
    n.classList.toggle('active', i === index);
  });
}

function renderMastery(){
  const list = document.getElementById('masteryList');
  const m = getStore(KEYS.mastery, {});
  const rows = Object.keys(m).sort((a,b)=> (m[b]-m[a]));
  list.innerHTML = rows.map(topic => {
    const count = m[topic];
    const lvl = 1 + Math.floor(count/5);
    return `<li><span>${topic}</span><span class="lvl">Lv ${lvl} · ${count}</span></li>`;
  }).join('') || '<li><span>—</span><span class="lvl">Lv 1 · 0</span></li>';
}

function select(i, stopPlayback=false){
  if(i<0 || i>=feed.stories.length) return;
  index = i;
  if(stopPlayback) pause();
  renderStory();
}

function tick(){
  if(!isPlaying) return;
  secondsLeft -= 1;
  if(secondsLeft <= 0){
    completeCurrent();
  }else{
    el('secondsLeft').textContent = secondsLeft;
    timer = setTimeout(tick, 1000);
  }
}

function play(){
  if(isPlaying) return;
  isPlaying = true;
  el('playPauseBtn').textContent = 'Pause';
  timer = setTimeout(tick, 1000);
}
function pause(){
  isPlaying = false;
  el('playPauseBtn').textContent = 'Play';
  if(timer) { clearTimeout(timer); timer=null; }
}

function completeCurrent(){
  pause();
  // award time & mastery
  const s = feed.stories[index];
  addMinutes((s.durationSec ?? 0)/60);
  if(s.topic) recordMastery(s.topic);
  // micro feedback
  pulse('✓ Completed');
  // autoplay next
  if(index + 1 < feed.stories.length){
    select(index+1);
    play();
  } else {
    pulse('All caught up ✨');
  }
}

function bindUI(){
  el('playPauseBtn').onclick = ()=> isPlaying ? pause() : play();
  el('nextBtn').onclick = ()=> { completeCurrent(); };
  el('prevBtn').onclick = ()=> { select(Math.max(0, index-1), true); };
}

async function boot(){
  try{
    feed = await loadJSON(FEED_PATH);
  }catch(e){
    // fallback seed
    feed = {"dailyGoalMinutes":10,"stories":[
      {"id":"seed-1","title":"Welcome to Globe Brief","url":"https://www.boston.com/","author":"Boston.com Staff","publishedAt":null,"topic":"Local","summary":"This is a short sample. Tap Next or wait for auto-advance.","durationSec":20,"audioUrl":"","source":"Boston.com"}
    ]};
  }
  goalMinutes = feed.dailyGoalMinutes || GOAL_MINUTES_DEFAULT;
  // streak & header
  const streak = incrementStreak();
  document.getElementById('streakCount').textContent = streak;
  updateRing(minutesToday());
  // render
  renderTOC(); renderStory(); renderMastery(); bindUI();
}

document.addEventListener('DOMContentLoaded', boot);
