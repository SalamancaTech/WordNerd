export type Difficulty = 'Elementary' | 'Middle School' | 'High School' | 'Undergraduate' | 'Post-Graduate';

export type FontStyle = 'Oswald' | 'Arial' | 'Times New Roman' | 'Courier' | 'Garamond' | 'Comic Sans' | 'Hachi Maru Pop';

export interface WordData {
  word: string;
  definition: string;
  example: string;
  pronunciation?: string;
  partOfSpeech?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  wordContext: WordData;
}

export interface UserSettings {
  difficulty: Difficulty;
  font: FontStyle;
  fontSize: 'small' | 'medium' | 'large';
}

export interface UserProgress {
  succeeded: WordData[];
  failed: WordData[];
  favorites: WordData[];
  toLearn: WordData[];
}

export enum GameMode {
  None = 'None',
  WordOfDay = 'WordOfDay',
  DefinitionMatch = 'DefinitionMatch',
  ContextClues = 'ContextClues',
}

export interface GameState {
  currentMode: GameMode;
  isLoading: boolean;
  quizData: QuizQuestion | null;
  score: number;
  streak: number;
  isGameOver: boolean;
  sessionFailedWords: WordData[];
}