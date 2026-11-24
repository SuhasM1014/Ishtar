# Ishtar MVP app

A working, installable PWA of the Ishtar MVP. Everything runs in the browser on the user's device. There is no backend server and no account.

## Run it

Requires Node.js 18+.

```bash
cd app
npm install
npm run dev
```

Open http://localhost:5173, create a 4-digit PIN, pick your modules, and choose **Explore with 3 months of sample data** for the demo.

Production build (static files in `dist/`, deployable to any static host):

```bash
npm run build
npm run preview
```

## What's in the MVP

| Feature | Where | Notes |
|---|---|---|
| PIN lock + encryption at rest | `src/lib/crypto.ts`, `src/lib/db.ts` | PBKDF2 → AES-GCM 256 (Web Crypto). Every row in IndexedDB (Dexie) is encrypted; only an id is visible. Auto-locks after 5 minutes in the background. |
| One-tap delete all data | Settings | Deletes the whole database, PIN included. |
| Module picker | Onboarding, Settings | Journal, period, symptoms, perimenopause. Each works alone. |
| 3× daily check-ins | Today | Mood scale + tap chips + optional note. Under 15 seconds. Times and slots adjustable. No streaks. |
| Journal | Track → Journal | Private toggle (excluded from the doctor summary). On-device tags. |
| Voice notes | Track → Journal | Whisper (Transformers.js) transcribes on the device. Audio is never uploaded or stored. |
| Period tracker | Track → Period | Predictions from the user's own last cycles (± window from their own variation), not a generic 28 days. |
| Symptom tracker | Track → Symptoms | Symptoms, sleep, energy. |
| Perimenopause tracker | Track → Perimenopause | Hot flashes, night sweats, notes; weekly trend chart instead of date prediction. |
| Compare notes | Insights | Every module works alone by default; the user chooses which pairs can compare notes. Stored in `consents`, can be switched off any time. |
| Insight engine | `src/lib/insights.ts` | Deterministic TypeScript stats: cycle stats, mood trend, low-mood clustering before the period, symptom timing by cycle phase, sleep vs mood, night sweats vs mood, hot flash trend. |
| On-device LLM | `src/lib/llm.ts` | WebLLM, Qwen 2.5 1.5B (q4f16). Tags journal entries, words insights, drafts the doctor-summary overview. JSON-schema output; any output that changes, drops or adds a number is rejected and the code template is used instead. |
| Charts | Insights | Cycle wheel, 13-week mood heatmap, weekly mood line, perimenopause bars (Recharts). |
| Doctor visit summary | Doctor | One page: cycle stats, top symptoms and when, mood trends, notable patterns, medications, questions to ask. Fully editable, exported with jsPDF. Shared only when the user taps Share. Never diagnoses. |
| Distress safety net | `src/lib/distress.ts` | Keyword list (always on) + small zero-shot classifier (with on-device AI). Shows Tele-MANAS 14416. |
| Voice | `src/lib/voice.ts` | Check-in prompts, guided breathing, 5-4-3-2-1 grounding (offered after low-mood check-ins), night wind-down and read-aloud of insights in English, Hindi and Kannada, using the browser's built-in speech. |
| Sample data | `src/lib/sampleData.ts` | 3 months of fictional data for two personas: a college student and a woman in perimenopause. |

## What leaves the device

Nothing the user logs. The only network requests are:

- the app itself, and
- a one-time download of model weights (WebLLM model, Whisper, the distress classifier) when the user turns those features on. Weights are cached by the browser afterwards; no user data is sent with these requests.

The doctor PDF leaves the device only if the user taps **Share**.

## Known limitations

- **Voice uses the browser's built-in speech**, not ElevenLabs yet. Hindi and Kannada quality depends on the voices installed on the device.
- **On-device LLM needs WebGPU** (recent Chrome or Edge on desktop, or Chrome on recent Android). Without it, Ishtar falls back to its templates and keyword tagger; everything else works.
- The model download is about 1 GB, so turn it on over Wi-Fi before a demo.
- The app interface is in English; Hindi and Kannada cover the voice content.
- Not a medical device. Never diagnoses.
