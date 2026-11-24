# 7. Data model

All tables live in the encrypted on-device store (IndexedDB via Dexie + Web Crypto).

| Table | Fields |
|---|---|
| `cycles` | `start`, `end`, `flow` |
| `dailyLogs` | `date`, `symptoms[]`, `sleep`, `energy` |
| `checkIns` | `datetime`, `slot` (morning / afternoon / night), `mood`, `chips[]`, `note` |
| `journal` | `date`, `text`, `aiTags[]`, `private` |
| `perimenopause` | `date`, `hotFlashes`, `nightSweats`, `notes` |
| `meds` | `name`, `dose`, `startDate` |
| `consents` | `moduleA`, `moduleB`, `granted`, `date` |
| `insights` | `type`, `message`, `evidence`, `date` |

---

Previous: [← Privacy and safety](06-privacy-and-safety.md) · Next: [MVP and roadmap →](08-mvp-and-roadmap.md) · [Back to README](../README.md)
