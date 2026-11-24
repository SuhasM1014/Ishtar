// Data model: matches docs/07-data-model.md
export type Slot = 'morning' | 'afternoon' | 'night';
export type ModuleId = 'journal' | 'period' | 'symptoms' | 'peri';
export type Lang = 'en' | 'hi' | 'kn';

export interface Cycle { id?: number; start: string; end?: string; flow: 'light' | 'medium' | 'heavy' }
export interface DailyLog { id?: number; date: string; symptoms: string[]; sleep: number; energy: number }
export interface CheckIn { id?: number; datetime: string; slot: Slot; mood: number; chips: string[]; note: string }
export interface JournalEntry { id?: number; date: string; text: string; aiTags: string[]; private: boolean }
export interface PeriLog { id?: number; date: string; hotFlashes: number; nightSweats: number; notes: string }
export interface Med { id?: number; name: string; dose: string; startDate: string }
export interface Consent { id?: number; moduleA: ModuleId; moduleB: ModuleId; granted: boolean; date: string }
export interface InsightRow { id?: number; type: string; message: string; evidence: string; date: string }

export interface Tables {
  cycles: Cycle[];
  dailyLogs: DailyLog[];
  checkIns: CheckIn[];
  journal: JournalEntry[];
  perimenopause: PeriLog[];
  meds: Med[];
  consents: Consent[];
  insights: InsightRow[];
}
export type TableName = keyof Tables;
export const TABLES: TableName[] = ['cycles', 'dailyLogs', 'checkIns', 'journal', 'perimenopause', 'meds', 'consents', 'insights'];

export interface Settings {
  onboarded: boolean;
  modules: Record<ModuleId, boolean>;
  slots: Record<Slot, { on: boolean; time: string }>;
  lang: Lang;
  voicePrompts: boolean;
  aiEnabled: boolean;
  name: string;
}

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  modules: { journal: true, period: true, symptoms: true, peri: false },
  slots: {
    morning: { on: true, time: '08:00' },
    afternoon: { on: true, time: '14:00' },
    night: { on: true, time: '21:30' },
  },
  lang: 'en',
  voicePrompts: true,
  aiEnabled: false,
  name: '',
};

export const MODULE_LABELS: Record<ModuleId, string> = {
  journal: 'Mental health journal',
  period: 'Period tracker',
  symptoms: 'Symptom tracker',
  peri: 'Perimenopause tracker',
};

export const MODULE_SHORT: Record<ModuleId, string> = {
  journal: 'Journal',
  period: 'Period',
  symptoms: 'Symptoms',
  peri: 'Perimenopause',
};
