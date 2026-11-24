// Journal tag vocabulary + keyword fallback used when the on-device LLM is not loaded.
export const TAGS = [
  'stress', 'anxiety', 'sleep', 'study', 'work', 'family', 'relationships', 'friends',
  'health', 'pain', 'energy', 'gratitude', 'self-care', 'exercise', 'food', 'loneliness', 'body image', 'achievement',
] as const;

const KEYWORDS: Record<string, string[]> = {
  stress: ['stress', 'pressure', 'overwhelm', 'deadline', 'too much', 'tense'],
  anxiety: ['anxious', 'anxiety', 'worried', 'worry', 'nervous', 'panic', 'overthink'],
  sleep: ['sleep', 'slept', 'insomnia', 'tired', 'nap', 'awake', 'night sweat'],
  study: ['exam', 'study', 'class', 'assignment', 'lecture', 'college', 'project', 'lab'],
  work: ['work', 'office', 'meeting', 'boss', 'job', 'shift', 'manager'],
  family: ['mom', 'mother', 'dad', 'father', 'family', 'sister', 'brother', 'husband', 'kids', 'son', 'daughter', 'amma', 'appa'],
  relationships: ['partner', 'boyfriend', 'girlfriend', 'relationship', 'breakup', 'date'],
  friends: ['friend', 'roommate', 'hostel', 'hangout'],
  health: ['doctor', 'sick', 'fever', 'medicine', 'health', 'hot flash', 'period', 'cramps'],
  pain: ['pain', 'cramp', 'headache', 'ache', 'migraine', 'sore'],
  energy: ['energy', 'energetic', 'exhausted', 'drained', 'sluggish', 'fatigue'],
  gratitude: ['grateful', 'thankful', 'blessed', 'appreciate', 'glad'],
  'self-care': ['bath', 'skincare', 'rest', 'me time', 'meditat', 'journal', 'music', 'read'],
  exercise: ['walk', 'run', 'gym', 'yoga', 'exercise', 'workout', 'dance'],
  food: ['ate', 'food', 'craving', 'chocolate', 'dinner', 'lunch', 'breakfast', 'chai'],
  loneliness: ['lonely', 'alone', 'isolated', 'nobody', 'left out', 'miss home'],
  'body image': ['bloated', 'weight', 'skin', 'acne', 'breakout', 'my body'],
  achievement: ['finished', 'submitted', 'proud', 'did it', 'passed', 'won', 'completed'],
};

export function keywordTags(text: string): string[] {
  const t = text.toLowerCase();
  return Object.entries(KEYWORDS)
    .filter(([, words]) => words.some((w) => t.includes(w)))
    .map(([tag]) => tag)
    .slice(0, 4);
}
