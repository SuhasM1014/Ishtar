// 3 months of synthetic demo data. Generated on the device; it is fictional, not real user data.
import { addDays, today } from './dates';
import { keywordTags } from './tags';
import type { CheckIn, Cycle, DailyLog, JournalEntry, Med, ModuleId, PeriLog, Slot, Tables } from '../types';

export type Persona = 'student' | 'peri';
export const PERSONAS: Record<Persona, { label: string; blurb: string; modules: Record<ModuleId, boolean>; name: string }> = {
  student: {
    label: 'Ananya, 21, college student',
    blurb: 'Regular cycles, exam stress, low moods before her period.',
    modules: { journal: true, period: true, symptoms: true, peri: false },
    name: 'Ananya',
  },
  peri: {
    label: 'Meera, 47, perimenopause',
    blurb: 'Irregular cycles, rising hot flashes, night sweats that affect her mornings.',
    modules: { journal: true, period: true, symptoms: true, peri: true },
    name: 'Meera',
  },
};

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (x: number, lo = 1, hi = 5) => Math.max(lo, Math.min(hi, Math.round(x)));

const SLOT_TIME: Record<Slot, string> = { morning: '08:10', afternoon: '14:05', night: '21:40' };
const CHIPS: Record<Slot, { good: string[]; bad: string[] }> = {
  morning: { good: ['rested', 'motivated', 'calm', 'hopeful'], bad: ['tired', 'groggy', 'anxious', 'heavy'] },
  afternoon: { good: ['focused', 'calm', 'productive', 'social'], bad: ['stressed', 'distracted', 'overwhelmed', 'drained'] },
  night: { good: ['content', 'grateful', 'relaxed', 'proud'], bad: ['irritable', 'sad', 'lonely', 'restless'] },
};
const NIGHT_NOTES = {
  good: ['Good day overall.', 'Caught up with a friend, felt lighter.', 'Got through my to-do list.', 'Went for a walk, helped a lot.', 'Quiet evening, felt calm.'],
  bad: ['Everything felt like too much today.', 'Snapped at someone, feel bad about it.', 'Couldn\'t focus at all.', 'Felt low for no clear reason.', 'Tired and teary.'],
};

const JOURNAL = {
  student: {
    good: [
      'Submitted the lab report a day early. Proud of myself. Celebrated with chai and a long walk with my roommate.',
      'Yoga before class really helped my focus. Want to keep this up.',
      'Called amma, we laughed for an hour. I miss home but today it felt okay.',
      'Exam went better than I expected. Grateful for the study group.',
    ],
    bad: [
      'So much pressure with the exam next week. Can\'t stop overthinking and I barely slept.',
      'Feel bloated and my skin is breaking out again. Didn\'t want to go to class.',
      'Felt really lonely in the hostel tonight. Everyone seemed busy.',
      'Cramps and a headache all day. Skipped the gym and ate too much chocolate.',
      'Anxious about the internship interview. My chest feels tight when I think about it.',
    ],
  },
  peri: {
    good: [
      'Slept through the night for once. Felt like myself at work.',
      'Morning walk with my sister. Grateful for these small things.',
      'Finished the quarterly report. My manager was happy with it.',
      'Yoga class helped with the joint pain. Want to go twice a week.',
    ],
    bad: [
      'Night sweats again, woke up three times. Exhausted and foggy at the office.',
      'Hot flash in the middle of a meeting. Felt embarrassed and anxious.',
      'Irritable with the kids today, then felt guilty. Not sure what is going on with my body.',
      'Period came after seven weeks. Heavy and tiring. Worried whether this is normal.',
      'Brain fog all day. Forgot an important call.',
    ],
  },
};

export function generateSample(persona: Persona, end = today()): Partial<Tables> {
  const r = rng(persona === 'student' ? 7 : 47);
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const DAYS = 91;
  const first = addDays(end, -DAYS);

  // Cycle starts (dates before `first` included so the first window has context)
  const lengths = persona === 'student' ? [29, 28, 30, 28, 29] : [26, 41, 33, 49];
  const starts: string[] = [];
  let s = addDays(first, persona === 'student' ? -9 : -12);
  for (const L of lengths) {
    if (s > end) break;
    starts.push(s);
    s = addDays(s, L);
  }
  const periodLen = persona === 'student' ? 5 : 6;
  const cycles: Cycle[] = starts.map((st) => {
    const e = addDays(st, periodLen - 1);
    return { start: st, end: e <= end ? e : undefined, flow: persona === 'peri' && r() > 0.5 ? 'heavy' : 'medium' };
  });

  const cycleDay = (d: string) => {
    let last: string | undefined;
    for (const x of starts) if (x <= d) last = x;
    return last ? Math.round((new Date(d).getTime() - new Date(last).getTime()) / 86400000) + 1 : 99;
  };
  const daysBefore = (d: string) => {
    for (const x of starts) if (x > d) return Math.round((new Date(x).getTime() - new Date(d).getTime()) / 86400000);
    return 99;
  };

  const checkIns: CheckIn[] = [];
  const dailyLogs: DailyLog[] = [];
  const journal: JournalEntry[] = [];
  const perimenopause: PeriLog[] = [];
  let privateDone = false;

  for (let i = 0; i < DAYS; i++) {
    const d = addDays(first, i);
    const cd = cycleDay(d);
    const db = daysBefore(d);
    const progress = i / DAYS;

    // Perimenopause
    let nightSweats = 0;
    if (persona === 'peri') {
      const hf = Math.max(0, Math.round(1 + progress * 2.2 + (r() - 0.5) * 2.5));
      nightSweats = r() < 0.25 + progress * 0.35 ? (r() < 0.3 ? 2 : 1) : 0;
      if (r() < 0.88) perimenopause.push({ date: d, hotFlashes: hf, nightSweats, notes: hf >= 4 ? pick(['Bad afternoon', 'Hot flashes at work', 'Needed a fan all evening']) : '' });
    }
    const prevNightSweats = persona === 'peri' ? (perimenopause.find((p) => p.date === addDays(d, -1))?.nightSweats ?? 0) : 0;

    // Sleep and energy
    let sleep = 3.6 + (r() - 0.5) * 1.6;
    if (persona === 'student' && db >= 1 && db <= 3) sleep -= 0.9;
    if (persona === 'peri') sleep -= prevNightSweats * 0.9 + progress * 0.4;
    const sleepI = clamp(sleep);
    const energy = clamp(sleepI + (cd <= 2 ? -1 : 0) + (r() - 0.5) * 1.4);

    // Mood baseline
    let base = 3.6 + (r() - 0.5) * 0.8;
    if (persona === 'student') {
      if (db >= 2 && db <= 4) base -= 1.5;
      else if (db === 1 || db === 5) base -= 0.7;
      if (cd <= 2) base -= 0.4;
    } else {
      base -= prevNightSweats * 0.8 + progress * 0.3;
      if (cd <= 3) base -= 0.4;
    }

    let dayMoodSum = 0, dayMoodN = 0;
    for (const slot of ['morning', 'afternoon', 'night'] as Slot[]) {
      if (d === end && slot !== 'morning') continue;
      if (r() > 0.86) continue;
      let m = base + (r() - 0.5) * 1.3;
      if (slot === 'morning') m += (sleepI - 3) * 0.45;
      if (persona === 'student' && slot === 'night') m -= 0.2;
      const mood = clamp(m);
      const pool = mood >= 3 ? CHIPS[slot].good : CHIPS[slot].bad;
      const chips = Array.from(new Set([pick(pool), r() > 0.5 ? pick(pool) : ''])).filter(Boolean);
      const note = slot === 'night' && r() < 0.6 ? pick(mood >= 3 ? NIGHT_NOTES.good : NIGHT_NOTES.bad) : '';
      checkIns.push({ datetime: `${d}T${SLOT_TIME[slot]}`, slot, mood, chips, note });
      dayMoodSum += mood; dayMoodN++;
    }

    // Symptoms
    if (r() < 0.82) {
      const sym: string[] = [];
      const p = (x: number) => r() < x;
      if (persona === 'student') {
        if (cd <= 2 && p(0.85)) sym.push('cramps');
        if (cd <= 2 && p(0.4)) sym.push('back pain');
        if (db >= 1 && db <= 3 && p(0.55)) sym.push('headache');
        if (db >= 1 && db <= 6 && p(0.5)) sym.push('bloating');
        if (db >= 2 && db <= 7 && p(0.4)) sym.push('acne');
        if (p(0.06)) sym.push('headache');
      } else {
        if (p(0.3 + progress * 0.2)) sym.push('joint pain');
        if (prevNightSweats && p(0.6)) sym.push('brain fog');
        if (cd <= 3 && p(0.7)) sym.push('cramps');
        if (p(0.12)) sym.push('headache');
        if (p(0.15)) sym.push('bloating');
      }
      if (sleepI <= 2 && p(0.5)) sym.push('fatigue');
      dailyLogs.push({ date: d, symptoms: Array.from(new Set(sym)), sleep: sleepI, energy });
    }

    // Journal every ~3 days
    if (i % 3 === 1 && d !== end) {
      const avg = dayMoodN ? dayMoodSum / dayMoodN : 3;
      const text = pick(avg >= 3 ? JOURNAL[persona].good : JOURNAL[persona].bad);
      const makePrivate = !privateDone && avg < 3 && i > 40;
      if (makePrivate) privateDone = true;
      journal.push({ date: d, text, aiTags: keywordTags(text), private: makePrivate });
    }
  }

  const meds: Med[] = persona === 'student'
    ? [{ name: 'Iron supplement', dose: '1 tablet daily', startDate: addDays(end, -60) }]
    : [{ name: 'Vitamin D', dose: '1 tablet daily', startDate: addDays(end, -80) }, { name: 'Calcium', dose: '1 tablet daily', startDate: addDays(end, -80) }];

  return { cycles, checkIns, dailyLogs, journal, perimenopause: persona === 'peri' ? perimenopause : [], meds };
}
