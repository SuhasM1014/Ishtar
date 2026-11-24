import { useState } from 'react';
import { CheckInSheet, SLOT_META } from '../components/CheckInSheet';
import { DistressSupport, LowMoodSupport, WindDown } from '../components/Support';
import { MOODS, Sheet } from '../components/ui';
import { dateOf, diffDays, fmtDate, fmtLong, today } from '../lib/dates';
import { cycleStats, phaseOf } from '../lib/insights';
import { useStore } from '../store';
import type { CheckIn, Slot } from '../types';

export type Nav = (tab: 'today' | 'track' | 'insights' | 'doctor' | 'settings', sub?: string) => void;

export function Today(props: { nav: Nav }) {
  const { tables, settings } = useStore();
  const [open, setOpen] = useState<{ slot: Slot; existing?: CheckIn } | null>(null);
  const [support, setSupport] = useState<'low' | 'distress' | 'wind' | null>(null);
  const t = today();
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const todays = tables.checkIns.filter((c) => dateOf(c.datetime) === t);
  const slots = (['morning', 'afternoon', 'night'] as Slot[]).filter((s) => settings.slots[s].on);

  const cs = cycleStats(tables.cycles);
  const ongoing = tables.cycles.find((c) => !c.end && c.start <= t);
  const daysToNext = cs.nextStart ? diffDays(t, cs.nextStart) : undefined;
  const loggedSymptomsToday = tables.dailyLogs.some((l) => l.date === t);
  const periToday = tables.perimenopause.find((l) => l.date === t);

  return (
    <div className="stack">
      <div>
        <p className="muted small">{fmtLong(t)}</p>
        <h1>{greet}{settings.name ? `, ${settings.name}` : ''}</h1>
      </div>

      {settings.modules.period && (
        <div className="card soft">
          {cs.cycleDay && cs.cycleDay <= 60 ? (
            <>
              <div className="row between">
                <div>
                  <div className="small muted">Cycle day</div>
                  <div style={{ fontSize: '2rem', fontWeight: 700 }}>{cs.cycleDay}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="small muted">{ongoing ? 'Period' : 'Phase (estimate)'}</div>
                  <b>{ongoing ? 'On your period' : phaseOf(cs.cycleDay, cs.avgLength || 28, cs.avgPeriod || 5)}</b>
                </div>
              </div>
              {daysToNext !== undefined && !ongoing && (
                <p className="small" style={{ marginTop: 8 }}>
                  {daysToNext > 0 ? `Next period in about ${daysToNext} days (${fmtDate(cs.nextStart!)}, ±${cs.window})` : daysToNext === 0 ? 'Period expected around today' : `Period was expected ${-daysToNext} days ago (±${cs.window}).`}
                  {!cs.regular && ' · Your cycles vary, so this is a rough estimate.'}
                </p>
              )}
            </>
          ) : (
            <p className="small">No recent period logged. Log one to see predictions from your own history.</p>
          )}
          <button className="btn sm ghost" style={{ marginTop: 8 }} onClick={() => props.nav('track', 'period')}>{ongoing ? 'Log period end' : 'Log period'}</button>
        </div>
      )}

      {settings.modules.journal && (
        <div className="card">
          <div className="row between"><h2>Today's check-ins</h2><span className="small muted">{todays.length}/{slots.length}</span></div>
          {slots.map((s) => {
            const done = todays.find((c) => c.slot === s);
            const mood = done ? MOODS.find((m) => m.v === done.mood) : undefined;
            return (
              <div className="slot" key={s}>
                <div className="emoji">{mood ? mood.e : SLOT_META[s].emoji}</div>
                <div className="grow">
                  <b>{SLOT_META[s].label}</b> <span className="tiny muted">{settings.slots[s].time}</span>
                  <div className="small muted">{done ? (done.chips.join(', ') || mood?.l) : SLOT_META[s].asks}</div>
                </div>
                <button className={`btn sm ${done ? 'subtle' : ''}`} onClick={() => setOpen({ slot: s, existing: done })}>{done ? 'Edit' : 'Check in'}</button>
              </div>
            );
          })}
          {todays.some((c) => c.slot === 'night') && (
            <button className="btn sm ghost" style={{ marginTop: 6 }} onClick={() => setSupport('wind')}>🌙 Wind-down audio</button>
          )}
        </div>
      )}

      <div className="row wrap">
        {settings.modules.symptoms && (
          <button className="btn subtle sm" onClick={() => props.nav('track', 'symptoms')}>{loggedSymptomsToday ? '✓ Symptoms logged' : '+ Log symptoms'}</button>
        )}
        {settings.modules.peri && (
          <button className="btn subtle sm" onClick={() => props.nav('track', 'peri')}>{periToday ? `✓ ${periToday.hotFlashes} hot flashes today` : '+ Log hot flashes'}</button>
        )}
        {settings.modules.journal && <button className="btn subtle sm" onClick={() => props.nav('track', 'journal')}>✎ Journal</button>}
        <button className="btn subtle sm" onClick={() => setSupport('low')}>🫁 Breathe</button>
      </div>

      <div className="banner">🔒 Everything you log is encrypted on this device. Nothing is sent anywhere.</div>

      {open && (
        <CheckInSheet
          slot={open.slot}
          existing={open.existing}
          onClose={() => setOpen(null)}
          onSaved={(c, f) => {
            setOpen(null);
            if (f.distress) setSupport('distress');
            else if (c.mood <= 2) setSupport('low');
            else if (c.slot === 'night' && !open.existing) setSupport('wind');
          }}
        />
      )}
      {support === 'low' && <LowMoodSupport lang={settings.lang} voice={settings.voicePrompts} onClose={() => setSupport(null)} />}
      {support === 'distress' && <DistressSupport onClose={() => setSupport(null)} />}
      {support === 'wind' && (
        <Sheet open onClose={() => setSupport(null)} label="Wind down"><WindDown lang={settings.lang} onDone={() => setSupport(null)} /></Sheet>
      )}
    </div>
  );
}
