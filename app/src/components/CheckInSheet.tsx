import { useEffect, useState } from 'react';
import { checkDistress } from '../lib/distress';
import { nowLocalISO } from '../lib/dates';
import { PROMPTS, speak, stopSpeaking } from '../lib/voice';
import { useStore } from '../store';
import type { CheckIn, Slot } from '../types';
import { Chips, MoodScale, Sheet } from './ui';

export const SLOT_CHIPS: Record<Slot, string[]> = {
  morning: ['rested', 'tired', 'groggy', 'motivated', 'calm', 'anxious', 'hopeful', 'heavy'],
  afternoon: ['focused', 'distracted', 'stressed', 'calm', 'productive', 'overwhelmed', 'social', 'drained'],
  night: ['content', 'grateful', 'relaxed', 'proud', 'irritable', 'sad', 'lonely', 'restless'],
};
export const SLOT_META: Record<Slot, { label: string; emoji: string; asks: string }> = {
  morning: { label: 'Morning', emoji: '🌅', asks: 'Sleep, energy, outlook' },
  afternoon: { label: 'Afternoon', emoji: '☀️', asks: 'Stress, focus' },
  night: { label: 'Night', emoji: '🌙', asks: 'Overall mood and a one-line reflection' },
};

export function CheckInSheet(props: {
  slot: Slot;
  existing?: CheckIn;
  onClose: () => void;
  onSaved: (c: CheckIn, flags: { distress: boolean }) => void;
}) {
  const { save, settings } = useStore();
  const [mood, setMood] = useState(props.existing?.mood ?? 0);
  const [chips, setChips] = useState<string[]>(props.existing?.chips ?? []);
  const [note, setNote] = useState(props.existing?.note ?? '');
  const [busy, setBusy] = useState(false);
  const prompt = PROMPTS[props.slot][settings.lang];

  useEffect(() => {
    if (settings.voicePrompts && !props.existing) void speak(prompt, settings.lang);
    return () => stopSpeaking();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    setBusy(true);
    const row: CheckIn = { ...(props.existing ?? {}), datetime: props.existing?.datetime ?? nowLocalISO(), slot: props.slot, mood, chips, note: note.trim() };
    const id = await save('checkIns', row);
    const distress = await checkDistress(row.note);
    setBusy(false);
    props.onSaved({ ...row, id }, { distress });
  };

  const meta = SLOT_META[props.slot];
  return (
    <Sheet open onClose={props.onClose} label={`${meta.label} check-in`}>
      <div className="stack">
        <div className="row between">
          <h2>{meta.emoji} {meta.label} check-in</h2>
          <button className="iconbtn" aria-label="Play voice prompt" onClick={() => speak(prompt, settings.lang)}>🔊</button>
        </div>
        <p className="muted" lang={settings.lang}>{prompt}</p>
        <MoodScale value={mood} onChange={setMood} />
        <Chips options={SLOT_CHIPS[props.slot]} value={chips} onChange={setChips} />
        <label className="field">
          <span>{props.slot === 'night' ? 'One line about today (optional)' : 'Anything else? (optional)'}</span>
          <input type="text" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder={props.slot === 'night' ? 'e.g. Long day, but dinner with friends helped' : ''} />
        </label>
        <button className="btn block" disabled={!mood || busy} onClick={submit}>{busy ? 'Saving…' : 'Save check-in'}</button>
        <p className="tiny muted center">Takes under 15 seconds. Skipping is always fine: no streaks here.</p>
      </div>
    </Sheet>
  );
}
