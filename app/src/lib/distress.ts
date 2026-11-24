// Distress safety net: a keyword list plus a small on-device classifier. If either flags, the app gently
// shows support resources (Tele-MANAS 14416). Nothing is sent anywhere.
const PHRASES = [
  'kill myself', 'killing myself', 'end my life', 'end it all', 'want to die', 'wanna die', 'wish i was dead', 'wish i were dead',
  'better off dead', 'better off without me', 'suicide', 'suicidal', 'self harm', 'self-harm', 'hurt myself', 'hurting myself',
  'cut myself', 'cutting myself', 'no reason to live', 'nothing to live for', "can't go on", 'cant go on', 'give up on life',
  'disappear forever', 'no way out', 'overdose',
  // Hinglish / transliterated Hindi and Kannada
  'marna chahti', 'mar jaana', 'mar jaun', 'jeena nahi', 'zindagi khatam', 'saayabeku', 'saaybeku', 'baduku beda',
];

export function keywordFlag(text: string): boolean {
  const t = text.toLowerCase().replace(/\s+/g, ' ');
  return PHRASES.some((p) => t.includes(p));
}

type ZeroShot = (text: string, labels: string[]) => Promise<{ labels: string[]; scores: number[] }>;
let classifier: ZeroShot | null = null;
let loading: Promise<void> | null = null;

export const classifierReady = () => !!classifier;

export function loadClassifier(): Promise<void> {
  if (classifier) return Promise.resolve();
  if (!loading) {
    loading = (async () => {
      const { pipeline } = await import('@huggingface/transformers');
      const p = await pipeline('zero-shot-classification', 'Xenova/mobilebert-uncased-mnli', { dtype: 'q8' });
      classifier = p as unknown as ZeroShot;
    })().catch((e) => {
      loading = null;
      throw e;
    });
  }
  return loading;
}

const LABELS = ['thoughts of self-harm or suicide', 'hopelessness and severe distress', 'everyday feelings'];

export async function classifierFlag(text: string): Promise<boolean> {
  if (!classifier || text.trim().length < 12) return false;
  try {
    const out = await classifier(text.slice(0, 1000), LABELS);
    const top = out.labels[0];
    return top !== 'everyday feelings' && out.scores[0] >= 0.7;
  } catch {
    return false;
  }
}

export async function checkDistress(text: string): Promise<boolean> {
  if (!text.trim()) return false;
  if (keywordFlag(text)) return true;
  return classifierFlag(text);
}
