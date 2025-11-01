// types/compatibility.ts
export interface Player {
  name: string;
  socketId: string;
  isHost: boolean;
}

export interface Room {
  roomId: string;
  players: Player[];
  status: 'waiting' | 'playing' | 'finished';
  gameType: string;
  gameStarted: boolean;
  currentQuestion?: number;
  playerProgress?: Record<string, number>;
  submissionStatus?: Record<string, boolean>;
  questions?: Question[];
  advancedQuestions?: AdvancedQuestions;
}

export interface Question {
  id: number;
  text: string;
  type: 'scale';
  options: string[];
}

export interface AdvancedQuestions {
  personalityTraits: AdvancedQuestion;
  lifestyle: LifestyleQuestions;
  communication: CommunicationQuestions;
  interests: InterestsQuestions;
  values: ValuesQuestions;
}

export interface AdvancedQuestion {
  question: string;
  type: 'multi-select';
  options: string[];
}

export interface LifestyleQuestions {
  sleepSchedule: AdvancedQuestion;
  socialActivity: AdvancedQuestion;
}

export interface CommunicationQuestions {
  style: AdvancedQuestion;
  conflictResolution: AdvancedQuestion;
}

export interface InterestsQuestions {
  hobbies: AdvancedQuestion;
}

export interface ValuesQuestions {
  family: AdvancedQuestion;
  career: AdvancedQuestion;
}

export interface CompatibilityResults {
  score: number;
  breakdown: {
    values: number;
    personality: number;
    lifestyle: number;
    communication: number;
    interests: number;
  };
  insights: string[];
  advancedFactors: Record<string, any>;
  playerAnswers: Record<string, any>;
  matchLevel: string;
  recommendations: string[];
}

export interface GameState {
  status: 'waiting' | 'playing' | 'advanced' | 'waiting-others' | 'results' | 'screenshot';
  currentQuestion: number;
  answers: number[];
  advancedAnswers: Record<string, any>;
  playerProgress: Record<string, number>;
  submissionStatus: Record<string, boolean>;
  waitingFor: string[];
  results?: CompatibilityResults;
}