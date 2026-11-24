import { useCallback, useEffect, useState } from 'react';
import { startAI } from './lib/aiState';
import { loadAll } from './lib/db';
import { Doctor } from './screens/Doctor';
import { Insights } from './screens/Insights';
import { Lock } from './screens/Lock';
import { Onboarding } from './screens/Onboarding';
import { Settings } from './screens/Settings';
import { Today, type Nav } from './screens/Today';
import { Track } from './screens/Track';
import { StoreProvider, useStore } from './store';
import type { Settings as S, Tables } from './types';

type Tab = 'today' | 'track' | 'insights' | 'doctor' | 'settings';
const TABS: { id: Tab; label: string; ic: string }[] = [
  { id: 'today', label: 'Today', ic: '☀️' },
  { id: 'track', label: 'Track', ic: '✎' },
  { id: 'insights', label: 'Insights', ic: '✦' },
  { id: 'doctor', label: 'Doctor', ic: '🩺' },
  { id: 'settings', label: 'Settings', ic: '⚙' },
];
const AUTO_LOCK_MS = 5 * 60 * 1000;

export default function App() {
  const [session, setSession] = useState<{ key: CryptoKey; initial: { tables: Tables; settings: S } } | null>(null);
  const lock = useCallback(() => setSession(null), []);

  // Auto-lock after 5 minutes in the background.
  useEffect(() => {
    if (!session) return;
    let hiddenAt = 0;
    const onVis = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > AUTO_LOCK_MS) lock();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [session, lock]);

  if (!session) {
    return (
      <Lock
        onUnlock={async (key) => {
          const initial = await loadAll(key);
          if (initial.settings.aiEnabled) void startAI();
          setSession({ key, initial });
        }}
      />
    );
  }
  return (
    <StoreProvider cryptoKey={session.key} initial={session.initial} onLock={lock}>
      <Shell />
    </StoreProvider>
  );
}

function Shell() {
  const { settings, lock } = useStore();
  const [tab, setTab] = useState<Tab>('today');
  const [sub, setSub] = useState<string | undefined>();
  const nav: Nav = (t, s) => { setTab(t); setSub(s); window.scrollTo(0, 0); };

  if (!settings.onboarded) return <Onboarding />;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand"><img src="./icon.svg" alt="" /> Ishtar</div>
        <button className="iconbtn" aria-label="Lock" title="Lock" onClick={lock}>🔒</button>
      </header>
      <main className="main">
        {tab === 'today' && <Today nav={nav} />}
        {tab === 'track' && <Track initial={sub} />}
        {tab === 'insights' && <Insights />}
        {tab === 'doctor' && <Doctor />}
        {tab === 'settings' && <Settings />}
      </main>
      <nav className="nav" aria-label="Main">
        <div className="nav-inner">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => nav(t.id)}>
              <span className="ic" aria-hidden>{t.ic}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
