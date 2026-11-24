# 4. Architecture

Everything runs on the user's device, in the browser, as an installable PWA. **There is no backend server.**

## Overview

```mermaid
flowchart LR
    subgraph Device["Device boundary"]
        direction LR
        IN["Input<br/>check-ins, journal, voice"]
        IE["Insight engine<br/>TypeScript, all numbers computed in code"]
        LLM["On-device LLM<br/>WebLLM + Transformers.js"]
        ST[("Encrypted store<br/>IndexedDB via Dexie + Web Crypto<br/>PIN-locked")]
        AU["Pre-recorded audio<br/>(bundled, made with ElevenLabs)"]
        OUT["Output<br/>insights, charts, doctor PDF"]

        IN --> IE
        IN --> LLM
        IE --> ST
        LLM --> ST
        ST --> OUT
        AU --> OUT
    end

    OUT -. "user taps Share" .-> PDF["Doctor PDF<br/>shared by the user"]
    OUT -. "optional read-aloud (text only)" .-> EL["ElevenLabs TTS"]
```

## What can leave the device

Only two things, and only when the user taps:

| What | What is sent |
|---|---|
| Sharing the doctor PDF | The PDF the user reviewed and edited |
| Optional ElevenLabs read-aloud | Insight text only |

Guided audio is pre-recorded and ships with the app, so playing it sends nothing.

## Voice rules

- ElevenLabs never receives journal entries, check-in answers or the user's voice.
- Voice journaling stays fully on-device (Whisper via Transformers.js). We deliberately don't use cloud speech-to-text.

## Key rule: the LLM never calculates numbers

| Component | Responsibility |
|---|---|
| **Code** (insight engine) | Computes all stats and correlations |
| **LLM** | Tags journal entries, words insights, drafts the doctor summary |

The LLM uses JSON-schema output, with template fallbacks.

---

Previous: [← Features](03-features.md) · Next: [Tech stack →](05-tech-stack.md) · [Back to README](../README.md)
