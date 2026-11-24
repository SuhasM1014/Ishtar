import { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Toggle } from '../components/ui';
import { useAI } from '../lib/aiState';
import { addDays, fmtDate, today } from '../lib/dates';
import { PAIRS, computeInsights, consentGranted, cycleStats, dailyMood, phaseOf, type Insight, type Phase } from '../lib/insights';
import { wordInsight } from '../lib/llm';
import { speak, stopSpeaking } from '../lib/voice';
import { useStore } from '../store';
import { MODULE_SHORT, type ModuleId } from '../types';

const PHASE_COLOR: Record<Phase, string> = {
  Period: 'var(--period)',
  Follicular: 'var(--follicular)',
  'Ovulation window': 'var(--ovulation)',
  Luteal: 'var(--luteal)',
};
const numbersIn = (s: string) => (s.match(/\d+(?:\.\d+)?/g) ?? []).sort().join(',');

export function Insights() {
  const { tables, settings, save } = useStore();
  const ai = useAI();
  const insights = useMemo(() => computeInsights(tables, settings.modules), [tables, settings.modules]);
  const [worded, setWorded] = useState<Record<string, string>>({});
  const [speaking, setSpeaking] = useState<string | null>(null);

  // Use cached LLM wording when it still matches the code-computed numbers; otherwise word it now.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: Record<string, string> = {};
      for (const i of insights) {
        const cached = tables.insights.find((r) => r.type === i.type && r.evidence === i.evidence && numbersIn(r.message) === numbersIn(i.message));
        if (cached) out[i.type] = cached.message;
      }
      if (!cancelled) setWorded(out);
      if (!settings.aiEnabled || ai.llm !== 'ready') return;
      for (const i of insights) {
        if (out[i.type] || cancelled) continue;
        const s = await wordInsight(i.message);
        if (cancelled) return;
        if (s !== i.message) {
          out[i.type] = s;
          setWorded({ ...out });
          await save('insights', { type: i.type, message: s, evidence: i.evidence, date: today() });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [insights, ai.llm, settings.aiEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => stopSpeaking(), []);

  const enabledPairs = PAIRS.filter(([a, b]) => settings.modules[a] && settings.modules[b]);
  const setConsent = (a: ModuleId, b: ModuleId, granted: boolean) => save('consents', { moduleA: a, moduleB: b, granted, date: new Date().toISOString() });

  const readAloud = async (i: Insight) => {
    if (speaking === i.type) { stopSpeaking(); setSpeaking(null); return; }
    stopSpeaking();
    setSpeaking(i.type);
    await speak(worded[i.type] ?? i.message, 'en');
    setSpeaking((s) => (s === i.type ? null : s));
  };

  return (
    <div className="stack">
      <h1>Your patterns</h1>

      {enabledPairs.length > 0 && (
        <div className="card">
          <h2>Compare notes</h2>
          <p className="small muted">Every module works alone by default. Choose which modules can compare notes, and Ishtar reveals patterns. Switch off any time.</p>
          {enabledPairs.map(([a, b]) => (
            <div key={`${a}-${b}`} className="list-item row between">
              <span>{MODULE_SHORT[a]} ↔ {MODULE_SHORT[b]}</span>
              <Toggle label={`Let ${MODULE_SHORT[a]} and ${MODULE_SHORT[b]} compare notes`} checked={consentGranted(tables.consents, a, b)} onChange={(v) => setConsent(a, b, v)} />
            </div>
          ))}
        </div>
      )}

      {settings.aiEnabled && ai.llm === 'loading' && (
        <div className="banner">On-device AI is loading ({Math.round(ai.llmProgress * 100)}%). Insights show in plain form until it's ready.</div>
      )}

      {insights.length === 0 && (
        <div className="card soft">
          <p>No patterns yet. Keep logging for a few weeks{enabledPairs.length ? ', and let modules compare notes to see how they connect' : ''}.</p>
        </div>
      )}

      {insights.map((i) => (
        <div key={i.type} className="card insight">
          <div className="row between">
            <div className="mods">{i.modules.map((m) => <span key={m} className="tag">{MODULE_SHORT[m]}</span>)}</div>
            <button className="iconbtn" aria-label="Read aloud" onClick={() => readAloud(i)}>{speaking === i.type ? '■' : '🔊'}</button>
          </div>
          <h3>{i.title}</h3>
          <p>{worded[i.type] ?? i.message}</p>
          <details>
            <summary>How we know</summary>
            <p className="small muted" style={{ marginTop: 6 }}>{i.evidence}</p>
            {worded[i.type] && <p className="tiny muted">Numbers computed by code: “{i.message}” Wording by on-device AI.</p>}
          </details>
        </div>
      ))}

      {settings.modules.period && <CycleWheel />}
      {settings.modules.journal && <MoodHeatmap />}
      {settings.modules.journal && <MoodTrend />}
      <p className="tiny muted center">Patterns, not diagnoses. Read aloud uses your device's built-in voice.</p>
    </div>
  );
}

function CycleWheel() {
  const { tables } = useStore();
  const cs = cycleStats(tables.cycles);
  if (!cs.cycleDay || cs.cycleDay > 60) return null;
  const len = Math.max(Math.round(cs.avgLength || 28), cs.cycleDay);
  const data = Array.from({ length: len }, (_, i) => {
    const day = i + 1;
    return { day, value: 1, phase: phaseOf(day, cs.avgLength || 28, cs.avgPeriod || 5) };
  });
  return (
    <div className="card">
      <h2>Cycle wheel</h2>
      <div style={{ width: '100%', height: 240, position: 'relative' }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius="62%" outerRadius="88%" startAngle={90} endAngle={-270} paddingAngle={1} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.day} fill={PHASE_COLOR[d.phase]} stroke={d.day === cs.cycleDay ? 'var(--ink)' : 'none'} strokeWidth={d.day === cs.cycleDay ? 3 : 0} opacity={d.day === cs.cycleDay ? 1 : 0.75} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <span className="small muted">Day</span>
          <b style={{ fontSize: '2rem' }}>{cs.cycleDay}</b>
          <span className="tiny muted">of ~{Math.round(cs.avgLength || 28)}</span>
        </div>
      </div>
      <div className="row wrap small" style={{ justifyContent: 'center', gap: 12 }}>
        {(Object.keys(PHASE_COLOR) as Phase[]).map((p) => (
          <span key={p} className="row" style={{ gap: 4 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: PHASE_COLOR[p], display: 'inline-block' }} />{p}</span>
        ))}
      </div>
      <p className="tiny muted center" style={{ marginTop: 6 }}>Phases are estimates from your own average cycle.</p>
    </div>
  );
}

function moodColor(m?: number) {
  if (m === undefined) return 'var(--surface-2)';
  const stops = ['#7b5ea7', '#b48cc8', '#e9d6ea', '#f3b6a5', '#e07a5f'];
  return stops[Math.max(0, Math.min(4, Math.round(m) - 1))];
}

function MoodHeatmap() {
  const { tables } = useStore();
  const moods = dailyMood(tables.checkIns);
  const end = today();
  const dow = new Date().getDay();
  const start = addDays(end, -(12 * 7 + dow));
  const days = Array.from({ length: 13 * 7 }, (_, i) => addDays(start, i));
  return (
    <div className="card">
      <h2>Mood heatmap</h2>
      <p className="small muted">Daily average mood, last 13 weeks. Each column is a week.</p>
      <div className="heat" style={{ gridTemplateRows: 'repeat(7, 1fr)', gridAutoFlow: 'column', gridTemplateColumns: 'repeat(13, 1fr)' }}>
        {days.map((d) => (
          <div key={d} title={d > end ? '' : `${fmtDate(d)}: ${moods.has(d) ? moods.get(d)!.toFixed(1) : 'no check-ins'}`} style={{ background: d > end ? 'transparent' : moodColor(moods.get(d)) }} />
        ))}
      </div>
      <div className="row small muted" style={{ justifyContent: 'center', marginTop: 8, gap: 4 }}>
        Low {[1, 2, 3, 4, 5].map((m) => <i key={m} style={{ width: 12, height: 12, borderRadius: 3, background: moodColor(m), display: 'inline-block' }} />)} Good
      </div>
    </div>
  );
}

function MoodTrend() {
  const { tables } = useStore();
  const moods = dailyMood(tables.checkIns);
  const end = today();
  const data: { label: string; mood: number | null }[] = [];
  for (let w = 12; w >= 0; w--) {
    const vals: number[] = [];
    for (let d = 0; d < 7; d++) { const k = addDays(end, -(w * 7 + d)); if (moods.has(k)) vals.push(moods.get(k)!); }
    data.push({ label: fmtDate(addDays(end, -(w * 7 + 6))), mood: vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null });
  }
  if (!data.some((d) => d.mood !== null)) return null;
  return (
    <div className="card">
      <h2>Weekly mood</h2>
      <div style={{ width: '100%', height: 200 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} />
            <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line type="monotone" dataKey="mood" name="Avg mood" stroke="#a14a8a" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
