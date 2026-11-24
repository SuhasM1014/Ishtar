import type { ReactNode } from 'react';

export function Sheet(props: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  if (!props.open) return null;
  return (
    <div className="sheet-backdrop" onClick={props.onClose} role="presentation">
      <div className="sheet" role="dialog" aria-modal="true" aria-label={props.label} onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        {props.children}
      </div>
    </div>
  );
}

export function Toggle(props: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="toggle" aria-label={props.label}>
      <input type="checkbox" checked={props.checked} onChange={(e) => props.onChange(e.target.checked)} />
      <span className="slider" />
    </label>
  );
}

export const MOODS = [
  { v: 1, e: '😞', l: 'Very low' },
  { v: 2, e: '😕', l: 'Low' },
  { v: 3, e: '😐', l: 'Okay' },
  { v: 4, e: '🙂', l: 'Good' },
  { v: 5, e: '😄', l: 'Great' },
];

export function MoodScale(props: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="mood" role="radiogroup" aria-label="Mood">
      {MOODS.map((m) => (
        <button key={m.v} type="button" role="radio" aria-checked={props.value === m.v} className={props.value === m.v ? 'on' : ''} onClick={() => props.onChange(m.v)}>
          {m.e}
          <span>{m.l}</span>
        </button>
      ))}
    </div>
  );
}

export function Chips(props: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (o: string) => props.onChange(props.value.includes(o) ? props.value.filter((x) => x !== o) : [...props.value, o]);
  return (
    <div className="chips">
      {props.options.map((o) => (
        <button key={o} type="button" className={`chip ${props.value.includes(o) ? 'on' : ''}`} aria-pressed={props.value.includes(o)} onClick={() => toggle(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

export function Scale(props: { value: number; onChange: (v: number) => void; low: string; high: string; label: string }) {
  return (
    <div>
      <div className="row between small muted"><span>{props.low}</span><span>{props.high}</span></div>
      <div className="mood" role="radiogroup" aria-label={props.label}>
        {[1, 2, 3, 4, 5].map((v) => (
          <button key={v} type="button" role="radio" aria-checked={props.value === v} className={props.value === v ? 'on' : ''} style={{ fontSize: '1.05rem', padding: '10px 0' }} onClick={() => props.onChange(v)}>
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
