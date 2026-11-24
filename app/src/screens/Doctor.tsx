import { useState } from 'react';
import { useAI } from '../lib/aiState';
import { today } from '../lib/dates';
import { buildSummary, renderPDF, type Summary } from '../lib/doctorSummary';
import { draftOverview } from '../lib/llm';
import { useStore } from '../store';

const fitRows = (t: string) => Math.max(3, t.split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.length / 34)), 0) + 1);

export function Doctor() {
  const { tables, settings } = useStore();
  const ai = useAI();
  const [sum, setSum] = useState<Summary | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [status, setStatus] = useState('');

  const create = () => { setSum(buildSummary(tables, settings)); setStatus(''); };
  const edit = (patch: Partial<Summary>) => setSum((s) => (s ? { ...s, ...patch } : s));
  const editSection = (key: string, body: string) => setSum((s) => (s ? { ...s, sections: s.sections.map((x) => (x.key === key ? { ...x, body } : x)) } : s));

  const aiDraft = async () => {
    if (!sum) return;
    setDrafting(true);
    const text = await draftOverview(sum.overviewFacts, sum.overview);
    edit({ overview: text });
    setDrafting(false);
  };

  const fileName = () => `ishtar-doctor-summary-${today()}.pdf`;
  const download = () => {
    if (!sum) return;
    renderPDF(sum).save(fileName());
    setStatus('PDF saved to your device.');
  };
  const share = async () => {
    if (!sum) return;
    const blob = renderPDF(sum).output('blob');
    const file = new File([blob], fileName(), { type: 'application/pdf' });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Doctor visit summary' }); setStatus('Shared.'); }
      catch { setStatus('Share cancelled.'); }
    } else {
      download();
      setStatus('Sharing isn\'t supported in this browser, so the PDF was saved instead.');
    }
  };

  if (!sum) {
    return (
      <div className="stack">
        <h1>Doctor visit summary</h1>
        <div className="card soft stack">
          <p>One tap creates a one-page summary of the last 3 months: cycle stats, top symptoms and when they occur, mood trends, notable changes, logged medications, and questions to ask.</p>
          <p className="small muted">You review and edit it before exporting. Nothing is shared automatically. Private journal entries are left out. It never diagnoses.</p>
          <button className="btn block" onClick={create}>Create summary</button>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="row between">
        <h1>Review and edit</h1>
        <button className="btn sm subtle" onClick={create}>Rebuild</button>
      </div>
      <p className="small muted">{sum.range}. Everything below is editable. Numbers were computed on your device.</p>
      <div className="card">
        <label className="field"><span>Title</span><input type="text" value={sum.title} onChange={(e) => edit({ title: e.target.value })} /></label>
        <label className="field"><span>Overview</span><textarea rows={fitRows(sum.overview)} value={sum.overview} onChange={(e) => edit({ overview: e.target.value })} /></label>
        {settings.aiEnabled && ai.llm === 'ready' && (
          <button className="btn sm ghost" disabled={drafting} onClick={aiDraft}>{drafting ? 'Drafting on-device…' : '✨ Draft overview with on-device AI'}</button>
        )}
      </div>
      {sum.sections.map((s) => (
        <div key={s.key} className="card">
          <label className="field">
            <span><b style={{ color: 'var(--brand)' }}>{s.title}</b></span>
            <textarea value={s.body} rows={fitRows(s.body)} onChange={(e) => editSection(s.key, e.target.value)} />
          </label>
        </div>
      ))}
      <div className="card soft stack">
        <button className="btn block" onClick={download}>⬇ Export PDF</button>
        <button className="btn block ghost" onClick={share}>Share PDF…</button>
        {status && <p className="small center" role="status">{status}</p>}
        <p className="tiny muted center">The PDF only leaves your device if you choose to share it.</p>
      </div>
    </div>
  );
}
