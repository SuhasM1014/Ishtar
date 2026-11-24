# 3. Features

## Mental health journal (core feature)

Journal users get 3 check-ins a day:

| Slot | What it asks about |
|---|---|
| Morning | Sleep, energy, outlook |
| Afternoon | Stress, focus |
| Night | Overall mood plus a one-line reflection |

- Each check-in takes under 15 seconds: a mood scale plus tap chips, with optional text.
- Times and frequency are adjustable.
- No streak-shaming.

## Period tracker

- Cycles and flow
- Predictions from the user's own history, not a generic 28 days

## Symptom tracker

- Pain, sleep, energy, skin, digestion

## Perimenopause tracker

- Hot flashes, night sweats, irregular cycles, mood shifts
- Uses trend tracking rather than date prediction, because cycles become irregular

## Connected insights

- Every module works alone by default; you choose which modules can compare notes, and Ishtar reveals patterns.
- Example: "low-mood check-ins cluster 3 days before your period".

## Doctor visit summary

One tap creates a one-page summary containing:

- Cycle stats
- Top symptoms and when they occur
- Mood trends
- Notable changes
- Logged medications
- Suggested questions to ask

The user reviews and edits it, then exports it as a PDF. Nothing is shared automatically. It never diagnoses; it says "worth asking your doctor about".

## Voice (ElevenLabs)

### Pre-recorded guided voice content

ElevenLabs is used at build time to generate audio that ships inside the app, so no user data is sent at runtime. Available in English, Hindi and Kannada.

- Voice prompts for the 3 daily check-ins (morning, afternoon, night)
- Guided breathing and grounding exercises shown after low-mood check-ins
- Calming wind-down audio for the night check-in

### Read insights aloud (optional)

The user can turn on ElevenLabs text-to-speech to hear insights like "your low-mood days cluster before your period". Only the insight sentence is sent, never journal text, symptoms or audio.

### Accessibility mode

Voice read-out for women with low vision or who find reading English difficult, combined with the Hindi and Kannada audio.

---

Previous: [← Solution](02-solution.md) · Next: [Architecture →](04-architecture.md) · [Back to README](../README.md)
