import { useState } from 'react';
import { Toggle } from '../components/ui';
import { generateSample, PERSONAS, type Persona } from '../lib/sampleData';
import { LANG_LABEL } from '../lib/voice';
import { useStore } from '../store';
import { MODULE_LABELS, type Lang, type ModuleId } from '../types';

const DESCRIPTIONS: Record<ModuleId, string> = {
  journal: '3 quick check-ins a day, plus a private journal.',
  period: 'Cycles, flow, and predictions from your own history.',
  symptoms: 'Pain, sleep, energy, skin, digestion.',
  peri: 'Hot flashes, night sweats, irregular cycles, mood shifts.',
};

export function Onboarding() {
  const { settings, setSettings, addMany } = useStore();
  const [step, setStep] = useState(0);
  const [modules, setModules] = useState(settings.modules);
  const [lang, setLang] = useState<Lang>(settings.lang);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const finish = async (persona?: Persona) => {
    setBusy(true);
    if (persona) {
      await addMany(generateSample(persona));
      await setSettings({ onboarded: true, modules: PERSONAS[persona].modules, lang, name: PERSONAS[persona].name });
    } else {
      await setSettings({ onboarded: true, modules, lang, name: name.trim() });
    }
  };

  return (
    <div className="app">
      <div className="main stack">
        <div className="brand"><img src="./icon.svg" alt="" /> Ishtar</div>
        {step === 0 && (
          <>
            <h1>Pick your modules</h1>
            <p className="muted">Each one works on its own. You can change this any time.</p>
            <div className="card">
              {(Object.keys(MODULE_LABELS) as ModuleId[]).map((m) => (
                <div key={m} className="list-item row between">
                  <div>
                    <b>{MODULE_LABELS[m]}</b>
                    <div className="small muted">{DESCRIPTIONS[m]}</div>
                  </div>
                  <Toggle label={MODULE_LABELS[m]} checked={modules[m]} onChange={(v) => setModules({ ...modules, [m]: v })} />
                </div>
              ))}
            </div>
            <label className="field">
              <span>Voice language</span>
              <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
                {(Object.keys(LANG_LABEL) as Lang[]).map((l) => <option key={l} value={l}>{LANG_LABEL[l]}</option>)}
              </select>
            </label>
            <label className="field">
              <span>What should we call you? (optional, stays on this device)</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <button className="btn block" disabled={!Object.values(modules).some(Boolean)} onClick={() => setStep(1)}>Continue</button>
          </>
        )}
        {step === 1 && (
          <>
            <h1>How would you like to start?</h1>
            <div className="card">
              <h3>Start fresh</h3>
              <p className="small muted">Begin logging today. Patterns appear after a few weeks.</p>
              <button className="btn block" disabled={busy} onClick={() => finish()}>Start fresh</button>
            </div>
            <div className="card">
              <h3>Explore with 3 months of sample data</h3>
              <p className="small muted">Fictional demo data, generated on your device. You can delete it any time from Settings.</p>
              {(Object.keys(PERSONAS) as Persona[]).map((p) => (
                <button key={p} className="btn block subtle" style={{ marginTop: 8, flexDirection: 'column', alignItems: 'flex-start', borderRadius: 14, textAlign: 'left' }} disabled={busy} onClick={() => finish(p)}>
                  <span>{PERSONAS[p].label}</span>
                  <span className="small muted" style={{ fontWeight: 400 }}>{PERSONAS[p].blurb}</span>
                </button>
              ))}
            </div>
            <button className="btn ghost block" onClick={() => setStep(0)}>Back</button>
          </>
        )}
      </div>
    </div>
  );
}
