import React, { useEffect, useMemo, useRef, useState } from 'react'

const FEED_PATH = '/SampleFeed/feed.json'

// --- Local stores (localStorage) ---
const minutesKey = 'globe.mvp.minutes'
const streakKey = 'globe.mvp.streaks'
const masteryKey = 'globe.mvp.mastery'

function todayKey() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth()+1).padStart(2,'0')
  const day = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${day}`
}

function minutesToday() {
  const dict = JSON.parse(localStorage.getItem(minutesKey) || '{}')
  const mins = dict[todayKey()] || 0
  return typeof mins === 'number' ? mins : 0
}

function addMinutes(n=1) {
  const dict = JSON.parse(localStorage.getItem(minutesKey) || '{}')
  const key = todayKey()
  dict[key] = Math.max(0, (dict[key] || 0) + n)
  localStorage.setItem(minutesKey, JSON.stringify(dict))
}

function bumpStreakIfNewDay() {
  const s = JSON.parse(localStorage.getItem(streakKey) || '{}')
  const today = todayKey()
  const last = s.lastSeen
  let next = 1
  if (last) {
    const y = new Date(last)
    const t = new Date(today)
    // Difference in days ignoring TZ:
    const diff = Math.round((t - y) / (1000*60*60*24))
    if (diff === 0) next = s.streak || 1
    else if (diff === 1) next = (s.streak || 0) + 1
    else next = 1
  }
  localStorage.setItem(streakKey, JSON.stringify({ lastSeen: today, streak: next }))
  return next
}

function streakCount() {
  const s = JSON.parse(localStorage.getItem(streakKey) || '{}')
  return s.streak || 1
}

function masteryIncrement(story) {
  const dict = JSON.parse(localStorage.getItem(masteryKey) || '{}')
  const t = story.topic || 'General'
  dict[t] = (dict[t] || 0) + 1
  localStorage.setItem(masteryKey, JSON.stringify(dict))
}

function masteryLevel(topic) {
  const dict = JSON.parse(localStorage.getItem(masteryKey) || '{}')
  const c = dict[topic] || 0
  return Math.max(1, 1 + Math.floor(c / 5))
}

// --- Components ---
function Ring({ progress=0 }) {
  // progress: 0..1
  const p = Math.max(0, Math.min(1, progress))*100
  return (
    <div className="ring" style={{['--p']: p}}><span>{Math.round(p)}%</span></div>
  )
}

export default function App() {
  const [feed, setFeed] = useState(null)
  const [index, setIndex] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const timerRef = useRef(null)

  // Load feed with fallback
  useEffect(() => {
    bumpStreakIfNewDay()
    fetch(FEED_PATH, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('not ok')))
      .then(setFeed)
      .catch(() => {
        setFeed({
          generatedAt: new Date().toISOString(),
          dailyGoalMinutes: 10,
          stories: [{
            id:'seed-1',
            title:'Welcome to Globe Brief',
            url:'https://www.boston.com/',
            author:'Boston.com Staff',
            topic:'Local',
            summary:'This is a short sample. Tap Next or wait for auto‑advance.',
            durationSec: 20, audioUrl:'', source:'Boston.com'
          }]
        })
      })
  }, [])

  const story = useMemo(() => feed?.stories?.[index] ?? null, [feed, index])
  const goal = feed?.dailyGoalMinutes ?? 10
  const progress = minutesToday() / goal

  // Timer for auto-advance
  useEffect(() => {
    if (!story) return
    clearInterval(timerRef.current)
    setSecondsLeft(Math.max(1, story.durationSec||15))
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          handleComplete()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [story?.id])

  function handleComplete() {
    if (!story) return
    masteryIncrement(story)
    addMinutes(Math.ceil((story.durationSec || 15)/60))
    const next = (index + 1) % (feed?.stories?.length || 1)
    setIndex(next)
  }

  if (!feed) {
    return (
      <div className="app">
        <div className="header"><div className="brand">Globe Brief</div></div>
        <div className="layout"><div className="sidebar"/><div className="detail">Loading…</div></div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="header">
        <div className="brand">Globe Brief</div>
        <div className="header-right">
          <div className="streak">🔥 <strong>{streakCount()}</strong> days</div>
          <Ring progress={progress}/>
        </div>
      </div>

      <div className="layout">
        <aside className="sidebar">
          <ul className="list">
            {feed.stories.map((s, i) => (
              <li key={s.id}
                  className={`row ${i===index ? 'active' : ''}`}
                  onClick={() => setIndex(i)}>
                <div>
                  <div className="title">{s.title}</div>
                  <div className="meta">{s.author} · {s.topic}</div>
                </div>
                <div style={{display:'grid', gap:6, justifyItems:'end'}}>
                  <span className="badge">L{masteryLevel(s.topic)}</span>
                  <span className="minutes">{Math.max(1, Math.round((s.durationSec||60)/60))}m</span>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        <main className="detail">
          <h2>{story.title}</h2>
          <div className="sub">By {story.author} · {story.topic} · <a className="link" href={story.url} target="_blank">source</a></div>

          <div className="summary">{story.summary}</div>

          <div className="controls">
            <button className="primary" onClick={handleComplete}>Next</button>
            <span className="caption">Auto‑advance in {secondsLeft}s</span>
          </div>
        </main>
      </div>
    </div>
  )
}
