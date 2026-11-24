# 2. Solution

Ishtar is a feminine physical and mental wellness app. Its four modules can each be used independently.

## Modules

| # | Module | What it does |
|---|---|---|
| 1 | **Mental health journal** (core) | 3 check-ins a day, each under 15 seconds. |
| 2 | **Period tracker** | Cycles, flow, and predictions from the user's own history (not a generic 28 days). |
| 3 | **Symptom tracker** | Pain, sleep, energy, skin, digestion. |
| 4 | **Perimenopause tracker** | Hot flashes, night sweats, irregular cycles, mood shifts. Uses trend tracking rather than date prediction, because cycles become irregular. |

## Connected insights (opt-in)

Every module works alone by default. The user chooses which modules may "compare notes". Only then does Ishtar look for patterns across them.

> Example: "low-mood check-ins cluster 3 days before your period"

## Doctor visit summary

One tap creates a one-page summary. The user reviews and edits it, then exports it as a PDF. Nothing is shared automatically. It never diagnoses; it says "worth asking your doctor about".

## User flow

```mermaid
flowchart LR
    A[Pick your modules] --> B[Log and check in]
    B --> C[Opt in to compare notes]
    C --> D[See your patterns]
    D --> E[Share a doctor summary]
```

---

Previous: [← Problem](01-problem.md) · Next: [Features →](03-features.md) · [Back to README](../README.md)
