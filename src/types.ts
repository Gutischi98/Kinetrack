export interface Measurement {
  id: string;
  type?: 'measurement';
  date: string;
  patientName: string;
  diagnosis?: string;
  observations?: string;
  painActivity: number;
  painRest: number;
  elbowFlexion: number | null;
  shoulderFlexion: number | null;
  abduction: number | null;
  pronation?: number | null;
  supination?: number | null;
  wristFlexion?: number | null;
  wristExtension?: number | null;
  reachCephalic: string;
  reachCaudal: string;
  nextSession?: string;
  nextSessionTime?: string;
  isDischarged?: boolean;
}

export interface QuestionnaireResult {
  id: string;
  type: 'questionnaire';
  questionnaireName: 'WORC' | 'PRWE' | 'PSQI';
  date: string;
  patientName: string;
  score: number;
}

export type HistoryItem = Measurement | QuestionnaireResult;

export type TimerState = 'idle' | 'countdown' | 'running' | 'paused' | 'flash' | 'completed';
export type TimerPhase = 'work' | 'rest';

export interface AppNotification {
  id: string;
  patientName: string;
  time: string;
  date: string;
  read: boolean;
  timestamp: number;
}


export interface TimerConfig {
  workTime: number;
  restTime: number;
  cycles: number;
  useFlash: boolean;
  workIncrement: number;
}
