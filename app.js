// Globe Brief - static web app (no build).
// - Loads /SampleFeed/feed.json
// - Renders list + detail, auto-advance, daily streak + progress ring
// - Persists to localStorage (minutes/ day, streak counters)

const FEED_PATH = './SampleFeed/feed.json';

// ------- Simple stores in localStorage -------
const minutesKey = 'globe.mvp.minutes';
const streakKey  = 'globe.mvp.streaks';
const masteryKey = 'globe.mvp.mastery';

function dateKey(d = new Date()){
  const y = d.getUTCFullYear();
  const m = (d.getUTCMonth()+1).toString().padStart(2,'0');
  const day = d.getUTCDate().toString().padStart(2,'0');
  return `${y}-${m}-${day}`;
}

const ProgressStore = {
  get minutesDict(){ return JSON.parse(localStorage.getItem(minutesKey) || '{}'); },
  set minutesDict(v){ localStorage.setItem(minutesKey, JSON.stringify(v)); },
  add(mins){
    const key = dateKey();
    const dict = this.minutesDict;
    dict[key] = Math.max(0, (dict[key] || 0) + mins);
    this.minutesDict = dict;
  },
  today(){ return this.minutesDict[dateKey()] || 0; },
  streakCount(){
    const s = JSON.parse(localStorage.getItem(streakKey) || '{}');
    return s['streak'] || 0;
  },
  bumpStreakIfNewDay(){
    const s = JSON.parse(localStorage.getItem(streakKey) || '{}');
    const today = dateKey();
    const yesterday = dateKey(new Date(Date.now() - 24*3600*1000));
    const lastSeen = s['lastSeen'];
    if(lastSeen === today) return;
    const streak = (lastSeen === yesterday) ? (s['streak'] || 0) + 1 : 1;
    localStorage.setItem(streakKey, JSON.stringify({ lastSeen: today, streak }));
  }
};

const MasteryStore = {
  get dict(){ return JSON.parse(localStorage.getItem(masteryKey) || '{}'); },
  set dict(v){ localStorage.setItem(masteryKey, JSON.stringify(v)); },
  level(topic){
    const m = this.dict;
    const c = m[topic] || 0;
    return Math.max(1, 1 + Math.floor(c / 5));
  },
  increment(story){
    const m = this.dict;
    m[story.topic] = (m[story.topic] || 0) + 1;
    this.dict = m;
  }
};

// ------- UI helpers -------
function el(sel){ return document.querySelector(sel); }
function create(tag, cls){ const n = document.createElement(tag); if(cls) n.className = cls; return n; }

function setProgressRing(percent){
  const p = Math.max(0, Math.min(100, percent));
  el('#progressArc').setAttribute('stroke-dasharray', `${p},100`);
}

function minutesToPercent(todayMinutes, goal){ return 100 * Math.min(1, todayMinutes / goal); }

// ------- App state -------
let feed = { stories: [], dailyGoalMinutes: 10 };
let index = 0;
let secondsLeft = 0;
let timer = null;

async function loadFeed(){
  try{
    const res = await fetch(FEED_PATH, { cache:'no-store' });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    feed = await res.json();
  }catch(err){
    console.warn('Falling back to inline feed because fetch failed:', err);
    feed = {
      dailyGoalMinutes: 10,
      stories: [{
        id: 'seed-1',
        title: 'Welcome to Globe Brief',
        url: 'https://www.boston.com/',
        author: 'Boston.com Staff',
        publishedAt: null,
        topic: 'Local',
        summary: 'This is a short sample. Tap Next or wait for auto-advance.',
        durationSec: 20,
        audioUrl: '',
        source: 'Boston.com'
      }]
    };
  }
}

function renderList(){
  const list = el('#storyList');
  list.innerHTML = '';
  feed.stories.forEach((s, i) => {
    const a = create('a', 'item');
    a.href = '#';
    a.innerHTML = `<h3>${s.title}</h3>
      <div class="meta"><span>${s.author || '—'}</span><span>•</span><span>${s.topic || '—'}</span><span>•</span><span>${Math.round((s.durationSec||20)/60)}m</span></div>`;
    a.addEventListener('click', (e)=>{ e.preventDefault(); select(i, false); });
    list.appendChild(a);
  });
}

function select(i, fromAuto){
  index = i;
  const s = feed.stories[index];
  el('#storyTitle').textContent = s.title;
  el('#storyBy').textContent = s.author || '';
  el('#storyTopic').textContent = s.topic || '';
  el('#storySummary').textContent = s.summary || '';
  const btn = el('#openLink');
  btn.disabled = !s.url;
  btn.onclick = ()=>{ if(s.url) window.open(s.url, '_blank'); };

  secondsLeft = Math.max(1, s.durationSec || 20);
  el('#countdown').textContent = `${secondsLeft}s`;

  if(!fromAuto){ // only count mastery on manual 'reading' completion
    // nothing here; increment when we auto-advance or click Next
  }

  startTimer();
}

function startTimer(){
  clearInterval(timer);
  if(!el('#autoAdvance').checked){ return; }
  timer = setInterval(()=>{
    secondsLeft -= 1;
    el('#countdown').textContent = `${Math.max(0, secondsLeft)}s`;
    if(secondsLeft <= 0){
      completeCurrent();
    }
  }, 1000);
}

function completeCurrent(){
  clearInterval(timer);
  const s = feed.stories[index];
  MasteryStore.increment(s);

  // credit minutes
  ProgressStore.add(Math.ceil((s.durationSec||20) / 60));
  ProgressStore.bumpStreakIfNewDay();
  updateStreakAndRing();

  const next = (index + 1) % feed.stories.length;
  select(next, true);
}

function updateStreakAndRing(){
  const streak = ProgressStore.streakCount();
  el('#streakDays').textContent = `${streak} day${streak===1?'':'s'}`;
  const pct = minutesToPercent(ProgressStore.today(), feed.dailyGoalMinutes || 10);
  setProgressRing(pct);
}

// ------- wire up -------
async function main(){
  await loadFeed();
  renderList();
  updateStreakAndRing();
  select(0, false);

  el('#nextBtn').addEventListener('click', ()=> completeCurrent());
  el('#autoAdvance').addEventListener('change', ()=> startTimer());
}
main();
