import { Difficulty, FontStyle, UserSettings } from './types';

export const DIFFICULTIES: Difficulty[] = [
  'Elementary',
  'Middle School',
  'High School',
  'Undergraduate',
  'Post-Graduate',
];

export const FONTS: { label: string; value: FontStyle; className: string }[] = [
  { label: 'Oswald', value: 'Oswald', className: 'font-[Oswald]' },
  { label: 'Arial', value: 'Arial', className: 'font-arial' },
  { label: 'Times New Roman', value: 'Times New Roman', className: 'font-times' },
  { label: 'Courier', value: 'Courier', className: 'font-[Courier_Prime]' },
  { label: 'Garamond', value: 'Garamond', className: 'font-[Garamond]' },
  { label: 'Comic Sans', value: 'Comic Sans', className: 'font-comic' },
  { label: 'Hachi Maru Pop', value: 'Hachi Maru Pop', className: 'font-[Hachi_Maru_Pop]' },
];

export const DEFAULT_SETTINGS: UserSettings = {
  difficulty: 'High School',
  font: 'Oswald',
  fontSize: 'medium',
};

export const MODEL_NAME = 'gemini-2.5-flash'; // Using 2.5 Flash as robust text model