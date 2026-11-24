import { useEffect, useState } from 'react';
import { createPin, hasPin, unlock, wipeEverything } from '../lib/db';

export function Lock(props: { onUnlock: (key: CryptoKey) => void }) {
  const [mode, setMode] = useState<'loading' | 'create' | 'confirm' | 'enter'>('loading');
  const [pin, setPin] = useState('');
  const [first, setFirst] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const LEN = 4;

  useEffect(() => { hasPin().then((h) => setMode(h ? 'enter' : 'create')); }, []);

  useEffect(() => {
    if (pin.length !== LEN) return;
    (async () => {
      setBusy(true);
      if (mode === 'create') { setFirst(pin); setPin(''); setMode('confirm'); setError(''); }
      else if (mode === 'confirm') {
        if (pin === first) props.onUnlock(await createPin(pin));
        else { setError("PINs didn't match. Try again."); setPin(''); setFirst(''); setMode('create'); }
      } else if (mode === 'enter') {
        const key = await unlock(pin);
        if (key) props.onUnlock(key);
        else { setError('Wrong PIN'); setPin(''); }
      }
      setBusy(false);
    })();
  }, [pin]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) setPin((p) => (p.length < LEN ? p + e.key : p));
      if (e.key === 'Backspace') setPin((p) => p.slice(0, -1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (mode === 'loading') return <div className="lock" />;
  const title = mode === 'create' ? 'Create a 4-digit PIN' : mode === 'confirm' ? 'Confirm your PIN' : 'Enter your PIN';

  return (
    <div className="lock">
      <img src="./icon.svg" alt="" width={64} height={64} style={{ borderRadius: 16 }} />
      <h1 style={{ marginTop: 14 }}>Ishtar</h1>
      <p className="muted small" style={{ maxWidth: 320 }}>
        {mode === 'enter' ? 'Your data is encrypted on this device.' : 'Your PIN encrypts everything you log. It never leaves this device, and there is no account.'}
      </p>
      <h2 style={{ marginTop: 18 }}>{title}</h2>
      <div className="pin-dots" aria-label={`${pin.length} of ${LEN} digits entered`}>
        {Array.from({ length: LEN }).map((_, i) => <i key={i} className={i < pin.length ? 'on' : ''} />)}
      </div>
      <p style={{ color: '#b3263e', minHeight: 22 }} role="alert">{busy ? '' : error}</p>
      <div className="keypad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button key={n} disabled={busy} onClick={() => setPin((p) => (p.length < LEN ? p + n : p))}>{n}</button>
        ))}
        <span />
        <button disabled={busy} onClick={() => setPin((p) => (p.length < LEN ? p + '0' : p))}>0</button>
        <button disabled={busy} aria-label="Delete" onClick={() => setPin((p) => p.slice(0, -1))}>⌫</button>
      </div>
      {mode === 'enter' && (
        <button
          className="btn ghost sm" style={{ marginTop: 22 }}
          onClick={async () => {
            if (confirm('Forgot your PIN? Your data is encrypted with it, so the only option is to delete all data on this device and start again. This cannot be undone. Continue?')) {
              await wipeEverything();
              location.reload();
            }
          }}
        >
          Forgot PIN
        </button>
      )}
    </div>
  );
}
