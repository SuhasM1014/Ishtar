// On-device LLM via WebLLM (WebGPU). It only tags journal entries, words insights and drafts the doctor
// summary. It never computes numbers: every output is checked against code-computed numbers, with
// template fallbacks if the model is unavailable or its output does not pass the check.
import type { MLCEngineInterface } from '@mlc-ai/web-llm';
import { TAGS, keywordTags } from './tags';

export const MODEL_ID = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';
let engine: MLCEngineInterface | null = null;
let loading: Promise<void> | null = null;

export const hasWebGPU = () => typeof navigator !== 'undefined' && 'gpu' in navigator;
export const llmReady = () => !!engine;

export function loadLLM(onProgress: (text: string, progress: number) => void): Promise<void> {
  if (engine) return Promise.resolve();
  if (!loading) {
    loading = (async () => {
      const webllm = await import('@mlc-ai/web-llm');
      engine = await webllm.CreateMLCEngine(MODEL_ID, {
        initProgressCallback: (r) => onProgress(r.text, r.progress),
      });
    })().catch((e) => {
      loading = null;
      throw e;
    });
  }
  return loading;
}

async function jsonChat<T>(system: string, user: string, schema: object, maxTokens = 200): Promise<T | null> {
  if (!engine) return null;
  try {
    const res = await engine.chat.completions.create({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.3,
      max_tokens: maxTokens,
      response_format: { type: 'json_object', schema: JSON.stringify(schema) },
    });
    const txt = res.choices[0]?.message?.content ?? '';
    return JSON.parse(txt) as T;
  } catch (e) {
    console.warn('LLM call failed, using template fallback', e);
    return null;
  }
}

const numbersIn = (s: string) => s.match(/\d+(?:\.\d+)?/g) ?? [];

/** Tags a journal entry from a fixed vocabulary. Falls back to keyword matching. */
export async function tagJournal(text: string): Promise<string[]> {
  const schema = {
    type: 'object',
    properties: { tags: { type: 'array', items: { type: 'string', enum: [...TAGS] }, maxItems: 4 } },
    required: ['tags'],
  };
  const out = await jsonChat<{ tags: string[] }>(
    'You label private journal entries with up to 4 topic tags from a fixed list. Reply with JSON only.',
    `Allowed tags: ${TAGS.join(', ')}\n\nEntry: """${text.slice(0, 1500)}"""`,
    schema,
    80,
  );
  const tags = (out?.tags ?? []).filter((t) => (TAGS as readonly string[]).includes(t));
  return tags.length ? Array.from(new Set(tags)).slice(0, 4) : keywordTags(text);
}

/** Rewords a code-generated insight warmly. Rejects output that changes, drops or adds any number. */
export async function wordInsight(template: string): Promise<string> {
  const schema = { type: 'object', properties: { sentence: { type: 'string' } }, required: ['sentence'] };
  const out = await jsonChat<{ sentence: string }>(
    'You rewrite wellness insights for a woman reading her private wellness app. Be warm, plain and brief (max 2 sentences). ' +
      'Keep every number exactly as given. Do not add numbers, advice, diagnoses or medical claims. Reply with JSON only.',
    `Rewrite: ${template}`,
    schema,
    120,
  );
  const s = out?.sentence?.trim();
  if (!s) return template;
  const want = numbersIn(template).sort().join(',');
  const got = numbersIn(s).sort().join(',');
  return want === got ? s : template;
}

/** Drafts the doctor-summary overview paragraph from code-computed facts. */
export async function draftOverview(facts: string[], template: string): Promise<string> {
  const schema = { type: 'object', properties: { overview: { type: 'string' } }, required: ['overview'] };
  const out = await jsonChat<{ overview: string }>(
    'You draft a short, neutral overview paragraph (3 sentences max) for a patient to hand to her doctor. ' +
      'Use only the facts given; keep every number exactly as given and add none. Never diagnose. ' +
      'If something looks notable, say it is "worth asking your doctor about". Reply with JSON only.',
    `Facts:\n- ${facts.join('\n- ')}`,
    schema,
    220,
  );
  const s = out?.overview?.trim();
  if (!s) return template;
  const allowed = new Set(facts.flatMap(numbersIn));
  return numbersIn(s).every((n) => allowed.has(n)) && !/diagnos(is|ed)\b/i.test(s) ? s : template;
}
