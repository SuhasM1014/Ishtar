// Insight engine: deterministic stats and correlations. The LLM never computes any number shown here.
import { addDays, dateOf, diffDays, fmtDate, today } from './dates';
import type { CheckIn, Consent, Cycle, ModuleId, PeriLog, Tables } from '../types';

export interface Insight {
  type: string;
  title: string;
  message: string; // template sentence with numbers filled in by code
  evidence: string; // how we know (shown under "How we know")
  modules: ModuleId[];
  numbers: string[]; // every number in `message`, used to verify LLM rewording
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const sd = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};
const r1 = (x: number) => Math.round(x * 10) / 10;
const pct = (x: number) => Math.round(x * 100);

export function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;
  const mx = mean(xs), my = mean(ys);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  return dx && dy ? num / Math.sqrt(dx * dy) : 0;
}

export function consentGranted(consents: Consent[], a: ModuleId, b: ModuleId): boolean {
  const rows = consents
    .filter((c) => (c.moduleA === a && c.moduleB === b) || (c.moduleA === b && c.moduleB === a))
    .sort((x, y) => (x.date < y.date ? -1 : 1) || (x.id ?? 0) - (y.id ?? 0));
  return rows.length ? rows[rows.length - 1].granted : false;
}

// ---------- Cycles ----------
export interface CycleStats {
  count: number;
  lengths: number[];
  avgLength: number;
  sdLength: number;
  minLength: number;
  maxLength: number;
  avgPeriod: number;
  lastStart?: string;
  nextStart?: string; // prediction from the user's own history
  window: number; // ± days
  cycleDay?: number;
  regular: boolean;
}

export function sortedCycles(cycles: Cycle[]): Cycle[] {
  return [...cycles].sort((a, b) => (a.start < b.start ? -1 : 1));
}

export function cycleStats(cycles: Cycle[], on = today()): CycleStats {
  const cs = sortedCycles(cycles).filter((c) => c.start <= on);
  const lengths: number[] = [];
  for (let i = 1; i < cs.length; i++) lengths.push(diffDays(cs[i - 1].start, cs[i].start));
  const recent = lengths.slice(-6);
  const periods = cs.filter((c) => c.end).map((c) => diffDays(c.start, c.end!) + 1);
  const avg = mean(recent);
  const s = sd(recent);
  const last = cs[cs.length - 1];
  return {
    count: cs.length,
    lengths,
    avgLength: r1(avg),
    sdLength: r1(s),
    minLength: lengths.length ? Math.min(...lengths) : 0,
    maxLength: lengths.length ? Math.max(...lengths) : 0,
    avgPeriod: r1(mean(periods)),
    lastStart: last?.start,
    nextStart: last && recent.length ? addDays(last.start, Math.round(avg)) : undefined,
    window: Math.max(1, Math.round(s)),
    cycleDay: last ? diffDays(last.start, on) + 1 : undefined,
    regular: recent.length >= 2 && s <= 3,
  };
}

/** Days until the next *recorded* period start after `date` (for past data), or undefined. */
function daysBeforeNextStart(date: string, starts: string[]): number | undefined {
  for (const s of starts) if (s > date) return diffDays(date, s);
  return undefined;
}

/** Cycle day (1-based) of `date`, using recorded starts. */
export function cycleDayOf(date: string, starts: string[]): number | undefined {
  let last: string | undefined;
  for (const s of starts) if (s <= date) last = s;
  return last ? diffDays(last, date) + 1 : undefined;
}

export type Phase = 'Period' | 'Follicular' | 'Ovulation window' | 'Luteal';
export function phaseOf(day: number, cycleLen: number, periodLen: number): Phase {
  const ov = Math.round(cycleLen - 14);
  if (day <= Math.max(3, Math.round(periodLen))) return 'Period';
  if (day >= ov - 1 && day <= ov + 1) return 'Ovulation window';
  if (day < ov - 1) return 'Follicular';
  return 'Luteal';
}

// ---------- Mood ----------
export function dailyMood(checkIns: CheckIn[]): Map<string, number> {
  const by = new Map<string, number[]>();
  for (const c of checkIns) {
    const d = dateOf(c.datetime);
    by.set(d, [...(by.get(d) ?? []), c.mood]);
  }
  const out = new Map<string, number>();
  by.forEach((v, k) => out.set(k, mean(v)));
  return out;
}

export function moodTrend(checkIns: CheckIn[], on = today()) {
  const last14 = checkIns.filter((c) => { const d = diffDays(dateOf(c.datetime), on); return d >= 0 && d < 14; });
  const prev14 = checkIns.filter((c) => { const d = diffDays(dateOf(c.datetime), on); return d >= 14 && d < 28; });
  return { recent: r1(mean(last14.map((c) => c.mood))), previous: r1(mean(prev14.map((c) => c.mood))), nRecent: last14.length, nPrev: prev14.length };
}

// ---------- Perimenopause ----------
export function periWeekly(logs: PeriLog[], weeks = 8, on = today()) {
  const out: { week: string; hotFlashes: number; nightSweats: number; days: number }[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const start = addDays(on, -7 * w - 6);
    const end = addDays(on, -7 * w);
    const inWeek = logs.filter((l) => l.date >= start && l.date <= end);
    out.push({
      week: start,
      hotFlashes: r1(mean(inWeek.map((l) => l.hotFlashes))),
      nightSweats: r1(mean(inWeek.map((l) => l.nightSweats))),
      days: inWeek.length,
    });
  }
  return out;
}

// ---------- Insight generation ----------
export function computeInsights(t: Tables, enabled: Record<ModuleId, boolean>, on = today()): Insight[] {
  const out: Insight[] = [];
  const starts = sortedCycles(t.cycles).map((c) => c.start);
  const cs = cycleStats(t.cycles, on);
  const can = (a: ModuleId, b: ModuleId) => enabled[a] && enabled[b] && consentGranted(t.consents, a, b);

  // Single-module: period
  if (enabled.period && cs.lengths.length >= 2) {
    const msg = cs.regular
      ? `Your cycle averages ${cs.avgLength} days (range ${cs.minLength}–${cs.maxLength}). Next period expected around ${fmtDate(cs.nextStart!)} (±${days(cs.window)}).`
      : `Your recent cycles vary from ${cs.minLength} to ${cs.maxLength} days, so predictions are less certain (±${days(cs.window)}).`;
    out.push({
      type: 'cycle-summary', title: 'Your cycle', modules: ['period'], message: msg,
      evidence: `Based on your last ${Math.min(6, cs.lengths.length)} recorded cycle lengths: ${cs.lengths.slice(-6).join(', ')} days.`,
      numbers: [String(cs.avgLength), String(cs.minLength), String(cs.maxLength), String(cs.window)],
    });
  }

  // Single-module: mood trend
  if (enabled.journal) {
    const mt = moodTrend(t.checkIns, on);
    if (mt.nRecent >= 6 && mt.nPrev >= 6 && Math.abs(mt.recent - mt.previous) >= 0.3) {
      const dir = mt.recent > mt.previous ? 'up' : 'down';
      out.push({
        type: 'mood-trend', title: 'Mood trend', modules: ['journal'],
        message: `Your average mood is ${dir}: ${mt.recent}/5 over the last 2 weeks vs ${mt.previous}/5 the 2 weeks before.`,
        evidence: `${mt.nRecent} recent check-ins vs ${mt.nPrev} earlier check-ins.`,
        numbers: [String(mt.recent), String(mt.previous)],
      });
    }
    // slot comparison
    const bySlot = (s: string) => t.checkIns.filter((c) => c.slot === s).map((c) => c.mood);
    const m = mean(bySlot('morning')), n = mean(bySlot('night'));
    if (bySlot('morning').length >= 10 && bySlot('night').length >= 10 && Math.abs(m - n) >= 0.4) {
      const better = m > n ? 'mornings' : 'nights';
      out.push({
        type: 'slot-mood', title: 'Time of day', modules: ['journal'],
        message: `You tend to feel better in the ${better}: ${r1(Math.max(m, n))}/5 vs ${r1(Math.min(m, n))}/5.`,
        evidence: `${bySlot('morning').length} morning and ${bySlot('night').length} night check-ins.`,
        numbers: [String(r1(Math.max(m, n))), String(r1(Math.min(m, n)))],
      });
    }
  }

  // Single-module: perimenopause trend
  if (enabled.peri && t.perimenopause.length >= 14) {
    const sorted = [...t.perimenopause].sort((a, b) => (a.date < b.date ? -1 : 1));
    const last28 = sorted.filter((l) => { const d = diffDays(l.date, on); return d >= 0 && d < 28; });
    const prev28 = sorted.filter((l) => { const d = diffDays(l.date, on); return d >= 28 && d < 56; });
    if (last28.length >= 7 && prev28.length >= 7) {
      const a = r1(mean(last28.map((l) => l.hotFlashes))), b = r1(mean(prev28.map((l) => l.hotFlashes)));
      const ns = r1(mean(last28.map((l) => l.nightSweats))), nsb = r1(mean(prev28.map((l) => l.nightSweats)));
      const dir = a > b + 0.2 ? 'trending up' : a < b - 0.2 ? 'trending down' : 'steady';
      out.push({
        type: 'peri-trend', title: 'Hot flash trend', modules: ['peri'],
        message: `Hot flashes are ${dir}: ${a} a day over the last 4 weeks vs ${b} the 4 weeks before. Night sweats: ${ns} vs ${nsb}.`,
        evidence: `${last28.length} recent days and ${prev28.length} earlier days logged.`,
        numbers: [String(a), String(b), String(ns), String(nsb)],
      });
    }
  }

  // Cross-module: journal × period: low-mood clustering before period
  if (can('journal', 'period') && starts.length >= 3) {
    const buckets = new Map<number, { low: number; n: number }>();
    let otherLow = 0, otherN = 0;
    for (const c of t.checkIns) {
      const d = daysBeforeNextStart(dateOf(c.datetime), starts);
      if (d === undefined) continue;
      const low = c.mood <= 2 ? 1 : 0;
      if (d >= 1 && d <= 7) {
        const b = buckets.get(d) ?? { low: 0, n: 0 };
        b.low += low; b.n += 1; buckets.set(d, b);
      } else { otherLow += low; otherN += 1; }
    }
    // find best 1–3 day window
    let best: { from: number; to: number; rate: number; n: number } | undefined;
    for (let from = 1; from <= 5; from++) {
      const to = from + 2;
      let low = 0, n = 0;
      for (let d = from; d <= to; d++) { const b = buckets.get(d); if (b) { low += b.low; n += b.n; } }
      if (n >= 8 && (!best || low / n > best.rate)) best = { from, to, rate: low / n, n };
    }
    const base = otherN ? otherLow / otherN : 0;
    if (best && otherN >= 20 && best.rate >= 0.25 && best.rate >= base * 1.5) {
      const mid = Math.round((best.from + best.to) / 2);
      out.push({
        type: 'mood-cycle', title: 'Mood and your cycle', modules: ['journal', 'period'],
        message: `Low-mood check-ins cluster about ${mid} days before your period: ${pct(best.rate)}% of check-ins ${best.from}–${best.to} days before are low, vs ${pct(base)}% at other times.`,
        evidence: `${best.n} check-ins in that window across ${starts.length - 1} cycles, compared with ${otherN} other check-ins. "Low" means mood 1 or 2 out of 5.`,
        numbers: [String(mid), String(pct(best.rate)), String(pct(base))],
      });
    }
  }

  // Cross-module: symptoms × period: when symptoms occur
  if (can('symptoms', 'period') && starts.length >= 2) {
    const counts = new Map<string, Map<Phase, number>>();
    for (const l of t.dailyLogs) {
      const day = cycleDayOf(l.date, starts);
      if (!day || day > 45) continue;
      const ph = phaseOf(day, cs.avgLength || 28, cs.avgPeriod || 5);
      for (const s of l.symptoms) {
        const m = counts.get(s) ?? new Map<Phase, number>();
        m.set(ph, (m.get(ph) ?? 0) + 1);
        counts.set(s, m);
      }
    }
    const ranked = [...counts.entries()]
      .map(([s, m]) => ({ s, total: [...m.values()].reduce((a, b) => a + b, 0), top: [...m.entries()].sort((a, b) => b[1] - a[1])[0] }))
      .filter((x) => x.total >= 4)
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
    for (const r of ranked) {
      const share = pct(r.top[1] / r.total);
      if (share < 60) continue;
      const where = r.top[0] === 'Period' ? 'during your period' : `in your ${r.top[0].toLowerCase()} phase`;
      out.push({
        type: `symptom-phase-${r.s}`, title: `When ${r.s} shows up`, modules: ['symptoms', 'period'],
        message: `${cap(r.s)} mostly shows up ${where}: ${share}% of the ${r.total} days you logged it.`,
        evidence: `Phases estimated from your own average cycle (${cs.avgLength || 28} days) and period length (${cs.avgPeriod || 5} days).`,
        numbers: [String(share), String(r.total)],
      });
    }
  }

  // Cross-module: journal × symptoms: sleep vs next-morning mood
  if (can('journal', 'symptoms')) {
    const morning = new Map<string, number>();
    t.checkIns.filter((c) => c.slot === 'morning').forEach((c) => morning.set(dateOf(c.datetime), c.mood));
    const xs: number[] = [], ys: number[] = [];
    for (const l of t.dailyLogs) {
      const m = morning.get(l.date);
      if (m !== undefined && l.sleep) { xs.push(l.sleep); ys.push(m); }
    }
    const r = pearson(xs, ys);
    if (xs.length >= 15 && Math.abs(r) >= 0.3) {
      const good = xs.map((x, i) => (x >= 4 ? ys[i] : NaN)).filter((v) => !isNaN(v));
      const poor = xs.map((x, i) => (x <= 2 ? ys[i] : NaN)).filter((v) => !isNaN(v));
      if (good.length >= 3 && poor.length >= 3) {
        out.push({
          type: 'sleep-mood', title: 'Sleep and mood', modules: ['journal', 'symptoms'],
          message: `On mornings after good sleep your mood averages ${r1(mean(good))}/5, vs ${r1(mean(poor))}/5 after poor sleep.`,
          evidence: `${xs.length} days with both a sleep rating and a morning check-in (correlation ${r1(r)}).`,
          numbers: [String(r1(mean(good))), String(r1(mean(poor)))],
        });
      }
    }
  }

  // Cross-module: journal × peri: night sweats vs next-morning mood
  if (can('journal', 'peri')) {
    const morning = new Map<string, number>();
    t.checkIns.filter((c) => c.slot === 'morning').forEach((c) => morning.set(dateOf(c.datetime), c.mood));
    const withNS: number[] = [], without: number[] = [];
    for (const l of t.perimenopause) {
      const m = morning.get(addDays(l.date, 1));
      if (m === undefined) continue;
      (l.nightSweats > 0 ? withNS : without).push(m);
    }
    if (withNS.length >= 5 && without.length >= 5 && mean(without) - mean(withNS) >= 0.4) {
      out.push({
        type: 'peri-mood', title: 'Night sweats and mood', modules: ['journal', 'peri'],
        message: `After nights with night sweats, your morning mood averages ${r1(mean(withNS))}/5, vs ${r1(mean(without))}/5 after nights without.`,
        evidence: `${withNS.length} mornings after night sweats, ${without.length} mornings after nights without.`,
        numbers: [String(r1(mean(withNS))), String(r1(mean(without)))],
      });
    }
  }

  return out;
}

export const days = (n: number) => `${n} day${n === 1 ? '' : 's'}`;

export function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Module pairs that can compare notes. */
export const PAIRS: [ModuleId, ModuleId][] = [
  ['journal', 'period'],
  ['symptoms', 'period'],
  ['journal', 'symptoms'],
  ['journal', 'peri'],
];
