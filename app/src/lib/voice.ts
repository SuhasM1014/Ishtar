// Voice for the MVP uses the browser's built-in speech synthesis, which runs on the device.
// The scripts below are the guided content (check-in prompts, breathing, grounding, wind-down)
// in English, Hindi and Kannada. They can later be swapped for pre-recorded ElevenLabs audio.
import type { Lang, Slot } from '../types';

export const LANG_LABEL: Record<Lang, string> = { en: 'English', hi: 'हिन्दी (Hindi)', kn: 'ಕನ್ನಡ (Kannada)' };
const BCP47: Record<Lang, string[]> = { en: ['en-IN', 'en-GB', 'en-US', 'en'], hi: ['hi-IN', 'hi'], kn: ['kn-IN', 'kn'] };

export const PROMPTS: Record<Slot, Record<Lang, string>> = {
  morning: {
    en: 'Good morning. How did you sleep, and how is your energy today?',
    hi: 'सुप्रभात। आप कैसी सोईं, और आज आपकी ऊर्जा कैसी है?',
    kn: 'ಶುಭೋದಯ. ನೀವು ಹೇಗೆ ನಿದ್ರಿಸಿದಿರಿ, ಇಂದು ನಿಮ್ಮ ಶಕ್ತಿ ಹೇಗಿದೆ?',
  },
  afternoon: {
    en: 'Quick check-in. How stressed are you feeling, and how is your focus?',
    hi: 'एक छोटा सा चेक-इन। आप कितना तनाव महसूस कर रही हैं, और आपका ध्यान कैसा है?',
    kn: 'ಒಂದು ಸಣ್ಣ ಚೆಕ್-ಇನ್. ನಿಮಗೆ ಎಷ್ಟು ಒತ್ತಡ ಅನಿಸುತ್ತಿದೆ, ಮತ್ತು ನಿಮ್ಮ ಗಮನ ಹೇಗಿದೆ?',
  },
  night: {
    en: 'Good evening. How was your day overall? Add one line about it if you like.',
    hi: 'शुभ संध्या। आपका दिन कुल मिलाकर कैसा रहा? चाहें तो एक पंक्ति लिखें।',
    kn: 'ಶುಭ ಸಂಜೆ. ಇಂದಿನ ದಿನ ಒಟ್ಟಾರೆ ಹೇಗಿತ್ತು? ಬೇಕಾದರೆ ಒಂದು ಸಾಲು ಬರೆಯಿರಿ.',
  },
};

export const BREATH: Record<Lang, { in: string; hold: string; out: string; done: string }> = {
  en: { in: 'Breathe in', hold: 'Hold', out: 'Breathe out', done: 'Well done. Notice how you feel now.' },
  hi: { in: 'साँस अंदर लें', hold: 'रोकें', out: 'साँस बाहर छोड़ें', done: 'बहुत अच्छा। अब ध्यान दीजिए कि आप कैसा महसूस कर रही हैं।' },
  kn: { in: 'ಉಸಿರು ಒಳಗೆ ಎಳೆಯಿರಿ', hold: 'ಹಿಡಿದುಕೊಳ್ಳಿ', out: 'ಉಸಿರು ಹೊರಗೆ ಬಿಡಿ', done: 'ತುಂಬಾ ಚೆನ್ನಾಗಿದೆ. ಈಗ ನಿಮಗೆ ಹೇಗೆ ಅನಿಸುತ್ತಿದೆ ಎಂದು ಗಮನಿಸಿ.' },
};

export const GROUNDING: Record<Lang, string[]> = {
  en: ['Name 5 things you can see.', 'Notice 4 things you can touch.', 'Listen for 3 things you can hear.', 'Find 2 things you can smell.', 'Notice 1 thing you can taste.'],
  hi: ['5 चीज़ें बताइए जो आप देख सकती हैं।', '4 चीज़ें महसूस कीजिए जिन्हें आप छू सकती हैं।', '3 आवाज़ें सुनिए।', '2 चीज़ें ढूँढिए जिनकी गंध आप ले सकती हैं।', '1 चीज़ जिसका स्वाद आप महसूस कर सकती हैं।'],
  kn: ['ನೀವು ನೋಡಬಹುದಾದ 5 ವಸ್ತುಗಳನ್ನು ಹೆಸರಿಸಿ.', 'ನೀವು ಮುಟ್ಟಬಹುದಾದ 4 ವಸ್ತುಗಳನ್ನು ಗಮನಿಸಿ.', 'ನೀವು ಕೇಳಬಹುದಾದ 3 ಶಬ್ದಗಳನ್ನು ಆಲಿಸಿ.', 'ನೀವು ವಾಸನೆ ಗ್ರಹಿಸಬಹುದಾದ 2 ವಸ್ತುಗಳನ್ನು ಹುಡುಕಿ.', 'ನೀವು ರುಚಿ ಅನುಭವಿಸಬಹುದಾದ 1 ವಿಷಯವನ್ನು ಗಮನಿಸಿ.'],
};

export const WIND_DOWN: Record<Lang, string> = {
  en: "Let's slow down. Drop your shoulders. Unclench your jaw. Take a slow breath in, and a long breath out. Whatever today was, it is done. You did enough. Rest now.",
  hi: 'चलिए धीमे हो जाएँ। कंधे ढीले छोड़ें। जबड़ा ढीला करें। धीरे से साँस अंदर लें, और लंबी साँस बाहर छोड़ें। आज जैसा भी था, बीत गया। आपने काफ़ी किया। अब आराम करें।',
  kn: 'ನಿಧಾನವಾಗೋಣ. ಭುಜಗಳನ್ನು ಸಡಿಲಗೊಳಿಸಿ. ದವಡೆಯನ್ನು ಸಡಿಲಿಸಿ. ನಿಧಾನವಾಗಿ ಉಸಿರು ಒಳಗೆ ಎಳೆಯಿರಿ, ಮತ್ತು ದೀರ್ಘವಾಗಿ ಹೊರಗೆ ಬಿಡಿ. ಇಂದು ಹೇಗೇ ಇರಲಿ, ಅದು ಮುಗಿಯಿತು. ನೀವು ಸಾಕಷ್ಟು ಮಾಡಿದ್ದೀರಿ. ಈಗ ವಿಶ್ರಾಂತಿ ಪಡೆಯಿರಿ.',
};

export const speechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

function voices(): SpeechSynthesisVoice[] {
  return speechSupported() ? window.speechSynthesis.getVoices() : [];
}

export function pickVoice(lang: Lang): SpeechSynthesisVoice | undefined {
  const vs = voices();
  for (const tag of BCP47[lang]) {
    const v = vs.find((x) => x.lang.toLowerCase().startsWith(tag.toLowerCase()));
    if (v) return v;
  }
  return undefined;
}

export function hasVoice(lang: Lang) {
  return !!pickVoice(lang);
}

export function speak(text: string, lang: Lang, rate = 0.92): Promise<void> {
  return new Promise((resolve) => {
    if (!speechSupported()) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(lang);
    if (v) u.voice = v;
    u.lang = v?.lang ?? BCP47[lang][0];
    u.rate = rate;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel();
}

// Voices load asynchronously in some browsers.
if (speechSupported()) window.speechSynthesis.onvoiceschanged = () => void 0;
