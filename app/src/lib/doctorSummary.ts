// Builds the doctor visit summary draft (all numbers from code) and renders the one-page PDF.
import { jsPDF } from 'jspdf';
import { addDays, dateOf, diffDays, fmtLong, today } from './dates';
import { cap, computeInsights, days as dayWord, cycleDayOf, cycleStats, moodTrend, phaseOf, sortedCycles } from './insights';
import type { ModuleId, Settings, Tables } from '../types';

export interface Section { key: string; title: string; body: string }
export interface Summary { title: string; range: string; overview: string; overviewFacts: string[]; sections: Section[] }

const r1 = (x: number) => Math.round(x * 10) / 10;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function buildSummary(t: Tables, s: Settings, days = 90): Summary {
  const end = today();
  const start = addDays(end, -days);
  const inRange = (d: string) => d >= start && d <= end;
  const m = s.modules;
  const sections: Section[] = [];
  const facts: string[] = [];

  if (m.period && t.cycles.length) {
    const cs = cycleStats(t.cycles);
    const lines = [
      `Cycles logged: ${cs.count}. Average cycle length: ${cs.avgLength || 'n/a'} days (range ${cs.minLength}–${cs.maxLength}).`,
      `Average period length: ${cs.avgPeriod || 'n/a'} days. Last period started: ${cs.lastStart ? fmtLong(cs.lastStart) : 'n/a'}.`,
    ];
    if (cs.nextStart) lines.push(`Next period expected around ${fmtLong(cs.nextStart)} (±${dayWord(cs.window)}), based on past cycles.`);
    if (!cs.regular && cs.lengths.length >= 2) lines.push('Cycle lengths vary noticeably: worth asking your doctor about.');
    sections.push({ key: 'cycle', title: 'Cycle stats', body: lines.join('\n') });
    facts.push(lines[0]);
  }

  if (m.symptoms) {
    const logs = t.dailyLogs.filter((l) => inRange(l.date));
    const counts = new Map<string, number>();
    logs.forEach((l) => l.symptoms.forEach((x) => counts.set(x, (counts.get(x) ?? 0) + 1)));
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const starts = sortedCycles(t.cycles).map((c) => c.start);
    const cs = cycleStats(t.cycles);
    const lines = top.map(([sym, n]) => {
      let when = '';
      if (m.period && starts.length >= 2) {
        const phases = new Map<string, number>();
        logs.filter((l) => l.symptoms.includes(sym)).forEach((l) => {
          const d = cycleDayOf(l.date, starts);
          if (d && d <= 45) { const p = phaseOf(d, cs.avgLength || 28, cs.avgPeriod || 5); phases.set(p, (phases.get(p) ?? 0) + 1); }
        });
        const best = [...phases.entries()].sort((a, b) => b[1] - a[1])[0];
        if (best) when = best[0] === 'Period' ? `, mostly during the period (${best[1]} of ${n})` : `, mostly in the ${best[0].toLowerCase()} phase (${best[1]} of ${n})`;
      }
      return `• ${cap(sym)}: ${n} days${when}`;
    });
    const sleep = r1(mean(logs.map((l) => l.sleep)));
    const energy = r1(mean(logs.map((l) => l.energy)));
    if (logs.length) lines.push(`Average sleep rating ${sleep}/5, energy ${energy}/5 (${logs.length} days logged).`);
    if (lines.length) { sections.push({ key: 'symptoms', title: 'Top symptoms and when they occur', body: lines.join('\n') }); facts.push(...lines.slice(0, 3)); }
  }

  if (m.peri) {
    const logs = t.perimenopause.filter((l) => inRange(l.date));
    if (logs.length) {
      const hf = r1(mean(logs.map((l) => l.hotFlashes)));
      const nsNights = logs.filter((l) => l.nightSweats > 0).length;
      const body = `Hot flashes: ${hf} a day on average (${logs.length} days logged).\nNight sweats on ${nsNights} of ${logs.length} nights.`;
      sections.push({ key: 'peri', title: 'Perimenopause', body });
      facts.push(body.replace('\n', ' '));
    }
  }

  if (m.journal) {
    const cis = t.checkIns.filter((c) => inRange(dateOf(c.datetime)));
    if (cis.length) {
      const mt = moodTrend(t.checkIns);
      const low = cis.filter((c) => c.mood <= 2).length;
      const themes = new Map<string, number>();
      t.journal.filter((j) => !j.private && inRange(j.date)).forEach((j) => j.aiTags.forEach((g) => themes.set(g, (themes.get(g) ?? 0) + 1)));
      const topThemes = [...themes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([g]) => g);
      const lines = [
        `Average mood ${r1(mean(cis.map((c) => c.mood)))}/5 across ${cis.length} check-ins; ${low} were low (1–2 out of 5).`,
        `Last 2 weeks: ${mt.recent || 'n/a'}/5 vs ${mt.previous || 'n/a'}/5 the 2 weeks before.`,
      ];
      if (topThemes.length) lines.push(`Common journal themes: ${topThemes.join(', ')}. (Private entries excluded.)`);
      sections.push({ key: 'mood', title: 'Mood trends', body: lines.join('\n') });
      facts.push(lines[0], lines[1]);
    }
  }

  const insights = computeInsights(t, s.modules).filter((i) => i.modules.length > 1 || i.type === 'peri-trend' || i.type === 'mood-trend');
  if (insights.length) {
    const body = insights.slice(0, 4).map((i) => `• ${i.message}`).join('\n');
    sections.push({ key: 'changes', title: 'Notable patterns and changes', body });
    facts.push(...insights.slice(0, 3).map((i) => i.message));
  }

  const meds = t.meds.length ? t.meds.map((md) => `• ${md.name}, ${md.dose} (since ${fmtLong(md.startDate)})`).join('\n') : 'None logged.';
  sections.push({ key: 'meds', title: 'Logged medications', body: meds });

  const qs: string[] = [];
  const cs = cycleStats(t.cycles);
  if (m.period && !cs.regular && cs.lengths.length >= 2) qs.push('My cycle length has been changing. Is that worth looking into?');
  if (insights.some((i) => i.type === 'mood-cycle')) qs.push('My mood drops in the days before my period. Is that worth asking about, and what could help?');
  if (insights.some((i) => i.type.startsWith('symptom-phase'))) qs.push('Some symptoms follow my cycle. What can I do about them?');
  if (m.peri) qs.push('Could these changes be related to perimenopause, and what options are there?');
  if (insights.some((i) => i.type === 'sleep-mood' || i.type === 'peri-mood')) qs.push('Poor sleep seems to affect my mood. What could help me sleep better?');
  if (!qs.length) qs.push('Is there anything in this summary worth looking into?');
  sections.push({ key: 'questions', title: 'Questions to ask', body: qs.map((q) => `• ${q}`).join('\n') });

  const overview = `This summary covers ${fmtLong(start)} to ${fmtLong(end)}, from data logged privately in Ishtar on the patient's own device. ` +
    `It is a personal record, not a diagnosis. Items marked "worth asking your doctor about" are for discussion.`;

  return { title: `Doctor visit summary${s.name ? ` for ${s.name}` : ''}`, range: `${fmtLong(start)} – ${fmtLong(end)}`, overview, overviewFacts: facts, sections };
}

export function renderPDF(sum: Summary): jsPDF {
  const tryRender = (size: number) => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 44;
    let y = M;
    doc.setFillColor(107, 45, 92);
    doc.rect(0, 0, W, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(size + 7);
    doc.setTextColor(60, 20, 50);
    doc.text(sum.title, M, y + 10);
    y += 26;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size - 1);
    doc.setTextColor(110);
    doc.text(`${sum.range}  ·  Generated ${fmtLong(today())}  ·  Ishtar (on-device)`, M, y);
    y += size + 8;
    doc.setTextColor(30);
    const para = (txt: string) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(txt, W - 2 * M);
      doc.text(lines, M, y);
      y += lines.length * (size * 1.32) + 6;
    };
    para(sum.overview);
    for (const sec of sum.sections) {
      if (!sec.body.trim()) continue;
      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(size + 1.5);
      doc.setTextColor(107, 45, 92);
      doc.text(sec.title, M, y);
      y += size + 5;
      doc.setTextColor(30);
      para(sec.body);
    }
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text('Not a medical device and not a diagnosis. Reviewed and shared by the patient. Worth discussing with your doctor.', M, H - 26);
    return { doc, fits: y < H - 40 };
  };
  for (let size = 10.5; size >= 7; size -= 0.5) {
    const r = tryRender(size);
    if (r.fits) return r.doc;
  }
  return tryRender(7).doc;
}

export function rangeDays(a: string, b: string) {
  return diffDays(a, b);
}
export type { ModuleId };
