import { Toggle } from '../components/ui';
import { SLOT_META } from '../components/CheckInSheet';
import { startAI, useAI } from '../lib/aiState';
import { MODEL_ID } from '../lib/llm';
import { LANG_LABEL, PROMPTS, hasVoice, speak } from '../lib/voice';
import { useStore } from '../store';
import { MODULE_LABELS, type Lang, type ModuleId, type Slot } from '../types';

export function Settings() {
  const { settings, setSettings, lock, wipe, tables } = useStore();
  const ai = useAI();
  const total = Object.values(tables).reduce((n, rows) => n + rows.length, 0);

  return (
    <div className="stack">
      <h1>Settings</h1>

      <div className="card">
        <h2>Modules</h2>
        {(Object.keys(MODULE_LABELS) as ModuleId[]).map((m) => (
          <div key={m} className="list-item row between">
            <span>{MODULE_LABELS[m]}</span>
            <Toggle label={MODULE_LABELS[m]} checked={settings.modules[m]} onChange={(v) => setSettings({ modules: { ...settings.modules, [m]: v } })} />
          </div>
        ))}
      </div>

      {settings.modules.journal && (
        <div className="card">
          <h2>Check-ins</h2>
          <p className="small muted">Choose which check-ins you want and when. No streaks, no guilt.</p>
          {(['morning', 'afternoon', 'night'] as Slot[]).map((s) => (
            <div key={s} className="list-item row between">
              <span className="grow">{SLOT_META[s].emoji} {SLOT_META[s].label}</span>
              <input type="time" style={{ width: 120 }} value={settings.slots[s].time} aria-label={`${SLOT_META[s].label} time`}
                onChange={(e) => setSettings({ slots: { ...settings.slots, [s]: { ...settings.slots[s], time: e.target.value } } })} />
              <Toggle label={`${SLOT_META[s].label} check-in`} checked={settings.slots[s].on} onChange={(v) => setSettings({ slots: { ...settings.slots, [s]: { ...settings.slots[s], on: v } } })} />
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h2>Voice</h2>
        <label className="field">
          <span>Language for voice prompts, breathing and wind-down</span>
          <select value={settings.lang} onChange={(e) => setSettings({ lang: e.target.value as Lang })}>
            {(Object.keys(LANG_LABEL) as Lang[]).map((l) => <option key={l} value={l}>{LANG_LABEL[l]}</option>)}
          </select>
        </label>
        {!hasVoice(settings.lang) && (
          <p className="tiny muted">This device has no {LANG_LABEL[settings.lang]} voice installed, so a default voice may be used. Text is always shown on screen.</p>
        )}
        <div className="row between list-item">
          <span>Speak check-in prompts</span>
          <Toggle label="Speak check-in prompts" checked={settings.voicePrompts} onChange={(v) => setSettings({ voicePrompts: v })} />
        </div>
        <button className="btn sm subtle" onClick={() => speak(PROMPTS.morning[settings.lang], settings.lang)}>🔊 Test voice</button>
        <p className="tiny muted" style={{ marginTop: 8 }}>Voice uses your device's built-in speech, which runs on the device.</p>
      </div>

      <div className="card">
        <h2>On-device AI</h2>
        <p className="small muted">
          Tags journal entries, words insights and drafts the doctor summary. Runs fully in your browser with WebGPU ({MODEL_ID}). It never calculates
          numbers: code does. One-time download of about 1 GB, then it works offline.
        </p>
        {ai.llm === 'unsupported' && <p className="small">This browser has no WebGPU, so Ishtar uses its built-in templates instead. Try recent Chrome or Edge.</p>}
        {ai.llm !== 'unsupported' && (
          <>
            {ai.llm === 'off' && <button className="btn block" onClick={() => { void setSettings({ aiEnabled: true }); void startAI(); }}>Download and enable</button>}
            {ai.llm === 'loading' && (
              <div className="stack">
                <div className="progress"><div style={{ width: `${Math.round(ai.llmProgress * 100)}%` }} /></div>
                <p className="tiny muted">{ai.llmText}</p>
              </div>
            )}
            {ai.llm === 'ready' && settings.aiEnabled && <p className="small">✓ Ready. Running on this device.</p>}
            {ai.llm === 'ready' && !settings.aiEnabled && <button className="btn block" onClick={() => setSettings({ aiEnabled: true })}>Turn on AI wording</button>}
            {ai.llm === 'error' && (
              <>
                <p className="small">Could not load the model: {ai.llmText}</p>
                <button className="btn sm" onClick={() => startAI()}>Try again</button>
              </>
            )}
            {settings.aiEnabled && ai.llm !== 'loading' && (
              <button className="btn sm ghost" style={{ marginTop: 8 }} onClick={() => setSettings({ aiEnabled: false })}>Turn off AI wording</button>
            )}
          </>
        )}
        <div className="hr" />
        <p className="small">
          Distress safety net: keyword list always on. Small classifier: {ai.classifier === 'ready' ? '✓ on' : ai.classifier === 'loading' ? 'loading…' : ai.classifier === 'error' ? 'unavailable' : 'off (turns on with on-device AI)'}.
        </p>
      </div>

      <div className="card">
        <h2>Privacy</h2>
        <ul className="small" style={{ paddingLeft: 18, margin: '0 0 12px' }}>
          <li>No account. No server. {total} records encrypted on this device with your PIN.</li>
          <li>Modules only compare notes when you allow it (on the Insights tab).</li>
          <li>The doctor PDF leaves your device only if you share it.</li>
        </ul>
        <div className="row wrap">
          <button className="btn subtle" onClick={lock}>🔒 Lock now</button>
          <button
            className="btn danger"
            onClick={async () => {
              if (confirm('Delete ALL your Ishtar data on this device, including your PIN? This cannot be undone.') && confirm('Are you sure? Everything will be permanently erased.')) await wipe();
            }}
          >
            Delete all my data
          </button>
        </div>
      </div>

      <p className="tiny muted center">Ishtar is not a medical device and never diagnoses. In distress? Call Tele-MANAS: <a href="tel:14416">14416</a>.</p>
    </div>
  );
}
