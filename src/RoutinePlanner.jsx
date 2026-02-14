import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, Play, Pause, RotateCcw, Bell, Pencil, Save, Moon, Sun, BookOpenCheck, Dumbbell, GraduationCap } from "lucide-react";

// Tailwind is available by default in this canvas.
// All state is persisted to localStorage. No background jobs/notifications.

function parseTime(t) {
  // t: "HH:MM" -> Date today at that time
  const [h, m] = t.split(":" ).map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function formatHHMM(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function msBetween(a, b) {
  return b.getTime() - a.getTime();
}

function clamp01(x) { return Math.max(0, Math.min(1, x)); }

// --- Ambient sky gradient based on local time ---
const SKY_STOPS = [
  { m: 0, top: '#05091a', bottom: '#0b122e' },      // midnight
  { m: 270, top: '#0a1440', bottom: '#1b2655' },    // 04:30 pre-dawn
  { m: 345, top: '#2b2d6e', bottom: '#ff7e5f' },    // 05:45 sunrise
  { m: 480, top: '#87ceeb', bottom: '#f0f8ff' },    // 08:00 morning sky
  { m: 750, top: '#57b0ff', bottom: '#cfefff' },    // 12:30 bright noon
  { m: 990, top: '#79b4ff', bottom: '#ffe8b3' },    // 16:30 late afternoon
  { m: 1110, top: '#ff9966', bottom: '#55286f' },   // 18:30 sunset
  { m: 1200, top: '#1b1f3b', bottom: '#0e1433' },   // 20:00 blue hour
  { m: 1320, top: '#090c1a', bottom: '#0b122e' },   // 22:00 night
  { m: 1440, top: '#05091a', bottom: '#0b122e' },   // wrap 24:00
];

function hexToRgb(h) {
  const s = h.replace('#','');
  return { r: parseInt(s.slice(0,2),16), g: parseInt(s.slice(2,4),16), b: parseInt(s.slice(4,6),16) };
}
function rgbToHex(r, g, b) {
  const toH = (n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2,'0');
  return `#${toH(r)}${toH(g)}${toH(b)}`;
}
function mixHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  const r = Math.round(A.r + (B.r - A.r) * t);
  const g = Math.round(A.g + (B.g - A.g) * t);
  const b2 = Math.round(A.b + (B.b - A.b) * t);
  return rgbToHex(r, g, b2);
}
function ambientColorsFor(date) {
  const m = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
  let prev = SKY_STOPS[0], next = SKY_STOPS[SKY_STOPS.length - 1];
  for (let i = 1; i < SKY_STOPS.length; i++) {
    if (m < SKY_STOPS[i].m) { next = SKY_STOPS[i]; prev = SKY_STOPS[i - 1]; break; }
  }
  const span = (next.m - prev.m) || 1;
  const t = (m - prev.m) / span;
  return { top: mixHex(prev.top, next.top, t), bottom: mixHex(prev.bottom, next.bottom, t) };
}

const defaultPlan = {
  wake: "05:15", // you can edit in the UI
  gym: { start: "05:30", end: "07:00", title: "Morning Gym", icon: "Dumbbell" },
  classes: { start: "10:00", end: "17:00", title: "College Classes", icon: "GraduationCap" },
  study: { start: "19:30", end: "21:30", title: "Evening Study (2h)", icon: "BookOpenCheck" },
  sleep: "22:00",
};

const ICONS = { Dumbbell, GraduationCap, BookOpenCheck };

function useNow(tickMs = 1000) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);
  return now;
}

function useLocalStorage(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch {}
  }, [key, state]);
  return [state, setState];
}

function TimeBlock({ title, start, end, icon: Icon = Clock, done, onToggleDone, editable = true }) {
  const now = useNow(1000);
  const startD = parseTime(start);
  const endD = parseTime(end);
  const isNow = now >= startD && now <= endD;
  const progress = clamp01(msBetween(startD, now) / msBetween(startD, endD));

  return (
    <motion.div layout className={`rounded-2xl p-4 shadow-sm border bg-white/70 backdrop-blur grid gap-3 ${isNow ? 'ring-2 ring-indigo-500' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gray-100">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-lg">{title}</div>
            <div className="text-sm text-gray-600">{start} – {end}</div>
          </div>
        </div>
        <button
          onClick={onToggleDone}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}
        >
          <CheckCircle2 className="w-4 h-4" /> {done ? 'Done' : 'Mark done'}
        </button>
      </div>

      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${isNow ? 'bg-indigo-500' : 'bg-gray-300'}`}
          style={{ width: `${isNow ? Math.max(4, Math.round(progress * 100)) : 0}%` }}
        />
      </div>

      {isNow && (
        <div className="text-xs text-indigo-700">In progress – {Math.round(progress * 100)}% through</div>
      )}

      {!editable && (
        <div className="text-xs text-gray-500">Times are fixed for this block.</div>
      )}
    </motion.div>
  );
}

function Countdown({ seconds, running, onToggle, onReset, label }) {
  const [left, setLeft] = useState(seconds);
  const leftRef = useRef(left);
  const runningRef = useRef(running);
  useEffect(() => { leftRef.current = left; }, [left]);
  useEffect(() => { runningRef.current = running; }, [running]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!runningRef.current) return;
      setLeft((x) => Math.max(0, x - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { if (left === 0 && running) onToggle?.(); }, [left, running, onToggle]);

  const hh = Math.floor(left / 3600);
  const mm = Math.floor((left % 3600) / 60);
  const ss = left % 60;
  const pad = (n) => String(n).padStart(2, "0");

  return (
    <div className="rounded-2xl p-4 border bg-white/70 backdrop-blur flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Clock className="w-5 h-5" />
        <div>
          <div className="font-semibold">{label}</div>
          <div className="font-mono text-2xl">{pad(hh)}:{pad(mm)}:{pad(ss)}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onToggle} className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white flex items-center gap-2">
          {running ? <Pause className="w-4 h-4"/> : <Play className="w-4 h-4"/>}
          {running ? 'Pause' : 'Start'}
        </button>
        <button onClick={onReset} className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-800 flex items-center gap-2">
          <RotateCcw className="w-4 h-4"/> Reset
        </button>
      </div>
    </div>
  );
}

export default function RoutinePlanner() {
  const [plan, setPlan] = useLocalStorage("routine.plan.v1", defaultPlan);
  const [done, setDone] = useLocalStorage("routine.done.v1", {
    wake: false, gym: false, classes: false, study: false, sleep: false
  });
  const [editing, setEditing] = useState(false);

  const now = useNow(1000);
  const nowHHMM = formatHHMM(now);
  const ambient = useMemo(() => ambientColorsFor(now), [now]);
  const gradientCss = useMemo(() => `linear-gradient(to bottom, ${ambient.top}, ${ambient.bottom})`, [ambient]);
  const bedtime = parseTime(plan.sleep);
  const secondsToBed = Math.max(0, Math.floor((bedtime.getTime() - now.getTime()) / 1000));

  // Auto-reset at midnight
  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date();
      if (n.getHours() === 0 && n.getMinutes() === 0 && n.getSeconds() < 2) {
        setDone({ wake: false, gym: false, classes: false, study: false, sleep: false });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [setDone]);

  const blocks = useMemo(() => ([
    { key: 'wake', title: 'Wake Up', start: plan.wake, end: plan.gym.start, icon: Sun, fixed: false },
    { key: 'gym', title: plan.gym.title, start: plan.gym.start, end: plan.gym.end, icon: ICONS[plan.gym.icon] || Dumbbell, fixed: true },
    { key: 'classes', title: plan.classes.title, start: plan.classes.start, end: plan.classes.end, icon: ICONS[plan.classes.icon] || GraduationCap, fixed: true },
    { key: 'study', title: plan.study.title, start: plan.study.start, end: plan.study.end, icon: ICONS[plan.study.icon] || BookOpenCheck, fixed: false },
    { key: 'sleep', title: 'Sleep', start: plan.sleep, end: plan.sleep, icon: Moon, fixed: false },
  ]), [plan]);

  const [studyRunning, setStudyRunning] = useLocalStorage("routine.study.timer.running", false);
  const [studyStart, setStudyStart] = useLocalStorage("routine.study.timer.start", null);

  // Compute remaining study seconds (2 hours default based on plan)
  const studyTotalSec = useMemo(() => {
    const s = parseTime(plan.study.start);
    const e = parseTime(plan.study.end);
    return Math.max(0, Math.floor((e - s) / 1000));
  }, [plan.study.start, plan.study.end]);

  const [studyLeft, setStudyLeft] = useLocalStorage("routine.study.timer.left", studyTotalSec);

  useEffect(() => {
    // keep left in sync if user edits plan duration
    setStudyLeft((prev) => Math.min(prev, studyTotalSec));
  }, [studyTotalSec, setStudyLeft]);

  useEffect(() => {
    if (!studyRunning) return;
    const id = setInterval(() => {
      setStudyLeft((x) => Math.max(0, x - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [studyRunning, setStudyLeft]);

  useEffect(() => {
    if (studyLeft === 0 && studyRunning) setStudyRunning(false);
  }, [studyLeft, studyRunning, setStudyRunning]);

  const handleToggleDone = (key) => () => setDone({ ...done, [key]: !done[key] });

  const saveEdits = (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const next = {
      wake: fd.get("wake"),
      sleep: fd.get("sleep"),
      gym: { start: fd.get("gymStart"), end: fd.get("gymEnd"), title: plan.gym.title, icon: plan.gym.icon },
      classes: { start: fd.get("classStart"), end: fd.get("classEnd"), title: plan.classes.title, icon: plan.classes.icon },
      study: { start: fd.get("studyStart"), end: fd.get("studyEnd"), title: plan.study.title, icon: plan.study.icon },
    };
    setPlan(next);
    setEditing(false);
  };

  return (
    <div className="min-h-screen w-full text-gray-900" style={{ background: gradientCss, transition: 'background 1.2s linear' }}>
      <div className="max-w-3xl mx-auto p-6">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Routine Planner</h1>
            <p className="text-sm text-gray-600">Local time now: <span className="font-mono">{nowHHMM}</span></p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setEditing((v) => !v)} className="px-3 py-1.5 rounded-xl bg-gray-100 flex items-center gap-2">
              {editing ? <Save className="w-4 h-4"/> : <Pencil className="w-4 h-4"/>}
              {editing ? 'Save' : 'Edit times'}
            </button>
            <button onClick={() => setDone({ wake:false,gym:false,classes:false,study:false,sleep:false })} className="px-3 py-1.5 rounded-xl bg-gray-100 flex items-center gap-2">
              <RotateCcw className="w-4 h-4"/> Reset day
            </button>
          </div>
        </header>

        {editing ? (
          <form onSubmit={saveEdits} className="grid gap-4 rounded-2xl p-4 border bg-white/70">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Wake
                <input name="wake" defaultValue={plan.wake} type="time" className="mt-1 w-full border rounded-xl p-2" required />
              </label>
              <label className="text-sm">Sleep
                <input name="sleep" defaultValue={plan.sleep} type="time" className="mt-1 w-full border rounded-xl p-2" required />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Gym start
                <input name="gymStart" defaultValue={plan.gym.start} type="time" className="mt-1 w-full border rounded-xl p-2" required />
              </label>
              <label className="text-sm">Gym end
                <input name="gymEnd" defaultValue={plan.gym.end} type="time" className="mt-1 w-full border rounded-xl p-2" required />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Classes start
                <input name="classStart" defaultValue={plan.classes.start} type="time" className="mt-1 w-full border rounded-xl p-2" required />
              </label>
              <label className="text-sm">Classes end
                <input name="classEnd" defaultValue={plan.classes.end} type="time" className="mt-1 w-full border rounded-xl p-2" required />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Study start
                <input name="studyStart" defaultValue={plan.study.start} type="time" className="mt-1 w-full border rounded-xl p-2" required />
              </label>
              <label className="text-sm">Study end
                <input name="studyEnd" defaultValue={plan.study.end} type="time" className="mt-1 w-full border rounded-xl p-2" required />
              </label>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="px-4 py-2 rounded-xl bg-indigo-600 text-white flex items-center gap-2"><Save className="w-4 h-4"/> Save plan</button>
            </div>
          </form>
        ) : null}

        <div className="grid gap-4 mt-4">
          {blocks.map((b) => (
            <TimeBlock
              key={b.key}
              title={b.title}
              start={b.start}
              end={b.end}
              icon={b.icon}
              done={done[b.key]}
              onToggleDone={handleToggleDone(b.key)}
              editable={!b.fixed}
            />
          ))}
        </div>

        {/* Study Timer */}
        <div className="mt-6">
          <Countdown
            seconds={studyLeft}
            running={studyRunning}
            onToggle={() => setStudyRunning(!studyRunning)}
            onReset={() => { setStudyRunning(false); setStudyLeft(studyTotalSec); setStudyStart(null); }}
            label="Study session timer"
          />
          <p className="text-xs text-gray-600 mt-2">Default duration equals your configured study block ({plan.study.start}–{plan.study.end}).
          Start/pause as you study in the evening.</p>
        </div>

        {/* Bedtime countdown */}
        <div className="mt-6">
          <Countdown
            seconds={secondsToBed}
            running={true}
            onToggle={() => {}}
            onReset={() => {}}
            label={`Countdown to bedtime (${plan.sleep})`}
          />
          <p className="text-xs text-gray-600 mt-2">Aim to wind down 30 minutes before bed.</p>
        </div>

        {/* Quick habits */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { k: 'water', label: 'Drink water', tip: '250ml now' },
            { k: 'pack', label: 'Pack bag for class', tip: '10 mins' },
            { k: 'prep', label: 'Lay out gym clothes', tip: 'night before' },
          ].map((h) => (
            <button key={h.k} className="rounded-2xl border p-4 bg-white/70 text-left hover:shadow">
              <div className="font-medium">{h.label}</div>
              <div className="text-xs text-gray-600">{h.tip}</div>
            </button>
          ))}
        </div>

        <footer className="mt-10 text-xs text-gray-500 text-center">
          Built for students with fixed class & gym blocks. Times are fully editable and saved on this device.
        </footer>
      </div>
    </div>
  );
}
