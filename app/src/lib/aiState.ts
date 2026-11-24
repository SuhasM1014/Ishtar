// Shared status for the on-device models, so any screen can show progress.
import { useSyncExternalStore } from 'react';
import { hasWebGPU, loadLLM } from './llm';
import { loadClassifier } from './distress';

export interface AIState {
  llm: 'off' | 'loading' | 'ready' | 'error' | 'unsupported';
  llmText: string;
  llmProgress: number;
  classifier: 'off' | 'loading' | 'ready' | 'error';
}

let state: AIState = { llm: hasWebGPU() ? 'off' : 'unsupported', llmText: '', llmProgress: 0, classifier: 'off' };
const subs = new Set<() => void>();
const set = (patch: Partial<AIState>) => { state = { ...state, ...patch }; subs.forEach((f) => f()); };

export function useAI(): AIState {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state);
}

export async function startAI() {
  if (state.classifier === 'off' || state.classifier === 'error') {
    set({ classifier: 'loading' });
    loadClassifier().then(() => set({ classifier: 'ready' })).catch((e) => { console.warn(e); set({ classifier: 'error' }); });
  }
  if (state.llm === 'unsupported' || state.llm === 'ready' || state.llm === 'loading') return;
  set({ llm: 'loading', llmText: 'Starting…', llmProgress: 0 });
  try {
    await loadLLM((text, progress) => set({ llmText: text, llmProgress: progress }));
    set({ llm: 'ready', llmProgress: 1 });
  } catch (e) {
    console.warn(e);
    set({ llm: 'error', llmText: e instanceof Error ? e.message : String(e) });
  }
}
