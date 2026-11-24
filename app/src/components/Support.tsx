import { useEffect, useRef, useState } from 'react';
import { BREATH, GROUNDING, WIND_DOWN, speak, stopSpeaking } from '../lib/voice';
import type { Lang } from '../types';
import { Sheet } from './ui';

const PHASES = [
  { k: 'in' as const, secs: 4, scale: 1.25 },
  { k: 'hold' as const, secs: 4, scale: 1.25 },
  { k: 'out' as const, secs: 6, scale: 0.75 },
];

export function Breathing(props: { lang: Lang; voice: boolean; onDone: () => void }) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const timer = useRef<number>();
  const ROUNDS = 4;

  useEffect(() => {
    if (!running) return;
    const p = PHASES[phase];
    if (props.voice) void speak(BREATH[props.lang][p.k], props.lang, 0.85);
    timer.current = window.setTimeout(() => {
      if (phase < PHASES.length - 1) setPhase(phase + 1);
      else if (round < ROUNDS - 1) { setRound(round + 1); setPhase(0); }
      else {
        setRunning(false);
        setDone(true);
        if (props.voice) void speak(BREATH[props.lang].done, props.lang);
      }
    }, p.secs * 1000);
    return () => window.clearTimeout(timer.current);
  }, [running, phase, round]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { window.clearTimeout(timer.current); stopSpeaking(); }, []);

  const p = PHASES[phase];
  return (
    <div className="breath-wrap">
      <h2>Guided breathing</h2>
      <p className="muted small center">4 rounds: in for 4, hold for 4, out for 6.</p>
      <div className="breath" style={{ transform: `scale(${running ? p.scale : 1})`, transitionDuration: `${running ? p.secs : 0.3}s` }} aria-live="polite">
        {done ? BREATH[props.lang].done : running ? BREATH[props.lang][p.k] : 'Ready'}
      </div>
      <p className="muted small" style={{ marginTop: 16 }}>{running ? `Round ${round + 1} of ${ROUNDS}` : ' '}</p>
      <div className="row">
        {!running && !done && <button className="btn" onClick={() => setRunning(true)}>Start</button>}
        {running && <button className="btn subtle" onClick={() => { setRunning(false); stopSpeaking(); }}>Pause</button>}
        <button className="btn ghost" onClick={() => { stopSpeaking(); props.onDone(); }}>{done ? 'Close' : 'Skip'}</button>
      </div>
    </div>
  );
}

export function Grounding(props: { lang: Lang; voice: boolean; onDone: () => void }) {
  const [i, setI] = useState(0);
  const steps = GROUNDING[props.lang];
  useEffect(() => {
    if (props.voice) void speak(steps[i], props.lang);
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => stopSpeaking(), []);
  return (
    <div className="stack center">
      <h2>5-4-3-2-1 grounding</h2>
      <div className="card soft" style={{ fontSize: '1.2rem', padding: 28 }}>{steps[i]}</div>
      <p className="muted small">Step {i + 1} of 5. Take your time.</p>
      <div className="row" style={{ justifyContent: 'center' }}>
        {i < steps.length - 1 ? <button className="btn" onClick={() => setI(i + 1)}>Next</button> : <button className="btn" onClick={props.onDone}>Done</button>}
      </div>
    </div>
  );
}

export function WindDown(props: { lang: Lang; onDone: () => void }) {
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => stopSpeaking(), []);
  return (
    <div className="stack center">
      <h2>Wind down</h2>
      <p className="card soft" style={{ textAlign: 'left' }}>{WIND_DOWN[props.lang]}</p>
      <div className="row" style={{ justifyContent: 'center' }}>
        {!playing ? (
          <button className="btn" onClick={async () => { setPlaying(true); await speak(WIND_DOWN[props.lang], props.lang, 0.8); setPlaying(false); }}>▶ Play</button>
        ) : (
          <button className="btn subtle" onClick={() => { stopSpeaking(); setPlaying(false); }}>■ Stop</button>
        )}
        <button className="btn ghost" onClick={props.onDone}>Close</button>
      </div>
    </div>
  );
}

export function LowMoodSupport(props: { lang: Lang; voice: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<'choose' | 'breath' | 'ground'>('choose');
  return (
    <Sheet open onClose={props.onClose} label="Support">
      {mode === 'choose' && (
        <div className="stack">
          <h2>That sounds hard. Want a minute for yourself?</h2>
          <p className="muted">No pressure. These take about a minute each.</p>
          <button className="btn block" onClick={() => setMode('breath')}>🫁 Guided breathing</button>
          <button className="btn block subtle" onClick={() => setMode('ground')}>🌿 5-4-3-2-1 grounding</button>
          <button className="btn block ghost" onClick={props.onClose}>Not now</button>
        </div>
      )}
      {mode === 'breath' && <Breathing lang={props.lang} voice={props.voice} onDone={props.onClose} />}
      {mode === 'ground' && <Grounding lang={props.lang} voice={props.voice} onDone={props.onClose} />}
    </Sheet>
  );
}

export function DistressSupport(props: { onClose: () => void }) {
  return (
    <Sheet open onClose={props.onClose} label="Support resources">
      <div className="stack">
        <h2>You don't have to carry this alone</h2>
        <p>
          It sounds like things might be really heavy right now. If you're thinking about hurting yourself, please reach out to someone today.
        </p>
        <div className="card soft">
          <h3>Tele-MANAS (India), free, 24×7</h3>
          <p className="small muted">Government of India mental health helpline. Available in many Indian languages.</p>
          <a className="btn block" href="tel:14416">📞 Call 14416</a>
          <p className="tiny muted" style={{ marginTop: 8 }}>You can also call 1-800-891-4416.</p>
        </div>
        <div className="card">
          <h3>If you are in immediate danger</h3>
          <p className="small">Call <a href="tel:112">112</a> (emergency) or go to the nearest hospital.</p>
        </div>
        <p className="tiny muted">Ishtar noticed this on your device. Nothing was sent anywhere. Ishtar is not a medical service.</p>
        <button className="btn block ghost" onClick={props.onClose}>Close</button>
      </div>
    </Sheet>
  );
}
