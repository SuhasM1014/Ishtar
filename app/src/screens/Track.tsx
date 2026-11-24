import { useEffect, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DistressSupport } from '../components/Support';
import { Chips, Scale, Toggle } from '../components/ui';
import { addDays, diffDays, fmtDate, fmtLong, today } from '../lib/dates';
import { checkDistress } from '../lib/distress';
import { cycleStats, periWeekly, sortedCycles } from '../lib/insights';
import { llmReady, tagJournal } from '../lib/llm';
import { keywordTags } from '../lib/tags';
import { Recorder, loadWhisper, transcribe } from '../lib/whisper';
import { useStore } from '../store';
import { MODULE_SHORT, type Cycle, type ModuleId } from '../types';

type Sub = ModuleId | 'meds';

export function Track(props: { initial?: string }) {
  const { settings } = useStore();
  const subs: Sub[] = [...(['journal', 'period', 'symptoms', 'peri'] as ModuleId[]).filter((m) => settings.modules[m]), 'meds'];
  const [sub, setSub] = useState<Sub>((subs.includes(props.initial as Sub) ? props.initial : subs[0]) as Sub);
  useEffect(() => { if (props.initial && subs.includes(props.initial as Sub)) setSub(props.initial as Sub); }, [props.initial]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <h1>Track</h1>
      <div className="tabs" role="tablist">
        {subs.map((s) => (
          <button key={s} role="tab" aria-selected={sub === s} className={sub === s ? 'on' : ''} onClick={() => setSub(s)}>
            {s === 'meds' ? 'Medications' : MODULE_SHORT[s]}
          </button>
        ))}
      </div>
      {sub === 'journal' && <Journal />}
      {sub === 'period' && <Period />}
      {sub === 'symptoms' && <Symptoms />}
      {sub === 'peri' && <Peri />}
      {sub === 'meds' && <Meds />}
    </div>
  );
}

// ---------------- Journal ----------------
function Journal() {
  const { tables, save, remove, settings } = useStore();
  const [text, setText] = useState('');
  const [priv, setPriv] = useState(false);
  const [busy, setBusy] = useState('');
  const [distress, setDistress] = useState(false);
  const [rec, setRec] = useState<'idle' | 'loading' | 'recording' | 'transcribing'>('idle');
  const [loadPct, setLoadPct] = useState(0);
  const recorder = useRef<Recorder>();
  const [limit, setLimit] = useState(15);
  const entries = [...tables.journal].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.id ?? 0) - (a.id ?? 0)));

  const submit = async () => {
    const body = text.trim();
    if (!body) return;
    setBusy(llmReady() ? 'Tagging on-device…' : 'Saving…');
    const aiTags = llmReady() ? await tagJournal(body) : keywordTags(body);
    await save('journal', { date: today(), text: body, aiTags, private: priv });
    const flag = await checkDistress(body);
    setText(''); setPriv(false); setBusy('');
    if (flag) setDistress(true);
  };

  const toggleRecord = async () => {
    if (rec === 'recording') {
      setRec('transcribing');
      const blob = await recorder.current!.stop();
      try {
        const words = await transcribe(blob, settings.lang);
        setText((t) => (t ? `${t} ${words}` : words));
      } catch (e) {
        alert('Could not transcribe that voice note.');
        console.warn(e);
      }
      setRec('idle');
      return;
    }
    try {
      setRec('loading');
      await loadWhisper(setLoadPct);
      recorder.current = new Recorder();
      await recorder.current.start();
      setRec('recording');
    } catch (e) {
      console.warn(e);
      alert('Voice notes need microphone access and a one-time download of the Whisper model.');
      setRec('idle');
    }
  };

  return (
    <div className="stack">
      <div className="card">
        <h2>New entry</h2>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="What's on your mind?" aria-label="Journal entry" />
        <div className="row between" style={{ marginTop: 8 }}>
          <button className="btn subtle sm" onClick={toggleRecord} disabled={rec === 'loading' || rec === 'transcribing'}>
            {rec === 'idle' && '🎙 Voice note'}
            {rec === 'loading' && `Loading Whisper ${Math.round(loadPct)}%`}
            {rec === 'recording' && '■ Stop recording'}
            {rec === 'transcribing' && 'Transcribing on-device…'}
          </button>
          <label className="row small">Private <Toggle label="Private entry" checked={priv} onChange={setPriv} /></label>
        </div>
        <p className="tiny muted" style={{ marginTop: 6 }}>Voice notes are transcribed on this device with Whisper. Audio is never uploaded or stored. Private entries are left out of the doctor summary.</p>
        <button className="btn block" style={{ marginTop: 8 }} disabled={!text.trim() || !!busy} onClick={submit}>{busy || 'Save entry'}</button>
      </div>
      <div className="card">
        <h2>Entries</h2>
        {!entries.length && <p className="muted small">No entries yet.</p>}
        {entries.slice(0, limit).map((j) => (
          <div key={j.id} className="list-item">
            <div className="row between">
              <b className="small">{fmtLong(j.date)} {j.private && '🔒'}</b>
              <button className="btn sm subtle" aria-label="Delete entry" onClick={() => confirm('Delete this entry?') && remove('journal', j.id!)}>✕</button>
            </div>
            <p style={{ margin: '4px 0' }}>{j.text}</p>
            <div>{j.aiTags.map((g) => <span key={g} className="tag">{g}</span>)}</div>
          </div>
        ))}
        {entries.length > limit && <button className="btn ghost sm" onClick={() => setLimit(limit + 15)}>Show more</button>}
      </div>
      {distress && <DistressSupport onClose={() => setDistress(false)} />}
    </div>
  );
}

// ---------------- Period ----------------
function Period() {
  const { tables, save, remove } = useStore();
  const cycles = sortedCycles(tables.cycles).reverse();
  const ongoing = cycles.find((c) => !c.end);
  const cs = cycleStats(tables.cycles);
  const [date, setDate] = useState(today());
  const [flow, setFlow] = useState<Cycle['flow']>('medium');

  return (
    <div className="stack">
      <div className="card">
        <div className="stats">
          <div className="stat"><span className="small muted">Avg cycle</span><b>{cs.avgLength || '–'}</b><span className="tiny muted">days</span></div>
          <div className="stat"><span className="small muted">Avg period</span><b>{cs.avgPeriod || '–'}</b><span className="tiny muted">days</span></div>
          <div className="stat"><span className="small muted">Next</span><b>{cs.nextStart ? fmtDate(cs.nextStart) : '–'}</b><span className="tiny muted">{cs.nextStart ? `±${cs.window} days` : 'need 2+ cycles'}</span></div>
        </div>
        <p className="tiny muted" style={{ marginTop: 10 }}>Predictions use your own last {Math.min(6, cs.lengths.length) || 'few'} cycles, not a generic 28 days.</p>
      </div>
      <div className="card">
        {ongoing ? (
          <>
            <h2>Period in progress</h2>
            <p className="small muted">Started {fmtLong(ongoing.start)} (day {diffDays(ongoing.start, today()) + 1}).</p>
            <label className="field"><span>Ended on</span><input type="date" value={date} max={today()} min={ongoing.start} onChange={(e) => setDate(e.target.value)} /></label>
            <button className="btn block" onClick={() => save('cycles', { ...ongoing, end: date })}>Log period end</button>
          </>
        ) : (
          <>
            <h2>Log a period</h2>
            <label className="field"><span>Started on</span><input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} /></label>
            <span className="small muted">Flow</span>
            <Chips options={['light', 'medium', 'heavy']} value={[flow]} onChange={(v) => v.length && setFlow(v[v.length - 1] as Cycle['flow'])} />
            <button className="btn block" style={{ marginTop: 12 }} onClick={() => save('cycles', { start: date, flow })}>Period started</button>
          </>
        )}
      </div>
      <div className="card">
        <h2>History</h2>
        {!cycles.length && <p className="muted small">No periods logged yet.</p>}
        {cycles.map((c, i) => {
          const next = cycles[i - 1];
          return (
            <div key={c.id} className="list-item row between">
              <div>
                <b className="small">{fmtLong(c.start)}</b>
                <div className="tiny muted">
                  {c.end ? `${diffDays(c.start, c.end) + 1}-day period` : 'ongoing'} · {c.flow} flow
                  {next ? ` · ${diffDays(c.start, next.start)}-day cycle` : ''}
                </div>
              </div>
              <button className="btn sm subtle" aria-label="Delete" onClick={() => confirm('Delete this period?') && remove('cycles', c.id!)}>✕</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- Symptoms ----------------
const SYMPTOMS = ['cramps', 'back pain', 'headache', 'joint pain', 'breast tenderness', 'acne', 'dry skin', 'bloating', 'nausea', 'constipation', 'diarrhoea', 'fatigue', 'brain fog'];

function Symptoms() {
  const { tables, save } = useStore();
  const [date, setDate] = useState(today());
  const existing = tables.dailyLogs.find((l) => l.date === date);
  const [sym, setSym] = useState<string[]>(existing?.symptoms ?? []);
  const [sleep, setSleep] = useState(existing?.sleep ?? 0);
  const [energy, setEnergy] = useState(existing?.energy ?? 0);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setSym(existing?.symptoms ?? []); setSleep(existing?.sleep ?? 0); setEnergy(existing?.energy ?? 0); setSaved(false);
  }, [date]); // eslint-disable-line react-hooks/exhaustive-deps
  const recent = [...tables.dailyLogs].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 10);

  return (
    <div className="stack">
      <div className="card stack">
        <label className="field"><span>Date</span><input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} /></label>
        <div><h3>Symptoms</h3><Chips options={SYMPTOMS} value={sym} onChange={setSym} /></div>
        <div><h3>Sleep</h3><Scale label="Sleep" value={sleep} onChange={setSleep} low="Poor" high="Great" /></div>
        <div><h3>Energy</h3><Scale label="Energy" value={energy} onChange={setEnergy} low="Drained" high="Full" /></div>
        <button className="btn block" disabled={!sleep || !energy} onClick={async () => { await save('dailyLogs', { ...(existing ?? {}), date, symptoms: sym, sleep, energy }); setSaved(true); }}>
          {saved ? '✓ Saved' : existing ? 'Update' : 'Save'}
        </button>
      </div>
      <div className="card">
        <h2>Recent days</h2>
        {!recent.length && <p className="muted small">Nothing logged yet.</p>}
        {recent.map((l) => (
          <div key={l.id} className="list-item">
            <b className="small">{fmtDate(l.date)}</b> <span className="tiny muted">sleep {l.sleep}/5 · energy {l.energy}/5</span>
            <div>{l.symptoms.length ? l.symptoms.map((s) => <span key={s} className="tag">{s}</span>) : <span className="tiny muted">no symptoms</span>}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- Perimenopause ----------------
function Stepper(props: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="row between list-item">
      <span>{props.label}</span>
      <div className="row">
        <button className="iconbtn" aria-label={`Fewer ${props.label}`} onClick={() => props.onChange(Math.max(0, props.value - 1))}>−</button>
        <b style={{ minWidth: 28, textAlign: 'center' }}>{props.value}</b>
        <button className="iconbtn" aria-label={`More ${props.label}`} onClick={() => props.onChange(props.value + 1)}>+</button>
      </div>
    </div>
  );
}

function Peri() {
  const { tables, save } = useStore();
  const [date, setDate] = useState(today());
  const existing = tables.perimenopause.find((l) => l.date === date);
  const [hf, setHf] = useState(existing?.hotFlashes ?? 0);
  const [ns, setNs] = useState(existing?.nightSweats ?? 0);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [saved, setSaved] = useState(false);
  useEffect(() => { setHf(existing?.hotFlashes ?? 0); setNs(existing?.nightSweats ?? 0); setNotes(existing?.notes ?? ''); setSaved(false); }, [date]); // eslint-disable-line react-hooks/exhaustive-deps
  const weekly = periWeekly(tables.perimenopause).map((w) => ({ ...w, label: fmtDate(w.week) }));
  const cs = cycleStats(tables.cycles);

  return (
    <div className="stack">
      <div className="card">
        <label className="field"><span>Date</span><input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} /></label>
        <Stepper label="Hot flashes" value={hf} onChange={setHf} />
        <Stepper label="Night sweats" value={ns} onChange={setNs} />
        <label className="field" style={{ marginTop: 10 }}><span>Notes (optional)</span><input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        <button className="btn block" onClick={async () => { await save('perimenopause', { ...(existing ?? {}), date, hotFlashes: hf, nightSweats: ns, notes }); setSaved(true); }}>{saved ? '✓ Saved' : 'Save'}</button>
      </div>
      <div className="card">
        <h2>Weekly trend</h2>
        <p className="small muted">Average per day, last 8 weeks. Trends matter more than dates when cycles become irregular.</p>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={weekly} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="hotFlashes" name="Hot flashes" fill="#e07a5f" radius={[4, 4, 0, 0]} />
              <Bar dataKey="nightSweats" name="Night sweats" fill="#9b7bb8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {cs.lengths.length >= 2 && (
          <p className="small" style={{ marginTop: 6 }}>Recent cycle lengths: {cs.lengths.slice(-6).join(', ')} days.</p>
        )}
      </div>
    </div>
  );
}

// ---------------- Meds ----------------
function Meds() {
  const { tables, save, remove } = useStore();
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [start, setStart] = useState(addDays(today(), 0));
  return (
    <div className="stack">
      <div className="card">
        <h2>Add a medication or supplement</h2>
        <label className="field"><span>Name</span><input type="text" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="field"><span>Dose</span><input type="text" value={dose} onChange={(e) => setDose(e.target.value)} placeholder="e.g. 1 tablet daily" /></label>
        <label className="field"><span>Started</span><input type="date" value={start} max={today()} onChange={(e) => setStart(e.target.value)} /></label>
        <button className="btn block" disabled={!name.trim()} onClick={async () => { await save('meds', { name: name.trim(), dose: dose.trim(), startDate: start }); setName(''); setDose(''); }}>Add</button>
      </div>
      <div className="card">
        <h2>Logged</h2>
        {!tables.meds.length && <p className="muted small">None yet. These appear on your doctor summary.</p>}
        {tables.meds.map((m) => (
          <div key={m.id} className="list-item row between">
            <div><b>{m.name}</b><div className="tiny muted">{m.dose} · since {fmtLong(m.startDate)}</div></div>
            <button className="btn sm subtle" aria-label="Delete" onClick={() => remove('meds', m.id!)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
