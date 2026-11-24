# 5. Tech stack

| Layer | Tool | Why |
|---|---|---|
| Frontend | React + Vite (PWA) | Installs on any phone, no app store |
| Storage | IndexedDB (Dexie) + Web Crypto | Encrypted, PIN-locked, one-tap delete |
| On-device LLM | WebLLM with Qwen 2.5 1.5B (quantised) | Runs in the browser via WebGPU, works offline |
| Light ML | Transformers.js | Distress classifier, Whisper voice-note transcription |
| Insight engine | TypeScript | Deterministic stats and correlations |
| Charts / export | Recharts, jsPDF | Cycle wheel, mood heatmap, doctor PDF |
| Voice | ElevenLabs | Pre-recorded check-in and breathing audio (EN/HI/KN); optional read-aloud of insights, text only |

---

Previous: [← Architecture](04-architecture.md) · Next: [Privacy and safety →](06-privacy-and-safety.md) · [Back to README](../README.md)
