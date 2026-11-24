// Voice journaling stays fully on-device: Whisper via Transformers.js. No cloud speech-to-text.
import type { Lang } from '../types';

type ASR = (audio: Float32Array, opts: object) => Promise<{ text: string }>;
let asr: ASR | null = null;
let loading: Promise<void> | null = null;

export function loadWhisper(onProgress?: (pct: number) => void): Promise<void> {
  if (asr) return Promise.resolve();
  if (!loading) {
    loading = (async () => {
      const { pipeline } = await import('@huggingface/transformers');
      const p = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
        dtype: 'q8',
        progress_callback: (e: { status: string; progress?: number }) => {
          if (e.status === 'progress' && e.progress !== undefined) onProgress?.(e.progress);
        },
      });
      asr = p as unknown as ASR;
    })().catch((e) => {
      loading = null;
      throw e;
    });
  }
  return loading;
}

const WHISPER_LANG: Record<Lang, string> = { en: 'english', hi: 'hindi', kn: 'kannada' };

export async function transcribe(blob: Blob, lang: Lang): Promise<string> {
  if (!asr) throw new Error('Whisper not loaded');
  const ctx = new AudioContext({ sampleRate: 16000 });
  const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
  const data = buf.getChannelData(0);
  await ctx.close();
  const out = await asr(data, { language: WHISPER_LANG[lang], task: 'transcribe', chunk_length_s: 30 });
  return out.text.trim();
}

export class Recorder {
  private rec?: MediaRecorder;
  private chunks: Blob[] = [];
  private stream?: MediaStream;
  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.chunks = [];
    this.rec = new MediaRecorder(this.stream);
    this.rec.ondataavailable = (e) => this.chunks.push(e.data);
    this.rec.start();
  }
  stop(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.rec) return resolve(new Blob());
      this.rec.onstop = () => {
        this.stream?.getTracks().forEach((t) => t.stop());
        resolve(new Blob(this.chunks, { type: this.rec?.mimeType || 'audio/webm' }));
      };
      this.rec.stop();
    });
  }
}
