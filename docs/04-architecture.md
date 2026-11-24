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
        OUT["Output<br/>insights, charts, doctor PDF"]

        IN --> IE
        IN --> LLM
        IE --> ST
        LLM --> ST
        ST --> OUT
    end

    OUT -. "user taps Share" .-> PDF["Doctor PDF<br/>shared by the user"]
    OUT -. "user taps Listen<br/>insight text only" .-> EL["ElevenLabs TTS<br/>(optional)"]
```

## What can leave the device

Only two things, and only when the user taps:

| What | When | What is sent |
|---|---|---|
| Doctor PDF | The user chooses to share it | The PDF the user reviewed and edited |
| ElevenLabs voice (optional) | The user asks for insights to be read aloud | Insight text only, never journal text or audio |

## Key rule: the LLM never calculates numbers

| Component | Responsibility |
|---|---|
| **Code** (insight engine) | Computes all stats and correlations |
| **LLM** | Tags journal entries, words insights, drafts the doctor summary |

The LLM uses JSON-schema output, with template fallbacks.

---

Previous: [← Features](03-features.md) · Next: [Tech stack →](05-tech-stack.md) · [Back to README](../README.md)
